"use client";

import { useEffect, useId, useRef, type MutableRefObject } from "react";
import type { MotionValue } from "framer-motion";
import { routeToScreen } from "./camera";
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
    /** How much of each crossing is drawn, 0 to 1. */
    progress: Record<JourneyRouteId, MotionValue<number>>;
    /** The legs whose dashes run while their date's card is open. */
    marching: JourneyRouteId[];
    /** Untransformed copies of the paths, for measuring points along them in map units. */
    geometry: RouteGeometry;
};

const routeIds = Object.keys(journeyRoutes) as JourneyRouteId[];

/**
 * Every leg of the journey as a dotted line, as in the designer's map: dark red
 * across the sea, white over land. Each is revealed by a mask drawn along the same
 * path, so the dashes appear from where Tagore set out to where he arrived, with a
 * small dot travelling at the head.
 *
 * The paths are rewritten in screen space on every camera move rather than
 * scaled with the map, which keeps the line and its dashes the same weight at
 * every zoom.
 */
const JourneyRoutes = ({ camera, progress, marching, geometry }: JourneyRoutesProps) => {
    // React's ids carry colons, which a url(#...) reference does not accept.
    const maskId = `route${useId().replace(/:/g, "")}`;
    const dashRefs = useRef<Partial<Record<JourneyRouteId, SVGPathElement | null>>>({});
    const maskRefs = useRef<Partial<Record<JourneyRouteId, SVGPathElement | null>>>({});
    const headRefs = useRef<Partial<Record<JourneyRouteId, SVGCircleElement | null>>>({});

    useEffect(() => {
        const render = () => {
            const transform = { x: camera.x.get(), y: camera.y.get(), k: camera.k.get() };

            routeIds.forEach((id) => {
                const dash = dashRefs.current[id];
                const mask = maskRefs.current[id];
                const head = headRefs.current[id];
                const shape = geometry.current[id];
                if (!dash || !mask || !head) {
                    return;
                }
                const d = routeToScreen(journeyRoutes[id].d, transform);
                const drawn = progress[id].get();
                dash.setAttribute("d", d);
                mask.setAttribute("d", d);
                mask.style.strokeDashoffset = String(1 - drawn);
                dash.style.opacity = drawn > 0 ? "1" : "0";

                if (shape && drawn > 0 && drawn < 1) {
                    const point = shape.getPointAtLength(drawn * shape.getTotalLength());
                    head.setAttribute("cx", String(point.x * transform.k + transform.x));
                    head.setAttribute("cy", String(point.y * transform.k + transform.y));
                    head.style.opacity = "1";
                } else {
                    head.style.opacity = "0";
                }
            });
        };

        render();
        const sources = [camera.x, camera.y, camera.k, ...routeIds.map((id) => progress[id])];
        const unsubscribers = sources.map((value) => value.on("change", render));
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, [camera, progress, geometry]);

    return (
        <>
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <defs>
                    {routeIds.map((id) => (
                        <mask key={id} id={`${maskId}-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                            <path
                                ref={(element) => (maskRefs.current[id] = element)}
                                fill="none"
                                stroke="#fff"
                                strokeWidth={8}
                                pathLength={1}
                                strokeDasharray="1 1"
                                style={{ strokeDashoffset: 1 }}
                            />
                        </mask>
                    ))}
                </defs>
                {routeIds.map((id) => (
                    <g key={id}>
                        <path
                            ref={(element) => (dashRefs.current[id] = element)}
                            mask={`url(#${maskId}-${id})`}
                            fill="none"
                            stroke={journeyRoutes[id].kind === "sea" ? "#6a1b1d" : "#ffffff"}
                            strokeWidth={1.5}
                            strokeDasharray="5 3"
                            className={`transition-opacity duration-300 ${marching.includes(id) ? "motion-safe:animate-march" : ""}`}
                            style={{ opacity: 0 }}
                        />
                        <circle
                            ref={(element) => (headRefs.current[id] = element)}
                            r={3.5}
                            fill="#fff"
                            style={{ opacity: 0 }}
                        />
                    </g>
                ))}
            </svg>

            {/* Measuring copies, in map units, never shown. */}
            <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
                {routeIds.map((id) => (
                    <path key={id} ref={(element) => (geometry.current[id] = element)} d={journeyRoutes[id].d} />
                ))}
            </svg>
        </>
    );
};

export default JourneyRoutes;
