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
    "[mask-image:linear-gradient(to_bottom,transparent_0,#000_30px,#000_calc(100%-16px),transparent_100%)]";

const arrowButton =
    "flex h-[30px] w-[30px] items-center justify-center rounded-sm transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default disabled:opacity-40";

const Chevron = ({ className }: { className: string }) => (
    <Image src={`${JOURNEY_ASSETS}/chevron.svg`} alt="" width={12} height={7} unoptimized className={className} />
);

/**
 * "restart the journey", after the last date: two lines in the band, one in the
 * phone's strip, and two again on phones too narrow for the last date beside it.
 */
const restartButton =
    "flex shrink-0 items-center justify-center rounded-[4px] border border-s2s-maroon bg-s2s-maroon text-center text-[14px] lowercase text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

/**
 * The band of dates down the left of the map, as in the design: an arrow up to the
 * date before, the current date in white capitals, the rest in red, ruled apart,
 * and an arrow down to the next. Moving on slides the list up so the current date
 * keeps the top slot, the one before it fading out under the up arrow, the way
 * Statskog's season picker scrolls. The last date is followed by a button back to
 * the first.
 *
 * The band is 517px tall in the design and ends above the call to action along the
 * map's foot; on a shorter screen it keeps the same distance from the bottom.
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
            className="absolute left-[62px] top-[217px] h-[min(517px,calc(100%-322px))] w-[198px] bg-gradient-to-b from-[rgba(205,140,63,0.6)] from-[58.589%] to-[rgba(205,140,63,0)]"
        >
            <button
                type="button"
                onClick={() => onSelect(active - 1)}
                disabled={first}
                aria-label="Previous date"
                className={`${arrowButton} absolute left-1/2 top-[34px] -translate-x-1/2 enabled:hover:opacity-70`}
            >
                <Chevron className="h-[5px] w-[10px]" />
            </button>

            <div className={`absolute inset-x-0 top-[64px] bottom-[62px] overflow-hidden ${fadeMask}`}>
                <motion.ol
                    className="relative px-5"
                    animate={{ y: offset }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.42, 0, 0.58, 1] }}
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
                    <li aria-hidden className="relative mx-auto my-[18px] h-px w-[142px]">
                        <Image src={`${JOURNEY_ASSETS}/timeline-rule.svg`} alt="" fill unoptimized />
                    </li>
                    <li className="flex justify-center">
                        <button type="button" onClick={() => onSelect(0)} className={`${restartButton} h-[51px] px-[15px] leading-[16px]`}>
                            restart the
                            <br />
                            journey
                        </button>
                    </li>
                </motion.ol>
            </div>

            <button
                type="button"
                onClick={() => onSelect(active + 1)}
                disabled={last}
                aria-label="Next date"
                className={`${arrowButton} absolute bottom-[10px] left-1/2 -translate-x-1/2 enabled:hover:opacity-70`}
            >
                <Chevron className="h-[5px] w-[10px] rotate-180" />
            </button>
        </nav>
    );
};

/** Where the current date sits on phones, from the left of the strip's window: 56px across the screen. */
const MOBILE_SLOT = 16;

const sideFadeMask =
    "[mask-image:linear-gradient(to_right,transparent_0,#000_16px,#000_calc(100%-32px),transparent_100%)]";
const leftFadeMask = "[mask-image:linear-gradient(to_right,transparent_0,#000_16px)]";

/**
 * Phones carry the dates as a strip across the top of the map, as in the design:
 * an arrow either side, the current date in white capitals in the first slot, and
 * the dates after it in red, ruled apart, running off under the fading right end.
 * Moving on scrolls the current date back to the first slot; the strip can also
 * be swiped through to pick another. It ends with the button back to the first
 * date: on the last date the next arrow gives way to it, and the strip runs on to
 * the right-hand gutter so the date and the button both fit.
 */
export const JourneyTimelineMobile = ({ stops, active, onSelect }: JourneyTimelineProps) => {
    const listRef = useRef<HTMLOListElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
    const restartRef = useRef<HTMLLIElement>(null);
    const reduceMotion = useReducedMotion();
    const last = active === stops.length - 1;

    useLayoutEffect(() => {
        const list = listRef.current;
        const item = itemRefs.current[active];
        const restart = restartRef.current;
        if (list && item && restart) {
            const slot = item.offsetLeft - MOBILE_SLOT;
            // On a narrow screen the last date gives up a little of the first slot to the button.
            const left = last ? Math.max(slot, restart.offsetLeft + restart.offsetWidth - list.clientWidth) : slot;
            list.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
        }
    }, [active, last, reduceMotion]);

    return (
        <nav
            aria-label="Dates of the journey"
            className="absolute inset-x-0 top-[133px] z-10 h-[49px] bg-gradient-to-l from-[rgba(205,140,63,0)] to-[rgba(205,140,63,0.6)] to-[40%]"
        >
            <button
                type="button"
                onClick={() => onSelect(active - 1)}
                disabled={active === 0}
                aria-label="Previous date"
                className={`${arrowButton} absolute left-[5px] top-1/2 -translate-y-1/2`}
            >
                <Chevron className="h-[5px] w-[10px] -rotate-90" />
            </button>

            <ol
                ref={listRef}
                className={`absolute inset-y-0 left-[40px] flex items-center gap-[18px] overflow-x-auto pl-[16px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    last ? `right-[16px] ${leftFadeMask}` : `right-[53px] ${sideFadeMask}`
                }`}
            >
                {stops.map((stop, index) => (
                    <Fragment key={stop.id}>
                        {index > 0 && <li aria-hidden className="h-[32px] w-px shrink-0 bg-white" />}
                        <li ref={(element) => (itemRefs.current[index] = element)} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => onSelect(index)}
                                aria-current={index === active ? "step" : undefined}
                                className={`block max-w-[152px] rounded-sm text-center text-[14px] uppercase tracking-[1.68px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                    index === active ? "font-bold leading-[24px] text-white" : "font-medium leading-[20px] text-s2s-wine"
                                }`}
                            >
                                {stop.date}
                            </button>
                        </li>
                    </Fragment>
                ))}
                <li aria-hidden className="h-[32px] w-px shrink-0 bg-white" />
                <li ref={restartRef} className="shrink-0">
                    <button
                        type="button"
                        onClick={() => onSelect(0)}
                        className={`${restartButton} h-[34px] w-[137px] whitespace-nowrap px-[10px] leading-none max-[374px]:h-[40px] max-[374px]:w-[95px] max-[374px]:whitespace-normal max-[374px]:leading-[16px]`}
                    >
                        restart the journey
                    </button>
                </li>
                {/* Keeps the button clear of the fading right end once scrolled to it. */}
                <li aria-hidden className="w-[14px] shrink-0" />
            </ol>

            {!last && (
                <button
                    type="button"
                    onClick={() => onSelect(active + 1)}
                    aria-label="Next date"
                    className={`${arrowButton} absolute right-[8px] top-1/2 -translate-y-1/2`}
                >
                    <Chevron className="h-[5px] w-[10px] rotate-90" />
                </button>
            )}
        </nav>
    );
};
