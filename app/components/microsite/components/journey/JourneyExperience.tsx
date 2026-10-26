"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
    AnimatePresence,
    animate,
    motion,
    motionValue,
    useMotionValue,
    useReducedMotion,
    type AnimationPlaybackControls,
    type BezierDefinition,
    type MotionValue,
} from "framer-motion";
import { useDerived } from "./useDerived";
import JourneyCard, { CARD_WIDTH, IMAGE_OVERLAP, MORE_WIDTH, cardVariants } from "./JourneyCard";
import JourneyRoutes, { type CameraValues } from "./JourneyRoutes";
import { JourneyTimelineDesktop, JourneyTimelineMobile } from "./JourneyTimeline";
import UnderlineLink from "../home/UnderlineLink";
import { micrositeNavigation } from "../../data/navigation";
import {
    MAP,
    MAP_DETAIL,
    MAP_IMAGE,
    baseScale,
    attachEnds,
    clusterLayout,
    clusterSpread,
    flightPath,
    smoothTrack,
    toTransform,
    type Point,
    type Size,
    type View,
} from "./camera";
import {
    JOURNEY_ASSETS,
    journeyPlaces,
    journeyRoutes,
    journeyStops,
    type JourneyPlaceId,
    type JourneyRouteId,
} from "../../data/journey";

/** From a dot's centre to its card's top-left corner, as in the design (dot at 712.5, card at 736 × 332). */
const CARD_OFFSET = { x: 23.5, y: -13.5 };

/** Below this width the page uses its phone layout; the same breakpoint as the rest of the site. */
const DESKTOP_MIN = 992;

/**
 * A soft ease in and out (CSS's own ease-in-out) for every camera move: it
 * gathers speed gently and settles gently, rather than lurching from rest.
 */
const EASE_FLIGHT: BezierDefinition = [0.42, 0, 0.58, 1];

const routeIds = Object.keys(journeyRoutes) as JourneyRouteId[];
const placeIds = Object.keys(journeyPlaces) as JourneyPlaceId[];

/** Where "visit the exhibition" goes. In a preview without that page it is shown but stays put. */
const exhibitionHref = micrositeNavigation.find((item) => item.label === "exhibition")?.href ?? "";

type MapDotData = {
    key: string;
    place: JourneyPlaceId;
    x: number;
    y: number;
    /**
     * For one anecdote of many: where it sits around its place, in map units. The
     * layout is drawn in screen px for the zoom the place is read at, so the dots
     * stand apart there and gather into one as the map zooms out.
     */
    offset?: Point;
    /** The stop this dot opens. */
    stop: number;
    label: string;
    /** Diameter in px: the place's own size, or, for one anecdote of many, its size gathered up. */
    size: number;
    /** Index of the stop that first shows this dot, for the Bali villages. */
    revealedAt?: number;
};

/** Dot diameters, as Statskog varies its own, and the size anecdote dots settle at once spread. */
const DOT_SIZE = { large: 16, medium: 11, small: 8 } as const;
const ANECDOTE_SIZE = 10;

/** Anecdotes per place: the stops of each coloured circle in the design, in date order. */
const clusterMembers = placeIds.reduce<Partial<Record<JourneyPlaceId, number[]>>>((groups, id) => {
    const members = journeyStops.flatMap((stop, index) => (stop.cluster === id ? [index] : []));
    return members.length ? { ...groups, [id]: members } : groups;
}, {});

/** Pixels per map unit at zoom 1 on the 1440px screen the layouts are drawn for. */
const LAYOUT_SCALE = 0.872;

/** The zoom a many-anecdote place is read at: its closest stop. */
const clusterZoom = (place: JourneyPlaceId) =>
    Math.max(...(clusterMembers[place] ?? []).map((index) => journeyStops[index].zoom));

/** The first stop a place belongs to, so a single dot can open it. */
const firstStopAt = (place: JourneyPlaceId) =>
    journeyStops.findIndex(
        (stop) => stop.marker === place || stop.also?.includes(place) || stop.series?.includes(place)
    );

const mapDots = placeIds.flatMap<MapDotData>((id) => {
    const place = journeyPlaces[id];
    const members = clusterMembers[id];

    if (members) {
        const layout = clusterLayout(members.length);
        const perUnit = LAYOUT_SCALE * clusterZoom(id);
        return members.map((stop, index) => ({
            key: `${id}-${stop}`,
            place: id,
            x: place.x,
            y: place.y,
            offset: { x: layout[index].x / perUnit, y: layout[index].y / perUnit },
            stop,
            label: `${place.name}, ${journeyStops[stop].date}`,
            size: DOT_SIZE[place.size],
        }));
    }

    return [
        {
            key: id,
            place: id,
            x: place.x,
            y: place.y,
            stop: firstStopAt(id),
            label: place.name,
            size: DOT_SIZE[place.size],
            revealedAt: place.revealedBy ? journeyStops.findIndex((stop) => stop.id === place.revealedBy) : undefined,
        },
    ];
});

const dotByKey = new Map(mapDots.map((dot) => [dot.key, dot]));

/**
 * The dot that stands for a place at a given stop. A place with several anecdotes
 * has one dot per date: the stop's own if it is one of them, else the date it leads
 * to, or failing that the last one before it (Batavia > Singapore rings 27 – 29
 * September).
 */
const dotKeyFor = (place: JourneyPlaceId, index: number) => {
    const members = clusterMembers[place];
    if (!members) {
        return place;
    }
    if (members.includes(index)) {
        return `${place}-${index}`;
    }
    const next = members.find((member) => member > index) ?? [...members].reverse().find((member) => member < index);
    return `${place}-${next}`;
};

/** The dot a leg sets out from: for a place with several dates, the last one before it leaves. */
const departureKeyFor = (place: JourneyPlaceId, index: number) => {
    const members = clusterMembers[place];
    if (!members) {
        return place;
    }
    return `${place}-${[...members].reverse().find((member) => member <= index) ?? members[0]}`;
};

const dotPosition = (key: string): Point | undefined => {
    const dot = dotByKey.get(key);
    return dot && { x: dot.x + (dot.offset?.x ?? 0), y: dot.y + (dot.offset?.y ?? 0) };
};

/**
 * Every leg's path with its ends drawn exactly onto the dots it joins: the dot of
 * the date it leaves from and of the date it arrives at.
 */
const routePaths = Object.fromEntries(
    routeIds.map((id) => {
        const { d, from, to } = journeyRoutes[id];
        const index = journeyStops.findIndex((stop) => stop.routes?.includes(id));
        return [
            id,
            attachEnds(d, from && dotPosition(departureKeyFor(from, index)), to && dotPosition(dotKeyFor(to, index))),
        ];
    })
) as Record<JourneyRouteId, string>;

/** The dots a stop rings with the dashed circle: its own, and the other places it names. */
const ringedKeys = (index: number) => {
    const stop = journeyStops[index];
    return [stop.marker, ...(stop.also ?? [])].map((place) => dotKeyFor(place, index));
};

/**
 * Where the camera looks for a stop: its place. For a place with several dates
 * that is the middle of its dots, not the date's own dot, so moving from one date
 * to the next there leaves the map still; only the ring and the card move.
 */
const focusOf = (index: number): Point => {
    const place = journeyPlaces[journeyStops[index].marker];
    return { x: place.x, y: place.y };
};

const routeStopIndex = (route: JourneyRouteId) => journeyStops.findIndex((stop) => stop.routes?.includes(route));

/** Where on screen the stop's dot should sit so its card, photograph included, fits beside it. */
const anchorFor = (index: number, viewport: Size, desktop: boolean): Point => {
    if (!desktop) {
        // Between the strip of dates (its foot 182px down) and the top of the card,
        // which stands about 335px clear of the bottom, above the call to action.
        return { x: viewport.width / 2, y: Math.max(200, (182 + viewport.height - 335) / 2) };
    }
    const stop = journeyStops[index];
    // The card hangs from the date's own dot, which can sit a little east of the place.
    const nudge = Math.max((dotByKey.get(dotKeyFor(stop.marker, index))?.offset?.x ?? 0) * baseScale(viewport) * stop.zoom, 0);
    const reach = nudge + CARD_OFFSET.x + CARD_WIDTH[stop.size] + (stop.image ? stop.image.width - IMAGE_OVERLAP.x : 0);

    return {
        x: Math.min(viewport.width * 0.4948, viewport.width - 24 - reach),
        y: Math.max(-CARD_OFFSET.y + IMAGE_OVERLAP.y + 24, viewport.height * 0.31),
    };
};

const lerpPoint = (from: Point, to: Point, t: number): Point => ({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
});

type MapDotProps = {
    dot: MapDotData;
    camera: CameraValues;
    ringed: boolean;
    revealed: boolean;
    onSelect: (index: number) => void;
};

/**
 * One place, or one anecdote of a place: a white dot with a soft glow that opens
 * its stop and is named on hover. The dots of the current stop carry the design's
 * dashed gold ring.
 */
const MapDot = memo(({ dot, camera, ringed, revealed, onSelect }: MapDotProps) => {
    const x = useDerived([camera.x, camera.k], ([cx, k]) => (dot.x + (dot.offset?.x ?? 0)) * k + cx);
    const y = useDerived([camera.y, camera.k], ([cy, k]) => (dot.y + (dot.offset?.y ?? 0)) * k + cy);
    // Anecdote dots sit on top of one another at their place's size in the overview,
    // and settle a little smaller as they spread out around it.
    const scale = useDerived([camera.spread], ([s]) => (dot.offset ? 1 + (ANECDOTE_SIZE / dot.size - 1) * s : 1));
    const hit = Math.max(18, dot.size + 8);

    return (
        <motion.button
            type="button"
            onClick={() => onSelect(dot.stop)}
            aria-label={dot.label}
            aria-hidden={revealed ? undefined : true}
            tabIndex={revealed ? undefined : -1}
            initial={false}
            animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.2 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ x, y, width: hit, height: hit, marginLeft: -hit / 2, marginTop: -hit / 2 }}
            className={`group absolute left-0 top-0 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                revealed ? "pointer-events-auto" : "pointer-events-none"
            }`}
        >
            <motion.span className="block" style={{ scale, width: dot.size, height: dot.size }}>
                <span className="block h-full w-full rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.45)] transition-transform duration-300 group-hover:scale-125" />
            </motion.span>
            <AnimatePresence>
                {ringed && (
                    <motion.span
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 -ml-[13.5px] -mt-[13.5px] h-[27px] w-[27px]"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    >
                        <Image
                            src={`${JOURNEY_ASSETS}/marker-ring.png`}
                            alt=""
                            width={27}
                            height={27}
                            unoptimized
                            className="absolute inset-0 motion-safe:animate-spin-slow"
                        />
                    </motion.span>
                )}
            </AnimatePresence>
            <span className="pointer-events-none absolute bottom-full mb-[6px] whitespace-nowrap bg-white/95 px-2 py-[2px] text-[11px] uppercase leading-[18px] tracking-[1.32px] text-s2s-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                {dot.label}
            </span>
        </motion.button>
    );
});
MapDot.displayName = "MapDot";

type Timers = { cancelled: boolean; controls: AnimationPlaybackControls[] };

/**
 * "The Journey": the map of Tagore's 1927 voyage, told one date at a time.
 *
 * The page scrolls through a tall section while the map stays pinned, and each
 * stretch of scrolling is one date. Arriving at a date flies the map to its place,
 * draws the crossing if it was a voyage, gathers the dots of a place with many
 * anecdotes into a small cluster, and then opens the date's card beside its dot.
 * Scrolling past the last date carries on down to the footer as usual.
 */
const JourneyExperience = () => {
    const stops = journeyStops;
    const sectionRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const geometry = useRef<Partial<Record<JourneyRouteId, SVGPathElement | null>>>({});
    const reduceMotion = useReducedMotion();

    const [viewport, setViewport] = useState<Size | null>(null);
    const [active, setActive] = useState(0);
    const [arrived, setArrived] = useState(-1);
    const [moreOpen, setMoreOpen] = useState(false);
    const [seriesShown, setSeriesShown] = useState(0);
    const [hiRes, setHiRes] = useState({ full: false, detail: false });
    // Only while the camera moves: a layer kept on will-change is drawn once at the scale it
    // started at and then stretched, which blurs the map when it settles close in.
    const [moving, setMoving] = useState(false);

    const desktop = (viewport?.width ?? DESKTOP_MIN) >= DESKTOP_MIN;

    // The camera, as the map layer's translate and scale.
    const cameraX = useMotionValue(0);
    const cameraY = useMotionValue(0);
    const cameraK = useMotionValue(1);
    const base = useMotionValue(1);
    const spread = useDerived([cameraK, base], ([k, b]) => clusterSpread(k, b));
    const camera = useMemo<CameraValues>(
        () => ({ x: cameraX, y: cameraY, k: cameraK, spread }),
        [cameraX, cameraY, cameraK, spread]
    );

    const viewRef = useRef<View>({ focus: journeyPlaces[stops[0].marker], zoom: stops[0].zoom });
    const anchorRef = useRef<Point>({ x: 0, y: 0 });
    const viewportRef = useRef<Size>({ width: 1, height: 1 });
    const timers = useRef<Timers>({ cancelled: false, controls: [] });

    // How much of each leg is drawn, 0 to 1.
    const progress = useMemo(
        () => Object.fromEntries(routeIds.map((id) => [id, motionValue(0)])) as Record<JourneyRouteId, MotionValue<number>>,
        []
    );

    // The open card hangs the same distance from its dot on every stop, as in the
    // design: 23.5px right of the dot's centre, its top 13.5px above it. The dot is
    // its place, plus its spot around the place for an anecdote (both in map units).
    const cardPlaceX = useMotionValue(0);
    const cardPlaceY = useMotionValue(0);
    const cardOffsetX = useMotionValue(0);
    const cardOffsetY = useMotionValue(0);
    const cardX = useDerived([cameraX, cameraK, cardPlaceX, cardOffsetX], ([cx, k, px, ox]) => (px + ox) * k + cx + CARD_OFFSET.x);
    const cardY = useDerived([cameraY, cameraK, cardPlaceY, cardOffsetY], ([cy, k, py, oy]) => (py + oy) * k + cy + CARD_OFFSET.y);

    const applyView = useCallback(
        (view: View) => {
            viewRef.current = view;
            const transform = toTransform(view, viewportRef.current, anchorRef.current);
            cameraX.set(transform.x);
            cameraY.set(transform.y);
            cameraK.set(transform.k);
        },
        [cameraX, cameraY, cameraK]
    );

    // Measure the pinned stage; keep the current view framed when it resizes.
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage) {
            return;
        }
        const measure = () => {
            const size = { width: stage.clientWidth, height: stage.clientHeight };
            viewportRef.current = size;
            base.set(baseScale(size));
            setViewport(size);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [base]);

    // Which date the scroll position is on.
    const scrollState = useCallback(() => {
        const section = sectionRef.current;
        const stage = stageRef.current;
        if (!section || !stage) {
            return null;
        }
        const pinnedAt = parseFloat(getComputedStyle(stage).top) || 0;
        const rect = section.getBoundingClientRect();
        const step = (rect.height - stage.offsetHeight) / (stops.length - 1);
        return { travelled: pinnedAt - rect.top, step, sectionTop: window.scrollY + rect.top - pinnedAt };
    }, [stops.length]);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const state = scrollState();
            if (state) {
                setActive(Math.min(Math.max(Math.round(state.travelled / state.step), 0), stops.length - 1));
            }
        };
        const onScroll = () => {
            if (!frame) {
                frame = requestAnimationFrame(update);
            }
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            cancelAnimationFrame(frame);
        };
    }, [scrollState, stops.length]);

    // A link to a date (/microsite/the-journey#borobudur) opens the page already there.
    const jumped = useRef(false);
    useLayoutEffect(() => {
        const index = stops.findIndex((stop) => `#${stop.id}` === window.location.hash);
        const state = scrollState();
        if (index > 0 && state) {
            jumped.current = true;
            window.scrollTo({ top: state.sectionTop + index * state.step + 1, behavior: "auto" });
        }
    }, [scrollState, stops]);

    /** Jumps the page to a date; the map then animates there on its own. */
    const goTo = useCallback(
        (index: number) => {
            const state = scrollState();
            if (!state || index < 0 || index >= stops.length) {
                return;
            }
            window.scrollTo({ top: state.sectionTop + index * state.step + 1, behavior: "auto" });
        },
        [scrollState, stops.length]
    );

    // Following a link to another date while on the page goes there too.
    useEffect(() => {
        const onHashChange = () => {
            const index = stops.findIndex((stop) => `#${stop.id}` === window.location.hash);
            if (index >= 0) {
                goTo(index);
            }
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, [goTo, stops]);

    // Load the sharper map layers once the page is up.
    useEffect(() => {
        const full = window.setTimeout(() => setHiRes((current) => ({ ...current, full: true })), 300);
        const detail = window.setTimeout(() => setHiRes((current) => ({ ...current, detail: true })), 600);
        return () => {
            window.clearTimeout(full);
            window.clearTimeout(detail);
        };
    }, []);

    const previous = useRef<number | null>(null);

    // Arriving at a date.
    useEffect(() => {
        if (!viewport) {
            return;
        }
        const stop = stops[active];
        const from = previous.current;
        previous.current = active;

        const run: Timers = { cancelled: false, controls: [] };
        timers.current.cancelled = true;
        timers.current.controls.forEach((control) => control.stop());
        timers.current = run;

        // The first frame, and the date a link opened on, are set at once rather than flown to.
        // (A repeat run for the same date is strict mode remounting the effect in development.)
        const instant = from === null || from === active || reduceMotion || jumped.current;
        if (from !== null && from !== active) {
            jumped.current = false;
        }

        setArrived(-1);
        setMoving(!instant);
        setMoreOpen(false);
        const forward = from !== null && from < active;
        const target: View = { focus: focusOf(active), zoom: stop.zoom };
        const targetAnchor = anchorFor(active, viewportRef.current, viewportRef.current.width >= DESKTOP_MIN);

        // Going back over dates that retrace, the lines drawn since this one (all of
        // them, or as far as their head had got) are traced back as the map returns.
        const drawnAhead = stops
            .flatMap((candidate, index) => (index > active ? candidate.routes ?? [] : []))
            .filter((id) => progress[id].get() > 0);
        const retrace =
            !instant && !forward && drawnAhead.length > 0 && drawnAhead.every((id) => stops[routeStopIndex(id)].retrace);

        // Crossings already sailed stay drawn; those ahead are taken back off the map.
        routeIds.forEach((id) => {
            const at = routeStopIndex(id);
            if (at < active || (at === active && !(forward && !instant))) {
                progress[id].set(1);
            } else if (at > active && progress[id].get() > 0 && !retrace) {
                run.controls.push(animate(progress[id], 0, { duration: instant ? 0 : 0.4 }));
            }
        });

        const ownDot = dotByKey.get(dotKeyFor(stop.marker, active));

        // An inland tour plays its places in one by one only when arrived at going forward.
        setSeriesShown(stop.series && (instant || !forward) ? stop.series.length : 0);

        const fly = (to: View, anchor: Point) =>
            new Promise<void>((resolve) => {
                const startAnchor = anchorRef.current;
                const path = flightPath(viewRef.current, to, viewportRef.current);
                run.controls.push(
                    animate(0, 1, {
                        duration: path.duration,
                        ease: EASE_FLIGHT,
                        onUpdate: (t) => {
                            anchorRef.current = lerpPoint(startAnchor, anchor, t);
                            applyView(path.at(t));
                        },
                        onComplete: resolve,
                    })
                );
            });

        // A date with travel lines is one continuous glide: the camera eases along the
        // lines (smoothed, so their wiggles never shake it) from where it stands to
        // the place, while the lines draw in step, one leg running into the next.
        // Going `back`, the glide runs the other way from the head of the drawn line,
        // and the lines undraw in step behind it.
        const travel = (legs: JourneyRouteId[], to: View, anchor: Point, back = false) =>
            new Promise<void>((resolve) => {
                const shapes = legs.map((leg) => geometry.current[leg]);
                const lengths = shapes.map((shape) => shape?.getTotalLength() ?? 0);
                const total = lengths.reduce((sum, length) => sum + length, 0);
                const start = back ? legs.reduce((sum, leg, i) => sum + progress[leg].get() * lengths[i], 0) : 0;
                const end = back ? 0 : total;
                const line: (Point & { along: number })[] = [];
                let before = 0;
                shapes.forEach((shape, i) => {
                    const steps = Math.max(8, Math.ceil(lengths[i] / 4));
                    for (let step = 0; shape && step <= steps; step++) {
                        const along = (lengths[i] * step) / steps;
                        const point = shape.getPointAtLength(along);
                        line.push({ x: point.x, y: point.y, along: before + along });
                    }
                    before += lengths[i];
                });

                const from = viewRef.current;
                const track = smoothTrack(
                    from.focus,
                    back ? line.filter((point) => point.along <= start).reverse() : line,
                    to.focus
                );
                const viewport = viewportRef.current;
                // How far the glide runs on screen sets its length, and how far the camera
                // eases back mid-way to show the lines around it.
                const onScreen = track.length * baseScale(viewport) * Math.sqrt(from.zoom * to.zoom);
                const pullBack = Math.min(onScreen / (viewport.width * 2.4), 0.42);
                const startAnchor = anchorRef.current;

                run.controls.push(
                    animate(0, 1, {
                        // Long voyages (Calcutta round to Singapore) take their time.
                        duration: Math.min(Math.max(1.2 + onScreen / 650 + Math.max(onScreen - 700, 0) / 150, 1.3), 5),
                        ease: EASE_FLIGHT,
                        onUpdate: (t) => {
                            let left = start + (end - start) * t;
                            legs.forEach((leg, i) => {
                                progress[leg].set(lengths[i] ? Math.min(Math.max(left / lengths[i], 0), 1) : 1);
                                left -= lengths[i];
                            });
                            anchorRef.current = lerpPoint(startAnchor, anchor, t);
                            applyView({
                                focus: track.at(t),
                                zoom: from.zoom * Math.pow(to.zoom / from.zoom, t) * (1 - pullBack * Math.sin(Math.PI * t)),
                            });
                        },
                        onComplete: resolve,
                    })
                );
            });

        const arrive = () => {
            if (run.cancelled) {
                return;
            }
            const place = journeyPlaces[stop.marker];
            cardPlaceX.set(place.x);
            cardPlaceY.set(place.y);
            cardOffsetX.set(ownDot?.offset?.x ?? 0);
            cardOffsetY.set(ownDot?.offset?.y ?? 0);
            setArrived(active);
            setMoving(false);
            // Keep the address pointing at the date on screen, so it can be shared.
            const { pathname, search } = window.location;
            window.history.replaceState(window.history.state, "", `${pathname}${search}${active > 0 ? `#${stop.id}` : ""}`);

            if (stop.series && forward && !instant) {
                run.controls.push(
                    animate(0, stop.series.length, {
                        duration: stop.series.length * 0.22,
                        ease: "linear",
                        onUpdate: (count) => setSeriesShown(Math.ceil(count)),
                    })
                );
            }
        };

        const journey = async () => {
            if (instant) {
                anchorRef.current = targetAnchor;
                applyView(target);
                arrive();
                return;
            }
            if (retrace) {
                await travel(drawnAhead, target, targetAnchor, true);
            } else if (stop.routes && forward) {
                await travel(stop.routes, target, targetAnchor);
            } else {
                await fly(target, targetAnchor);
            }
            arrive();
        };

        journey();
        return () => {
            run.cancelled = true;
        };
        // Runs on arrival at a new date; the viewport is read through its ref.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, viewport === null]);

    // A resize reframes the current date at once rather than replaying its flight.
    useEffect(() => {
        if (!viewport) {
            return;
        }
        anchorRef.current = anchorFor(active, viewport, desktop);
        applyView(viewRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewport?.width, viewport?.height]);

    // Keep the card and its read-more card on screen: when they would run past the
    // bottom, the map pans up so both stay in view.
    useEffect(() => {
        const card = cardRef.current;
        if (!card || !desktop || arrived !== active) {
            return;
        }
        const fit = () => {
            const stage = viewportRef.current;
            const anchor = anchorRef.current;
            // Measured from where the card really is, since it hangs from the date's own dot.
            const top = cardY.get();
            const overflow = top + card.offsetHeight - (stage.height - 24);
            const room = top - (journeyStops[active].image ? IMAGE_OVERLAP.y : 0) - 16;
            const wanted = anchor.y - Math.min(Math.max(overflow, 0), Math.max(room, 0));
            if (Math.abs(wanted - anchor.y) < 1) {
                return;
            }
            const from = anchor.y;
            timers.current.controls.push(
                animate(0, 1, {
                    duration: reduceMotion ? 0 : 0.6,
                    ease: EASE_FLIGHT,
                    onUpdate: (t) => {
                        anchorRef.current = { x: anchor.x, y: from + (wanted - from) * t };
                        applyView(viewRef.current);
                    },
                })
            );
        };
        const observer = new ResizeObserver(fit);
        observer.observe(card);
        return () => observer.disconnect();
    }, [active, arrived, desktop, applyView, reduceMotion, cardY]);

    const stop = stops[active];
    const showCard = arrived === active;
    // Every place the current stop names wears the dashed ring, once its card is open.
    const ringed = useMemo(() => new Set(ringedKeys(active)), [active]);

    const tourIndex = stops.findIndex((candidate) => candidate.series);
    const isRevealed = (dot: MapDotData) => {
        if (dot.revealedAt === undefined || ringed.has(dot.key)) {
            return true;
        }
        if (active > dot.revealedAt) {
            return true;
        }
        const order = stops[tourIndex].series!.indexOf(dot.place);
        return active === dot.revealedAt && order < seriesShown;
    };

    // The read-more card keeps to the screen: as wide as the design allows, or as there is room for.
    const moreWidth = viewport
        ? Math.max(
              CARD_WIDTH[stop.size],
              Math.min(MORE_WIDTH, viewport.width - 24 - (cardX.get()))
          )
        : MORE_WIDTH;

    return (
        <section
            ref={sectionRef}
            aria-label="Rabindranath Tagore's 1927 journey to Java and Bali"
            className="relative [--journey-header:57px] lg:[--journey-header:64px]"
            style={{ height: `calc(100svh - var(--journey-header) + ${stops.length - 1} * 70svh)` }}
        >
            <div
                ref={stageRef}
                className="sticky top-[var(--journey-header)] h-[calc(100svh-var(--journey-header))] min-h-[520px] w-full overflow-hidden bg-[#ddb55c]"
            >
                {/* The map itself, scaled and moved as one layer. */}
                <motion.div
                    aria-hidden
                    className="absolute left-0 top-0"
                    style={{
                        x: cameraX,
                        y: cameraY,
                        scale: cameraK,
                        originX: 0,
                        originY: 0,
                        width: MAP.width,
                        height: MAP.height,
                        willChange: moving ? "transform" : "auto",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: viewport ? 1 : 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Image
                        src={`${JOURNEY_ASSETS}/map-3200.webp`}
                        alt=""
                        width={3200}
                        height={1819}
                        unoptimized
                        priority
                        className="absolute max-w-none"
                        style={{ left: MAP_IMAGE.left, top: MAP_IMAGE.top, width: MAP_IMAGE.width, height: MAP_IMAGE.height }}
                    />
                    {hiRes.full && (
                        <Image
                            src={`${JOURNEY_ASSETS}/map-6400.webp`}
                            alt=""
                            width={6400}
                            height={3639}
                            unoptimized
                            className="absolute max-w-none"
                            style={{ left: MAP_IMAGE.left, top: MAP_IMAGE.top, width: MAP_IMAGE.width, height: MAP_IMAGE.height }}
                        />
                    )}
                    {hiRes.detail && (
                        <Image
                            src={`${JOURNEY_ASSETS}/map-detail.webp`}
                            alt=""
                            width={2083}
                            height={1916}
                            unoptimized
                            className="absolute max-w-none"
                            style={{ left: MAP_DETAIL.left, top: MAP_DETAIL.top, width: MAP_DETAIL.width, height: MAP_DETAIL.height }}
                        />
                    )}
                </motion.div>

                {viewport && (
                    <>
                        <JourneyRoutes
                            camera={camera}
                            progress={progress}
                            marching={showCard ? stop.routes ?? [] : []}
                            geometry={geometry}
                            paths={routePaths}
                        />

                        <div className="absolute inset-0" role="group" aria-label="Places on the map">
                            {mapDots.map((dot) => (
                                <MapDot
                                    key={dot.key}
                                    dot={dot}
                                    camera={camera}
                                    ringed={showCard && ringed.has(dot.key)}
                                    revealed={isRevealed(dot)}
                                    onSelect={goTo}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Title, in white over the map as in the design. */}
                <header className="pointer-events-none absolute left-[17px] top-[26px] [text-shadow:0_0_2px_rgba(0,0,0,0.5)] lg:left-[60px] lg:top-[60px] lg:[text-shadow:0_1px_14px_rgba(74,10,15,0.5)]">
                    <p className="text-[13px] uppercase leading-[24px] tracking-[1.56px] text-white lg:text-[16px] lg:leading-[24px] lg:tracking-[1.92px]">
                        Rabindranath Tagore&apos;s 1927 Journey to
                    </p>
                    <h1 className="font-Bodoni text-[36px] font-normal leading-[42px] tracking-[-1.08px] text-white lg:-mt-[6px] lg:text-[45px] lg:leading-[58px] lg:tracking-[-1.35px]">
                        <span className="italic">Java and</span> Bali
                    </h1>
                    <p className="text-[13px] uppercase leading-[24px] tracking-[1.56px] text-white lg:text-[16px] lg:leading-[19px] lg:tracking-[1.92px]">
                        And the Way Home
                    </p>
                </header>

                {viewport &&
                    (desktop ? (
                        <JourneyTimelineDesktop stops={stops} active={active} onSelect={goTo} />
                    ) : (
                        <JourneyTimelineMobile stops={stops} active={active} onSelect={goTo} />
                    ))}

                {/* The way on to the exhibition, along the foot of the map over a band of gold fading up into it. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[145px] bg-gradient-to-t from-[rgba(205,140,63,0.6)] from-[42.788%] to-[rgba(205,140,63,0)] to-[93.269%]">
                    <div className="pointer-events-auto absolute left-[34px] top-[48px] flex flex-col items-start gap-[10px] lg:left-[60px] lg:gap-[11px]">
                        <p className="text-[16px] font-medium leading-[28px] text-s2s-wine">Unfold more of the journey</p>
                        <UnderlineLink
                            href={exhibitionHref || "#"}
                            tone="light"
                            onClick={exhibitionHref ? undefined : (event) => event.preventDefault()}
                        >
                            visit the exhibition
                        </UnderlineLink>
                    </div>
                </div>

                {/* The card, beside its dot on desktop and as a sheet along the bottom on phones. */}
                {viewport && desktop && (
                    <motion.div className="absolute left-0 top-0" style={{ x: cardX, y: cardY }} aria-live="polite">
                        <AnimatePresence mode="wait">
                            {showCard && (
                                <motion.div
                                    key={stop.id}
                                    ref={cardRef}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="shown"
                                    exit="hidden"
                                >
                                    <JourneyCard
                                        stop={stop}
                                        open={moreOpen}
                                        onToggle={() => setMoreOpen((open) => !open)}
                                        moreWidth={moreWidth}
                                        fixedWidth
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {viewport && !desktop && (
                    <div className="absolute inset-x-4 bottom-[119px]" aria-live="polite">
                        <AnimatePresence mode="wait">
                            {showCard && (
                                <motion.div
                                    key={stop.id}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="shown"
                                    exit="hidden"
                                >
                                    <JourneyCard
                                        stop={stop}
                                        open={moreOpen}
                                        onToggle={() => setMoreOpen((open) => !open)}
                                        moreWidth={MORE_WIDTH}
                                        fixedWidth={false}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </section>
    );
};

export default JourneyExperience;
