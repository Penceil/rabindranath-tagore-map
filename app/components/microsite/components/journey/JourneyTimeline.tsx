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

/** "restart the journey", after the last date: two lines in the band, one in the phone's pill. */
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

/** The pill's height, and the width each date has in it. */
const PILL_HEIGHT = 49;
const PILL_SLOT = 158;

/**
 * One ease for the strip, the pill's height and the arrows, so they move as one.
 * Under `motion-safe` like the transitions themselves, which would otherwise bring
 * Tailwind's 150ms default back with them.
 */
const pillMotion = "motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.65,0,0.35,1)]";

const pillArrow = (hidden: boolean) =>
    `${arrowButton} absolute top-1/2 -translate-y-1/2 transition-opacity ${pillMotion} ${hidden ? "pointer-events-none opacity-0" : ""}`;

/**
 * Phones show one date at a time, as in the design: a pill along the left edge
 * under the title, the current date in white capitals between an arrow back and
 * an arrow on, each fading out at its end of the journey. On the last date the
 * pill offers the button back to the first in its place.
 *
 * The dates sit side by side on a strip that slides the way the arrows point. It
 * moves by a CSS transition, which the browser runs off the main thread, so it
 * stays smooth while the map flies to the date at the same moment; a quick run of
 * dates while scrolling simply carries the strip on. Dates too long for two lines
 * (the Jogjakarta stays) ease the pill a little taller rather than shrink.
 */
export const JourneyTimelineMobile = ({ stops, active, onSelect }: JourneyTimelineProps) => {
    const cellRefs = useRef<(HTMLLIElement | null)[]>([]);
    const [height, setHeight] = useState(PILL_HEIGHT);
    const first = active === 0;
    const last = active === stops.length - 1;

    useLayoutEffect(() => {
        const content = cellRefs.current[active]?.firstElementChild as HTMLElement | null | undefined;
        setHeight(Math.max(PILL_HEIGHT, (content?.offsetHeight ?? 0) + 8));
    }, [active]);

    return (
        <nav
            aria-label="Dates of the journey"
            className={`absolute left-0 top-[104px] z-10 w-[218px] overflow-hidden rounded-r-[5px] bg-[rgba(205,140,63,0.5)] motion-safe:transition-[height] ${pillMotion}`}
            style={{ height }}
        >
            <button
                type="button"
                onClick={() => onSelect(active - 1)}
                aria-label="Previous date"
                aria-hidden={first || undefined}
                tabIndex={first ? -1 : undefined}
                className={`${pillArrow(first)} left-[5px]`}
            >
                <Chevron className="h-[5px] w-[10px] -rotate-90" />
            </button>

            {/* Clipped, so the dates either side never show past the arrows. */}
            <div className="absolute inset-y-0 left-[30px] overflow-hidden" style={{ width: PILL_SLOT }}>
                <ol
                    className={`flex h-full motion-safe:transition-transform ${pillMotion}`}
                    style={{ transform: `translateX(${-active * PILL_SLOT}px)` }}
                >
                    {stops.map((stop, index) => (
                        <li
                            key={stop.id}
                            ref={(element) => (cellRefs.current[index] = element)}
                            aria-hidden={index !== active || undefined}
                            className="flex shrink-0 items-center justify-center"
                            style={{ width: PILL_SLOT }}
                        >
                            {index === stops.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => onSelect(0)}
                                    tabIndex={last ? undefined : -1}
                                    className={`${restartButton} h-[34px] w-[137px] whitespace-nowrap px-[10px] leading-none`}
                                >
                                    restart the journey
                                </button>
                            ) : (
                                <p className="w-full text-center text-[14px] font-bold uppercase leading-[20px] tracking-[1.68px] text-white [text-wrap:balance]">
                                    {stop.date}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            </div>

            <button
                type="button"
                onClick={() => onSelect(active + 1)}
                aria-label="Next date"
                aria-hidden={last || undefined}
                tabIndex={last ? -1 : undefined}
                className={`${pillArrow(last)} right-[4px]`}
            >
                <Chevron className="h-[5px] w-[10px] rotate-90" />
            </button>
        </nav>
    );
};
