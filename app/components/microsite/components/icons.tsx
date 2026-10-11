/**
 * Inline SVGs rather than an icon package: the module needs six glyphs, and a
 * dependency for that would ship far more than it saves.
 *
 * Every icon is aria-hidden. Each one sits next to real text, or inside a button
 * that carries its own aria-label, so announcing the glyph as well would only
 * repeat what the screen reader already said.
 */

type IconProps = {
    className?: string;
};

const base = "h-4 w-4";

export const PencilIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.1 2.9a1.5 1.5 0 0 1 2.1 2.1L7.4 13.8 4 15l1.2-3.4 8.9-8.7Z" />
        <path d="M12.6 4.4 14.7 6.5" />
    </svg>
);

export const TrashIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
        <path d="M5.5 5.5 6.2 16a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-10.5" />
        <path d="M8.5 8.5v5M11.5 8.5v5" />
    </svg>
);

export const CloseIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M5 5l10 10M15 5 5 15" />
    </svg>
);

export const ChevronLeftIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
);

export const ChevronRightIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
);

export const PlusIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M10 4.5v11M4.5 10h11" />
    </svg>
);

export const MinusIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M4.5 10h11" />
    </svg>
);

/** Purely decorative motion, so it is hidden from assistive tech like the rest. */
export const SpinnerIcon = ({ className = base }: IconProps) => (
    <svg className={`${className} animate-spin`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
        <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

/* -------------------------------------------------- status glyphs (toasts) -- */

export const CheckCircleIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="m6.5 10.2 2.4 2.4 4.6-5" />
    </svg>
);

export const WarningCircleIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 6.2v4.4" />
        <path d="M10 13.6h.01" />
    </svg>
);

export const InfoCircleIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 9.2v4.6" />
        <path d="M10 6.4h.01" />
    </svg>
);

/** Empty states: a box with nothing in it. */
export const InboxIcon = ({ className = base }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 13.5h4l1.2 2.2h6.6l1.2-2.2h4" />
        <path d="M5.4 5.5h13.2l1.9 8v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4l1.9-8Z" />
    </svg>
);
