import Image from "next/image";
import { S2S_ASSETS } from "../../data/home";

type DecorationProps = {
  /** File name inside the Sarong to Sari asset folder. */
  file: string;
  width: number;
  height: number;
  /** Placement, e.g. `left-[25px] top-[617px]`. */
  className: string;
  /** `desktop` shows it from `lg` up; `mobile` is a phone layout's own copy, hidden from `lg`. */
  on?: "desktop" | "mobile";
};

/**
 * A purely ornamental motif from the design, pinned in place. Most sit in the
 * desktop margins and are hidden below `lg`, where the sections stack; the few the
 * mobile design keeps are placed separately with `on="mobile"`.
 */
const Decoration = ({ file, width, height, className, on = "desktop" }: DecorationProps) => (
  <Image
    src={`${S2S_ASSETS}/${file}`}
    alt=""
    aria-hidden
    width={width}
    height={height}
    unoptimized
    style={{ width, height }}
    className={`pointer-events-none absolute max-w-none ${on === "desktop" ? "hidden lg:block" : "lg:hidden"} ${className}`}
  />
);

export default Decoration;
