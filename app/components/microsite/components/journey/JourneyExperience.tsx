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
import {
    MAP,
    MAP_DETAIL,
    MAP_IMAGE,
    baseScale,
    clusterRing,
    clusterSpread,
    flightDuration,
    interpolateView,
    nearestTurn,
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

const EASE_FLIGHT: BezierDefinition = [0.65, 0, 0.35, 1];
const EASE_VOYAGE: BezierDefinition = [0.45, 0, 0.55, 1];

const routeIds = Object.keys(journeyRoutes) as JourneyRouteId[];
const placeIds = Object.keys(journeyPlaces) as JourneyPlaceId[];

type MapDotData = {
    key: string;
    place: JourneyPlaceId;
    x: number;
    y: number;
    /** For one anecdote of many: the radius (px, before spreading) of its place's ring, and its angle on it. */
    ring?: { radius: number; angle: number };
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

const clusterPlaces = Object.keys(clusterMembers) as JourneyPlaceId[];

/** The first stop a place belongs to, so a single dot can open it. */
const firstStopAt = (place: JourneyPlaceId) =>
    journeyStops.findIndex(
        (stop) => stop.marker === place || stop.also?.includes(place) || stop.series?.includes(place)
    );

const mapDots = placeIds.flatMap<MapDotData>((id) => {
    const place = journeyPlaces[id];
    const members = clusterMembers[id];

    if (members) {
        const ring = clusterRing(members.length);
        return members.map((stop, index) => ({
            key: `${id}-${stop}`,
            place: id,
            x: place.x,
            y: place.y,
            ring: { radius: ring.radius, angle: ring.angles[index] },
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

/** The dots a stop rings with the dashed circle: its own, and the other places it names. */
const ringedKeys = (index: number) => {
    const stop = journeyStops[index];
    return [stop.marker, ...(stop.also ?? [])].map((place) => dotKeyFor(place, index));
};

/**
 * Where the stop's own dot settles, in map units: on its place, or for one
 * anecdote of many, east of it by the ring's radius, since the ring turns so the
 * current date faces the card.
 */
const focusOf = (index: number, viewport: Size): Point => {
    const stop = journeyStops[index];
    const place = journeyPlaces[stop.marker];
    const ring = dotByKey.get(dotKeyFor(stop.marker, index))?.ring;
    if (!ring) {
        return { x: place.x, y: place.y };
    }
    const k = toTransform({ focus: place, zoom: stop.zoom }, viewport, { x: 0, y: 0 }).k;
    return { x: place.x + (ring.radius * clusterSpread(k, baseScale(viewport))) / k, y: place.y };
};

const routeStopIndex = (route: JourneyRouteId) => journeyStops.findIndex((stop) => stop.route === route);

/** Where on screen the stop's dot should sit so its card, photograph included, fits beside it. */
const anchorFor = (index: number, viewport: Size, desktop: boolean): Point => {
    if (!desktop) {
        // Between the strip of dates and the card sheet over the lower half.
        return { x: viewport.width / 2, y: Math.max(200, (172 + viewport.height * 0.54) / 2) };
    }
    const stop = journeyStops[index];
    const reach = CARD_OFFSET.x + CARD_WIDTH[stop.size] + (stop.image ? stop.image.width - IMAGE_OVERLAP.x : 0);

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
    /** How far its place's ring has been turned (radians); a still value for a single dot. */
    turn: MotionValue<number>;
    ringed: boolean;
    revealed: boolean;
    onSelect: (index: number) => void;
};

/**
 * One place, or one anecdote of a place: a white dot with a soft glow that opens
 * its stop and is named on hover. The dots of the current stop carry the design's
 * dashed gold ring.
 */
const MapDot = memo(({ dot, camera, turn, ringed, revealed, onSelect }: MapDotProps) => {
    const x = useDerived([camera.x, camera.k, camera.spread, turn], ([cx, k, s, t]) =>
        dot.x * k + cx + (dot.ring ? Math.cos(dot.ring.angle + t) * dot.ring.radius * s : 0)
    );
    const y = useDerived([camera.y, camera.k, camera.spread, turn], ([cy, k, s, t]) =>
        dot.y * k + cy + (dot.ring ? Math.sin(dot.ring.angle + t) * dot.ring.radius * s : 0)
    );
    // Anecdote dots sit on top of one another at their place's size in the overview,
    // and settle a little smaller as they fan out into a ring.
    const scale = useDerived([camera.spread], ([s]) => (dot.ring ? 1 + (ANECDOTE_SIZE / dot.size - 1) * s : 1));
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

    // How much of each crossing is drawn, 0 to 1.
    const madrasSingapore = useMotionValue(0);
    const penangBelawan = useMotionValue(0);
    const progress = useMemo<Record<JourneyRouteId, MotionValue<number>>>(
        () => ({ "madras-singapore": madrasSingapore, "penang-belawan": penangBelawan }),
        [madrasSingapore, penangBelawan]
    );

    // How far each many-anecdote place's ring of dots is turned, so the current date faces its card.
    const turns = useMemo(
        () => Object.fromEntries(clusterPlaces.map((place) => [place, motionValue(0)])) as Partial<Record<JourneyPlaceId, MotionValue<number>>>,
        []
    );
    const still = useMotionValue(0);

    // The open card hangs the same distance from its dot on every stop, as in the
    // design: 23.5px right of the dot's centre, its top 13.5px above it. The dot is
    // its place (map units), pushed out east by the ring's radius for an anecdote.
    const cardPlaceX = useMotionValue(0);
    const cardPlaceY = useMotionValue(0);
    const cardRadius = useMotionValue(0);
    const cardX = useDerived(
        [cameraX, cameraK, spread, cardPlaceX, cardRadius],
        ([cx, k, s, px, radius]) => px * k + cx + radius * s + CARD_OFFSET.x
    );
    const cardY = useDerived([cameraY, cameraK, cardPlaceY], ([cy, k, py]) => py * k + cy + CARD_OFFSET.y);

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
        const target: View = { focus: focusOf(active, viewportRef.current), zoom: stop.zoom };
        const targetAnchor = anchorFor(active, viewportRef.current, viewportRef.current.width >= DESKTOP_MIN);

        // Crossings already sailed stay drawn; those ahead are taken back off the map.
        routeIds.forEach((id) => {
            const at = routeStopIndex(id);
            if (at < active || (at === active && !(forward && !instant))) {
                progress[id].set(1);
            } else if (at > active && progress[id].get() > 0) {
                run.controls.push(animate(progress[id], 0, { duration: instant ? 0 : 0.4 }));
            }
        });

        // A place with several anecdotes turns its ring so this date's dot faces the card.
        const ownDot = dotByKey.get(dotKeyFor(stop.marker, active));
        const turn = ownDot?.ring && turns[ownDot.place];
        if (ownDot?.ring && turn) {
            const to = nearestTurn(turn.get(), -ownDot.ring.angle);
            if (instant) {
                turn.set(to);
            } else {
                run.controls.push(animate(turn, to, { duration: 0.6, ease: EASE_FLIGHT }));
            }
        }

        // An inland tour plays its places in one by one only when arrived at going forward.
        setSeriesShown(stop.series && (instant || !forward) ? stop.series.length : 0);

        const fly = (to: View, anchor: Point) =>
            new Promise<void>((resolve) => {
                const startView = viewRef.current;
                const startAnchor = anchorRef.current;
                run.controls.push(
                    animate(0, 1, {
                        duration: flightDuration(startView, to, viewportRef.current),
                        ease: EASE_FLIGHT,
                        onUpdate: (t) => {
                            anchorRef.current = lerpPoint(startAnchor, anchor, t);
                            applyView(interpolateView(startView, to, t, viewportRef.current));
                        },
                        onComplete: resolve,
                    })
                );
            });

        const sail = (route: JourneyRouteId) =>
            new Promise<void>((resolve) => {
                const shape = geometry.current[route];
                const length = shape?.getTotalLength() ?? 0;
                run.controls.push(
                    animate(0, 1, {
                        duration: Math.min(Math.max(length / 260, 1.3), 2.8),
                        ease: EASE_VOYAGE,
                        onUpdate: (drawn) => {
                            progress[route].set(drawn);
                            if (shape) {
                                const point = shape.getPointAtLength(drawn * length);
                                applyView({ focus: { x: point.x, y: point.y }, zoom: stop.zoom });
                            }
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
            cardRadius.set(ownDot?.ring?.radius ?? 0);
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
            if (stop.route && forward) {
                const shape = geometry.current[stop.route];
                const start = shape?.getPointAtLength(0);
                if (start) {
                    await fly({ focus: { x: start.x, y: start.y }, zoom: stop.zoom }, targetAnchor);
                    if (run.cancelled) {
                        return;
                    }
                    await sail(stop.route);
                    if (run.cancelled) {
                        return;
                    }
                }
            }
            await fly(target, targetAnchor);
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
            const top = anchor.y + CARD_OFFSET.y;
            const overflow = top + card.offsetHeight - (stage.height - 24);
            const highest = -CARD_OFFSET.y + (journeyStops[active].image ? IMAGE_OVERLAP.y : 0) + 16;
            const wanted = Math.max(highest, anchor.y - Math.max(overflow, 0));
            if (Math.abs(wanted - anchor.y) < 1) {
                return;
            }
            const from = anchor.y;
            timers.current.controls.push(
                animate(0, 1, {
                    duration: reduceMotion ? 0 : 0.45,
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
    }, [active, arrived, desktop, applyView, reduceMotion]);

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
                            marching={showCard ? stop.route : undefined}
                            geometry={geometry}
                        />

                        <div className="absolute inset-0" role="group" aria-label="Places on the map">
                            {mapDots.map((dot) => (
                                <MapDot
                                    key={dot.key}
                                    dot={dot}
                                    camera={camera}
                                    turn={turns[dot.place] ?? still}
                                    ringed={showCard && ringed.has(dot.key)}
                                    revealed={isRevealed(dot)}
                                    onSelect={goTo}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Title, in white over the map as in the design. */}
                <header className="pointer-events-none absolute left-4 top-[18px] [text-shadow:0_1px_14px_rgba(74,10,15,0.5)] lg:left-[60px] lg:top-[60px]">
                    <p className="text-[12px] uppercase leading-[18px] tracking-[1.44px] text-white lg:text-[16px] lg:leading-[24px] lg:tracking-[1.92px]">
                        Rabindranath Tagore&apos;s 1927 Journey to
                    </p>
                    <h1 className="font-Bodoni text-[32px] font-normal leading-[44px] tracking-[-1px] text-white lg:-mt-[6px] lg:text-[45px] lg:leading-[58px] lg:tracking-[-1.35px]">
                        <span className="italic">Java and</span> Bali
                    </h1>
                    <p className="text-[12px] uppercase leading-[18px] tracking-[1.44px] text-white lg:text-[16px] lg:leading-[19px] lg:tracking-[1.92px]">
                        And the Way Home
                    </p>
                </header>

                {viewport &&
                    (desktop ? (
                        <JourneyTimelineDesktop stops={stops} active={active} onSelect={goTo} />
                    ) : (
                        <JourneyTimelineMobile stops={stops} active={active} onSelect={goTo} />
                    ))}

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
                    <div className="absolute inset-x-4 bottom-4 max-h-[46%] overflow-y-auto" aria-live="polite">
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
