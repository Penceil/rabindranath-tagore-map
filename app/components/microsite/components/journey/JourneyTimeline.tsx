"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
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

/** The phone's date rolls up out of the pill going forward, and back down going back. */
const pillVariants: Variants = {
    enter: (direction: number) => ({ y: 24 * direction, opacity: 0 }),
    shown: { y: 0, opacity: 1 },
    leave: (direction: number) => ({ y: -24 * direction, opacity: 0 }),
};

/**
 * Phones show one date at a time, as in the design: a pill along the left edge
 * under the title, the current date in white capitals between an arrow back and
 * an arrow on, each left out at its end of the journey. On the last date the pill
 * offers the button back to the first in its place. Dates too long for two lines
 * (the Jogjakarta stays) make the pill a little taller rather than shrink.
 */
export const JourneyTimelineMobile = ({ stops, active, onSelect }: JourneyTimelineProps) => {
    const reduceMotion = useReducedMotion();
    // Which way the dates roll, kept in step with `active` as it changes.
    const [step, setStep] = useState({ at: active, direction: 1 });
    if (step.at !== active) {
        setStep({ at: active, direction: active > step.at ? 1 : -1 });
    }
    const first = active === 0;
    const last = active === stops.length - 1;

    return (
        <nav
            aria-label="Dates of the journey"
            className="absolute left-0 top-[104px] z-10 flex min-h-[49px] w-[218px] items-center overflow-hidden rounded-r-[5px] bg-[rgba(205,140,63,0.5)]"
        >
            {!first && (
                <button
                    type="button"
                    onClick={() => onSelect(active - 1)}
                    aria-label="Previous date"
                    className={`${arrowButton} absolute left-[5px] top-1/2 -translate-y-1/2`}
                >
                    <Chevron className="h-[5px] w-[10px] -rotate-90" />
                </button>
            )}

            <div className="ml-[30px] grid w-[158px] place-items-center py-[4px]">
                <AnimatePresence initial={false} custom={step.direction}>
                    <motion.div
                        key={last ? "restart" : stops[active].id}
                        custom={step.direction}
                        variants={pillVariants}
                        initial="enter"
                        animate="shown"
                        exit="leave"
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.42, 0, 0.58, 1] }}
                        className="[grid-area:1/1]"
                    >
                        {last ? (
                            <button
                                type="button"
                                onClick={() => onSelect(0)}
                                className={`${restartButton} h-[34px] w-[137px] whitespace-nowrap px-[10px] leading-none`}
                            >
                                restart the journey
                            </button>
                        ) : (
                            <p className="w-[158px] text-center text-[14px] font-bold uppercase leading-[20px] tracking-[1.68px] text-white [text-wrap:balance]">
                                {stops[active].date}
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {!last && (
                <button
                    type="button"
                    onClick={() => onSelect(active + 1)}
                    aria-label="Next date"
                    className={`${arrowButton} absolute right-[4px] top-1/2 -translate-y-1/2`}
                >
                    <Chevron className="h-[5px] w-[10px] rotate-90" />
                </button>
            )}
        </nav>
    );
};
