"use client";

import { useEffect, useId, useRef, type MutableRefObject } from "react";
import { frame, type MotionValue } from "framer-motion";
import { journeyRoutes, type JourneyRouteId } from "../../data/journey";

export type CameraValues = {
    x: MotionValue<number>;
    y: MotionValue<number>;
    k: MotionValue<number>;
    spread: MotionValue<number>;
};

export type RouteGeometry = MutableRefObject<Partial<Record<JourneyRouteId, SVGPathElement | null>>>;

type JourneyRoutesProps = {
    camera: CameraValues;
    /** How much of each leg is drawn, 0 to 1. */
    progress: Record<JourneyRouteId, MotionValue<number>>;
    /** The legs whose dashes run while their date's card is open. */
    marching: JourneyRouteId[];
    /** Untransformed copies of the paths, for measuring points along them in map units. */
    geometry: RouteGeometry;
    /** Each leg's path data in map units, its ends on the dots it joins. */
    paths: Record<JourneyRouteId, string>;
};

const routeIds = Object.keys(journeyRoutes) as JourneyRouteId[];

/** How wide the reveal runs along a line, in map units: enough to cover it at every zoom. */
const REVEAL_WIDTH = 4;

/**
 * Every leg of the journey as a dotted line, as in the designer's map: dark red
 * across the sea, white over land. A leg being travelled is revealed by a mask
 * drawn along the same path, so the dashes appear from where Tagore set out to
 * where he arrived, with a small dot travelling at the head.
 *
 * The lines sit in one group that moves and scales with the map, so a camera move
 * costs a single transform per frame. Their strokes do not scale with it, which
 * keeps the line and its dashes the same weight at every zoom.
 */
const JourneyRoutes = ({ camera, progress, marching, geometry, paths }: JourneyRoutesProps) => {
    // React's ids carry colons, which a url(#...) reference does not accept.
    const maskId = `route${useId().replace(/:/g, "")}`;
    const groupRef = useRef<SVGGElement>(null);
    const dashRefs = useRef<Partial<Record<JourneyRouteId, SVGPathElement | null>>>({});
    const maskRefs = useRef<Partial<Record<JourneyRouteId, SVGPathElement | null>>>({});
    const headRefs = useRef<Partial<Record<JourneyRouteId, SVGCircleElement | null>>>({});

    useEffect(() => {
        // What each leg last showed, so a frame only touches the legs that changed.
        const shown: Partial<Record<JourneyRouteId, "hidden" | "drawing" | "drawn">> = {};

        const render = () => {
            const k = camera.k.get();
            const x = camera.x.get();
            const y = camera.y.get();
            groupRef.current?.setAttribute("transform", `matrix(${k} 0 0 ${k} ${x} ${y})`);

            routeIds.forEach((id) => {
                const dash = dashRefs.current[id];
                const mask = maskRefs.current[id];
                const head = headRefs.current[id];
                const shape = geometry.current[id];
                if (!dash || !mask || !head || !shape) {
                    return;
                }
                const drawn = progress[id].get();
                const state = drawn <= 0 ? "hidden" : drawn >= 1 ? "drawn" : "drawing";

                const changed = state !== shown[id];
                if (changed) {
                    shown[id] = state;
                    dash.style.opacity = state === "hidden" ? "0" : "1";
                    // Only a finished leg is drawn plainly. One taken off keeps its mask,
                    // emptied, so it fades out unseen rather than showing whole again.
                    if (state === "drawn") {
                        dash.removeAttribute("mask");
                    } else {
                        dash.setAttribute("mask", `url(#${maskId}-${id})`);
                    }
                    head.style.opacity = state === "drawing" ? "1" : "0";
                }

                if (state === "drawing" || (state === "hidden" && changed)) {
                    const length = shape.getTotalLength();
                    const along = state === "drawing" ? drawn : 0;
                    mask.style.strokeDasharray = `${length} ${length}`;
                    mask.style.strokeDashoffset = String(length * (1 - along));
                    if (state === "drawing") {
                        const point = shape.getPointAtLength(along * length);
                        head.setAttribute("cx", String(point.x * k + x));
                        head.setAttribute("cy", String(point.y * k + y));
                    }
                }
            });
        };

        const schedule = () => frame.render(render);
        render();
        const sources = [camera.x, camera.y, camera.k, ...routeIds.map((id) => progress[id])];
        const unsubscribers = sources.map((value) => value.on("change", schedule));
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, [camera, progress, geometry, maskId]);

    return (
        <>
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <g ref={groupRef}>
                    <defs>
                        {routeIds.map((id) => (
                            <mask key={id} id={`${maskId}-${id}`} maskUnits="userSpaceOnUse" x={-200} y={-200} width={3500} height={2200}>
                                <path
                                    ref={(element) => (maskRefs.current[id] = element)}
                                    d={paths[id]}
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth={REVEAL_WIDTH}
                                    strokeLinecap="round"
                                />
                            </mask>
                        ))}
                    </defs>
                    {routeIds.map((id) => (
                        <path
                            key={id}
                            ref={(element) => (dashRefs.current[id] = element)}
                            d={paths[id]}
                            fill="none"
                            stroke={journeyRoutes[id].kind === "sea" ? "#6a1b1d" : "#ffffff"}
                            strokeWidth={1.5}
                            strokeDasharray="5 3"
                            vectorEffect="non-scaling-stroke"
                            className={`transition-opacity duration-300 ${marching.includes(id) ? "motion-safe:animate-march" : ""}`}
                            style={{ opacity: 0 }}
                        />
                    ))}
                </g>
                {routeIds.map((id) => (
                    <circle key={id} ref={(element) => (headRefs.current[id] = element)} r={3.5} fill="#fff" style={{ opacity: 0 }} />
                ))}
            </svg>

            {/* Measuring copies, in map units, never shown. */}
            <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
                {routeIds.map((id) => (
                    <path key={id} ref={(element) => (geometry.current[id] = element)} d={paths[id]} />
                ))}
            </svg>
        </>
    );
};

export default JourneyRoutes;
