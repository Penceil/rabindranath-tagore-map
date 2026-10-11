"use client";

import { useId } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type BezierDefinition, type Variants } from "framer-motion";
import { MinusIcon, PlusIcon } from "../icons";
import type { JourneyImage, JourneyStop } from "../../data/journey";

/** The design's three card widths: for a lot to say, some, and a line or two. */
export const CARD_WIDTH: Record<JourneyStop["size"], number> = { large: 468, medium: 371, small: 273 };

/** How far a photograph hangs over its card: 43px across the right edge, 38px above the top. */
export const IMAGE_OVERLAP = { x: 43, y: 38 };

/** The read-more card's width in the design, before it is fitted to the screen. */
export const MORE_WIDTH = 708;

/** The space between a card and the read-more card under it, kept the same everywhere. */
export const MORE_GAP = 16;

const shadow = "shadow-[0px_4px_10px_0px_rgba(0,0,0,0.1)]";

/**
 * The card's entrance, timed as Statskog's map popup: the whole fades in, the
 * photograph grows from 60%, the panel unrolls from the dot's side, and the text
 * rises into place once the panel is nearly open. Leaving, everything folds away
 * in a fifth of a second.
 */
const SWEEP: BezierDefinition = [0.77, 0, 0.175, 1];
const CSS_EASE: BezierDefinition = [0.25, 0.1, 0.25, 1];

export const cardVariants: Variants = {
    hidden: { opacity: 0, transition: { duration: 0.2 } },
    shown: { opacity: 1, transition: { duration: 0.4 } },
};

const panelVariants: Variants = {
    hidden: { scaleX: 0, transition: { duration: 0.2, ease: SWEEP } },
    shown: { scaleX: 1, transition: { duration: 0.56, ease: SWEEP, delay: 0.15 } },
};

const photoVariants: Variants = {
    hidden: { scale: 0.6, transition: { duration: 0.2 } },
    shown: { scale: 1, transition: { duration: 0.6, ease: CSS_EASE, delay: 0.1 } },
};

const textVariants: Variants = {
    hidden: { opacity: 0, y: 5, transition: { duration: 0.15 } },
    shown: {
        opacity: 1,
        y: 0,
        transition: { opacity: { duration: 0.4, delay: 0.65 }, y: { duration: 0.5, ease: CSS_EASE, delay: 0.6 } },
    },
};

/** The read-more card unrolls the same way, without waiting for anything else. */
const morePanelVariants: Variants = {
    hidden: { scaleX: 0, transition: { duration: 0.2, ease: SWEEP } },
    shown: { scaleX: 1, transition: { duration: 0.5, ease: SWEEP } },
};

const moreTextVariants: Variants = {
    hidden: { opacity: 0, y: 5, transition: { duration: 0.1 } },
    shown: {
        opacity: 1,
        y: 0,
        transition: { opacity: { duration: 0.4, delay: 0.4 }, y: { duration: 0.5, ease: CSS_EASE, delay: 0.35 } },
    },
};

const CardImage = ({ image, left }: { image: JourneyImage; left: number }) => (
    <motion.div
        variants={photoVariants}
        className={`absolute overflow-hidden bg-[#e6e1de] max-lg:hidden ${shadow}`}
        style={{ left, top: -IMAGE_OVERLAP.y, width: image.width, height: 180 }}
    >
        {/* The crop box keeps the picture's own proportions, so covering it reproduces the Figma crop. */}
        <div
            className="absolute"
            style={{ width: image.crop.width, height: image.crop.height, left: image.crop.left, top: image.crop.top }}
        >
            <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={`${Math.ceil((image.width * parseFloat(image.crop.width)) / 100)}px`}
                className="object-cover"
            />
        </div>
    </motion.div>
);

type JourneyCardProps = {
    stop: JourneyStop;
    open: boolean;
    onToggle: () => void;
    /** The read-more card's width once fitted to the space beside the dot. */
    moreWidth: number;
    /** False on phones, where the card is a sheet and takes the screen's width. */
    fixedWidth: boolean;
};

/**
 * One stop: date, place and summary, with its photograph overhanging the top
 * right corner. "Read more" opens a second card underneath on the same left edge,
 * rather than stretching this one, since some of the longer notes would otherwise
 * run off the screen.
 *
 * The card animates through the "hidden" and "shown" variants of whatever
 * motion element it is placed in; see `cardVariants`.
 */
const JourneyCard = ({ stop, open, onToggle, moreWidth, fixedWidth }: JourneyCardProps) => {
    const moreId = useId();
    const width = CARD_WIDTH[stop.size];

    return (
        <div className="relative" style={fixedWidth ? { width } : undefined}>
            <motion.article
                variants={panelVariants}
                style={{ originX: 0 }}
                className={`bg-white/95 py-[30px] pl-[30px] pr-[60px] max-lg:p-5 ${shadow}`}
            >
                <motion.div variants={textVariants} className="flex flex-col gap-[5px]">
                    <h2 className="font-Bodoni text-[21px] font-normal italic leading-[36px] text-s2s-wine">{stop.date}</h2>
                    <p className="text-[15px] uppercase leading-[18px] tracking-[1.8px] text-s2s-gray opacity-70">{stop.place}</p>
                    <p className="text-[16px] leading-[26px] text-s2s-ink">{stop.summary}</p>
                    {stop.more && (
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-expanded={open}
                            aria-controls={moreId}
                            className="flex h-[25px] w-fit items-center gap-[2px] rounded-sm text-[15px] lowercase leading-[24.8px] text-s2s-gold transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-s2s-gold"
                        >
                            {open ? "read less" : "read more"}
                            {open ? <MinusIcon className="h-[21px] w-[21px]" /> : <PlusIcon className="h-[21px] w-[21px]" />}
                        </button>
                    )}
                </motion.div>
            </motion.article>

            {stop.image && <CardImage image={stop.image} left={width - IMAGE_OVERLAP.x} />}

            <AnimatePresence initial={false}>
                {open && stop.more && (
                    <motion.div
                        key="more"
                        id={moreId}
                        variants={morePanelVariants}
                        initial="hidden"
                        animate="shown"
                        exit="hidden"
                        className={`bg-white/95 p-[30px] text-[16px] leading-[28px] text-s2s-ink max-lg:p-5 ${shadow}`}
                        style={{ originX: 0, marginTop: MORE_GAP, width: fixedWidth ? moreWidth : undefined }}
                    >
                        <motion.p variants={moreTextVariants}>{stop.more}</motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JourneyCard;
