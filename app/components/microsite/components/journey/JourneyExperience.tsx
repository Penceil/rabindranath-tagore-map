"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
    AnimatePresence,
    animate,
    motion,
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
    clusterOffsets,
    clusterSpread,
    flightDuration,
    interpolateView,
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
    type JourneyStop,
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
    /** Screen offset within its place's cluster, before spreading. */
    offset: Point;
    /** The stop this dot opens. */
    stop: number;
    label: string;
    /** Diameter in px: the place's own size, or, for one anecdote of many, its size gathered up. */
    size: number;
    /** One of several anecdote dots around a place; these shrink a little as they fan out. */
    anecdote: boolean;
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

/** The first stop a place belongs to, so a single dot can open it. */
const firstStopAt = (place: JourneyPlaceId) =>
    journeyStops.findIndex(
        (stop) => stop.marker === place || stop.also?.includes(place) || stop.series?.includes(place)
    );

const mapDots = placeIds.flatMap<MapDotData>((id) => {
    const place = journeyPlaces[id];
    const members = clusterMembers[id];

    if (members) {
        const offsets = clusterOffsets(members.length);
        return members.map((stop, index) => ({
            key: `${id}-${stop}`,
            place: id,
            x: place.x,
            y: place.y,
            offset: offsets[index],
            stop,
            label: `${place.name}, ${journeyStops[stop].date}`,
            size: DOT_SIZE[place.size],
            anecdote: true,
        }));
    }

    return [
        {
            key: id,
            place: id,
            x: place.x,
            y: place.y,
            offset: { x: 0, y: 0 },
            stop: firstStopAt(id),
            label: place.name,
            size: DOT_SIZE[place.size],
            anecdote: false,
            revealedAt: place.revealedBy ? journeyStops.findIndex((stop) => stop.id === place.revealedBy) : undefined,
        },
    ];
});

/**
 * The dot a stop's ring goes round: its own anecdote dot in a cluster, else its
 * place. A stop that leaves from a clustered place without being one of its
 * anecdotes (Batavia > Singapore) rings the middle of the cluster.
 */
const markerDot = (index: number): Pick<MapDotData, "x" | "y" | "offset"> => {
    const stop = journeyStops[index];
    const key = stop.cluster ? `${stop.cluster}-${index}` : stop.marker;
    const place = journeyPlaces[stop.marker];
    return mapDots.find((dot) => dot.key === key) ?? { x: place.x, y: place.y, offset: { x: 0, y: 0 } };
};

/**
 * The point the camera brings to its anchor and the card hangs from. For an
 * inland tour that is the north-east corner of its places, so the whole series
 * stays clear of the card to its left.
 */
const focusOf = (stop: JourneyStop): Point => {
    if (stop.series) {
        const places = stop.series.map((id) => journeyPlaces[id]);
        return { x: Math.max(...places.map((place) => place.x)), y: Math.min(...places.map((place) => place.y)) };
    }
    const place = journeyPlaces[stop.marker];
    return { x: place.x, y: place.y };
};

const routeStopIndex = (route: JourneyRouteId) => journeyStops.findIndex((stop) => stop.route === route);

/**
 * Roughly how tall a card will be, from how many lines its text runs to, before
 * it is on screen to measure. Only used to tell which dots it would cover.
 */
const estimateCardHeight = (stop: JourneyStop) => {
    const textWidth = CARD_WIDTH[stop.size] - 90;
    const placeLines = Math.ceil((stop.place.length * 11) / textWidth);
    const summaryLines = Math.ceil((stop.summary.length * 7.6) / textWidth);
    return 60 + 36 + 5 + placeLines * 18 + 5 + summaryLines * 26 + (stop.more ? 30 : 0);
};

/**
 * How much further right than the design's 23.5px a card starts, so that it
 * clears the dots just east of its own: the rest of a place's cluster, or a
 * neighbour as close as Jogjakarta is to Borobudur. Measured at the zoom the stop
 * settles at.
 */
const cardRoomFor = (index: number, viewport: Size) => {
    const stop = journeyStops[index];
    const focus = focusOf(stop);
    const k = toTransform({ focus, zoom: stop.zoom }, viewport, { x: 0, y: 0 }).k;
    const spreadAmount = clusterSpread(k, baseScale(viewport));
    const bottom = CARD_OFFSET.y + estimateCardHeight(stop);

    return mapDots.reduce((room, dot) => {
        if (dot.revealedAt !== undefined && dot.revealedAt > index) {
            return room;
        }
        const dx = (dot.x - focus.x) * k + dot.offset.x * spreadAmount;
        const dy = (dot.y - focus.y) * k + dot.offset.y * spreadAmount;
        const beside = dx > -6 && dx < 100 && dy > CARD_OFFSET.y - 8 && dy < bottom + 8;
        return beside ? Math.max(room, dx + 10 - CARD_OFFSET.x) : room;
    }, 0);
};

/** Where on screen the focus of a stop should sit so its card, photograph included, fits beside it. */
const anchorFor = (index: number, viewport: Size, desktop: boolean): Point => {
    if (!desktop) {
        // Between the strip of dates and the card sheet over the lower half.
        return { x: viewport.width / 2, y: Math.max(200, (172 + viewport.height * 0.54) / 2) };
    }
    const stop = journeyStops[index];
    const reach =
        CARD_OFFSET.x +
        cardRoomFor(index, viewport) +
        CARD_WIDTH[stop.size] +
        (stop.image ? stop.image.width - IMAGE_OVERLAP.x : 0);

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
    lit: boolean;
    revealed: boolean;
    onSelect: (index: number) => void;
};

/** The soft light round a dot, stronger the larger it is; a lit dot takes a ring instead. */
const dotGlow = (size: number, lit: boolean) => {
    if (lit) {
        return "scale-[1.3] shadow-[0_0_0_4px_rgba(255,255,255,0.28)]";
    }
    if (size >= DOT_SIZE.large) {
        return "shadow-[0_0_10px_2px_rgba(255,255,255,0.45)]";
    }
    return size >= DOT_SIZE.medium ? "shadow-[0_0_6px_1px_rgba(255,255,255,0.35)]" : "opacity-90";
};

/** One place, or one anecdote of a place: a white dot that opens its stop, named on hover. */
const MapDot = memo(({ dot, camera, lit, revealed, onSelect }: MapDotProps) => {
    const x = useDerived([camera.x, camera.k, camera.spread], ([cx, k, s]) => dot.x * k + cx + dot.offset.x * s);
    const y = useDerived([camera.y, camera.k, camera.spread], ([cy, k, s]) => dot.y * k + cy + dot.offset.y * s);
    // Anecdote dots sit on top of one another at their place's size in the overview,
    // and settle a little smaller as they fan out into a ring.
    const scale = useDerived([camera.spread], ([s]) => (dot.anecdote ? 1 + (ANECDOTE_SIZE / dot.size - 1) * s : 1));
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
                <span
                    className={`block h-full w-full rounded-full bg-white transition-[transform,box-shadow,opacity] duration-300 group-hover:scale-125 ${dotGlow(
                        dot.size,
                        lit
                    )}`}
                />
            </motion.span>
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

    const viewRef = useRef<View>({ focus: focusOf(stops[0]), zoom: stops[0].zoom });
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

    // Where the open card hangs: its place (map units) and the extra room it leaves (px) to clear nearby dots.
    const cardPlaceX = useMotionValue(0);
    const cardPlaceY = useMotionValue(0);
    const cardRoom = useMotionValue(0);
    const ringX = useMotionValue(0);
    const ringY = useMotionValue(0);
    const ringOffsetX = useMotionValue(0);
    const ringOffsetY = useMotionValue(0);

    const cardX = useDerived(
        [cameraX, cameraK, cardPlaceX, cardRoom],
        ([cx, k, px, room]) => px * k + cx + CARD_OFFSET.x + room
    );
    const cardY = useDerived([cameraY, cameraK, cardPlaceY], ([cy, k, py]) => py * k + cy + CARD_OFFSET.y);
    const markerX = useDerived(
        [cameraX, cameraK, spread, ringX, ringOffsetX],
        ([cx, k, s, px, ox]) => px * k + cx + ox * s
    );
    const markerY = useDerived(
        [cameraY, cameraK, spread, ringY, ringOffsetY],
        ([cy, k, s, py, oy]) => py * k + cy + oy * s
    );

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
        const target: View = { focus: focusOf(stop), zoom: stop.zoom };
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
            const dot = markerDot(active);
            const focus = focusOf(stop);
            cardPlaceX.set(focus.x);
            cardPlaceY.set(focus.y);
            cardRoom.set(cardRoomFor(active, viewportRef.current));
            ringX.set(dot.x);
            ringY.set(dot.y);
            ringOffsetX.set(dot.offset.x);
            ringOffsetY.set(dot.offset.y);
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
    const lit = useMemo(() => {
        const keys = new Set<string>();
        const light = (place: JourneyPlaceId) => {
            const members = clusterMembers[place];
            if (!members) {
                keys.add(place);
                return;
            }
            // A place with several anecdotes lights only the one this stop leads to,
            // or failing that the last one before it, not every date it has.
            const next = members.find((member) => member > active) ?? [...members].reverse().find((member) => member < active);
            if (next !== undefined) {
                keys.add(`${place}-${next}`);
            }
        };
        stop.also?.forEach(light);
        stop.series?.slice(0, seriesShown).forEach(light);
        return keys;
    }, [stop, active, seriesShown]);

    const tourIndex = stops.findIndex((candidate) => candidate.series);
    const isRevealed = (dot: MapDotData) => {
        if (dot.revealedAt === undefined) {
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
              Math.min(MORE_WIDTH, viewport.width - 24 - (anchorRef.current.x + CARD_OFFSET.x + cardRoom.get()))
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
                                    lit={lit.has(dot.key)}
                                    revealed={isRevealed(dot)}
                                    onSelect={goTo}
                                />
                            ))}
                        </div>

                        {/* The current stop: a turning dashed ring round a white dot. */}
                        <motion.div
                            aria-hidden
                            className="pointer-events-none absolute left-0 top-0 -ml-[13.5px] -mt-[13.5px] h-[27px] w-[27px]"
                            style={{ x: markerX, y: markerY }}
                        >
                            <AnimatePresence>
                                {showCard && (
                                    <motion.div
                                        key={stop.id}
                                        className="absolute inset-0"
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
                                        <Image
                                            src={`${JOURNEY_ASSETS}/marker-dot.png`}
                                            alt=""
                                            width={9}
                                            height={9}
                                            unoptimized
                                            className="absolute left-[9px] top-[9px]"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
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
