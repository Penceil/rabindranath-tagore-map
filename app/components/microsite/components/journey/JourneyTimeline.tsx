"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { JOURNEY_ASSETS, type JourneyStop } from "../../data/journey";

type JourneyTimelineProps = {
    stops: JourneyStop[];
    active: number;
    onSelect: (index: number) => void;
};

/**
 * Where the current date sits, from the top of the list's window: the first
 * date's place in the design (97px down the band), under the up arrow.
 */
const CURRENT_SLOT = 33;

const fadeMask =
    "[mask-image:linear-gradient(to_bottom,transparent_0,#000_30px,#000_calc(100%-40px),transparent_100%)]";

const arrowButton =
    "absolute left-1/2 flex h-[30px] w-[30px] -translate-x-1/2 items-center justify-center rounded-sm transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default disabled:opacity-40";

/**
 * The band of dates down the left of the map, as in the design: an arrow up to the
 * date before, the current date in white capitals, the rest in red, ruled apart,
 * and an arrow down to the next. Moving on slides the list up so the current date
 * keeps the top slot, the one before it fading out under the up arrow, the way
 * Statskog's season picker scrolls.
 *
 * The band is 570px tall in the design and fades out before the map's foot; on a
 * shorter screen it keeps 16px clear of the bottom instead.
 */
export const JourneyTimelineDesktop = ({ stops, active, onSelect }: JourneyTimelineProps) => {
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
    const [offset, setOffset] = useState(0);
    const reduceMotion = useReducedMotion();

    useLayoutEffect(() => {
        const item = itemRefs.current[active];
        if (item) {
            setOffset(CURRENT_SLOT - item.offsetTop);
        }
    }, [active]);

    const first = active === 0;
    const last = active === stops.length - 1;

    return (
        <nav
            aria-label="Dates of the journey"
            className="absolute left-[62px] top-[217px] h-[min(570px,calc(100%-233px))] w-[198px] bg-gradient-to-b from-[rgba(205,140,63,0.6)] from-[58.589%] to-[rgba(205,140,63,0)]"
        >
            <button
                type="button"
                onClick={() => onSelect(active - 1)}
                disabled={first}
                aria-label="Previous date"
                className={`${arrowButton} top-[34px] enabled:hover:opacity-70`}
            >
                <Image src={`${JOURNEY_ASSETS}/chevron.svg`} alt="" width={12} height={7} unoptimized className="h-[5px] w-[10px]" />
            </button>

            <div className={`absolute inset-x-0 top-[64px] bottom-[114px] overflow-hidden ${fadeMask}`}>
                <motion.ol
                    className="relative px-5"
                    animate={{ y: offset }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                >
                    {stops.map((stop, index) => (
                        <Fragment key={stop.id}>
                            {index > 0 && (
                                <li aria-hidden className="relative mx-auto my-[18px] h-px w-[142px]">
                                    <Image src={`${JOURNEY_ASSETS}/timeline-rule.svg`} alt="" fill unoptimized />
                                </li>
                            )}
                            <li ref={(element) => (itemRefs.current[index] = element)}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(index)}
                                    aria-current={index === active ? "step" : undefined}
                                    className={`block w-full rounded-sm text-center text-[14px] uppercase tracking-[1.68px] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                        index === active
                                            ? "font-bold leading-[24px] text-white"
                                            : "font-medium leading-[20px] text-s2s-wine hover:text-white"
                                    }`}
                                >
                                    {stop.date}
                                </button>
                            </li>
                        </Fragment>
                    ))}
                </motion.ol>
            </div>

            <button
                type="button"
                onClick={() => onSelect(active + 1)}
                disabled={last}
                aria-label="Next date"
                className={`${arrowButton} bottom-[69px] enabled:hover:opacity-70`}
            >
                <Image
                    src={`${JOURNEY_ASSETS}/chevron.svg`}
                    alt=""
                    width={12}
                    height={7}
                    unoptimized
                    className="h-[5px] w-[10px] rotate-180"
                />
            </button>
        </nav>
    );
};

/**
 * Phones keep the same dates as a strip across the top of the map, the current
 * one scrolled to the middle. The design for phones is still to come; this keeps
 * the page usable until it does.
 */
export const JourneyTimelineMobile = ({ stops, active, onSelect }: JourneyTimelineProps) => {
    const listRef = useRef<HTMLOListElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    useLayoutEffect(() => {
        const list = listRef.current;
        const item = itemRefs.current[active];
        if (list && item) {
            list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2, behavior: "smooth" });
        }
    }, [active]);

    return (
        <nav aria-label="Dates of the journey" className="absolute inset-x-0 top-[132px] bg-[rgba(205,140,63,0.6)]">
            <ol
                ref={listRef}
                className="flex items-center overflow-x-auto px-4 py-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {stops.map((stop, index) => (
                    <li
                        key={stop.id}
                        ref={(element) => (itemRefs.current[index] = element)}
                        className={`shrink-0 ${index > 0 ? "border-l border-white/70" : ""}`}
                    >
                        <button
                            type="button"
                            onClick={() => onSelect(index)}
                            aria-current={index === active ? "step" : undefined}
                            className={`whitespace-nowrap px-[14px] text-[12px] uppercase leading-[20px] tracking-[1.44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                index === active ? "font-bold text-white" : "font-medium text-s2s-wine"
                            }`}
                        >
                            {stop.date}
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
};
