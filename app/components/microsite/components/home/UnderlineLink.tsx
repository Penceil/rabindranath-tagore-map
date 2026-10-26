import Image from "next/image";
import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { S2S_ASSETS } from "../../data/home";

type UnderlineLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  /** `compact` hugs its label ("back to top"); the default is the 132px call to action. */
  variant?: "default" | "compact";
  /** `light` is the white version set over the journey map, a size larger. */
  tone?: "maroon" | "light";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

// On hover (or keyboard focus) the label turns to Bodoni italic and gaps start
// running along the underline, as in the design's hover prototype. The gaps are a
// moving mask over the same drawn line, and they stay still for anyone who has
// asked their system for reduced motion.
const activeLabel =
  "group-hover:font-Bodoni group-hover:text-[16px] group-hover:font-normal group-hover:italic "
  + "group-focus-visible:font-Bodoni group-focus-visible:text-[16px] group-focus-visible:font-normal group-focus-visible:italic";

export const stitchMask =
  "group-hover:[mask-image:linear-gradient(90deg,#000_54px,transparent_54px)] group-hover:[mask-size:64px_100%] "
  + "group-focus-visible:[mask-image:linear-gradient(90deg,#000_54px,transparent_54px)] group-focus-visible:[mask-size:64px_100%] "
  + "motion-safe:group-hover:animate-stitch motion-safe:group-focus-visible:animate-stitch";

/** The maroon lowercase link with a hand-drawn underline, used for every call to action. */
const UnderlineLink = ({ href, children, className = "", variant = "default", tone = "maroon", onClick }: UnderlineLinkProps) => {
  const compact = variant === "compact";
  const light = tone === "light";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative inline-block shrink-0 focus:outline-none ${compact ? "pb-[6px]" : "h-[27px] w-[132px]"} ${className}`}
    >
      <span
        className={`block whitespace-nowrap font-medium lowercase leading-[15px] ${
          light ? "text-[16px] text-white/95" : "text-[15px] text-s2s-maroon"
        } ${activeLabel} ${
          compact ? "" : "pl-[8px]"
        }`}
      >
        {children}
      </span>
      {/* The drawn line stretches to the label, so it fills a sized box rather than
          fixing its own width and height. */}
      <span
        aria-hidden
        className={`absolute h-[4px] ${stitchMask} ${
          compact ? "bottom-0 left-0 w-full" : "left-[3.3px] top-[19.5px] w-[calc(100%-3.3px)]"
        }`}
      >
        <Image src={`${S2S_ASSETS}/${light ? "link-underline-light.svg" : "link-underline.svg"}`} alt="" fill unoptimized />
      </span>
    </Link>
  );
};

export default UnderlineLink;
