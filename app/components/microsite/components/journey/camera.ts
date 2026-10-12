/**
 * Camera maths for the journey map. Everything is in the map's own units (the
 * 3088 × 1756 viewBox of the designer's SVG) until `toTransform` turns a view into
 * the translate and scale the map layer is drawn with.
 */

export const MAP = { width: 3088.13, height: 1756.28 };

/** Where the source SVG placed its raster: at (0.3, 0.34), 0.24 units to a pixel. */
export const MAP_IMAGE = { left: 0.3, top: 0.34, width: 3086.88, height: 1755.12 };

/** The full-resolution crop that sharpens the close views, Penang to Bali. */
export const MAP_DETAIL = { left: 1419.66, top: 860.02, width: 499.92, height: 459.84 };

/**
 * The map units the Figma frame shows across its 1440 × 908 map area, at the
 * zoom of the first stop. Every other zoom is a multiple of this one.
 */
const FRAME_VIEW = { width: 1651, height: 1041 };

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
/** Where the camera looks and how close. */
export type View = { focus: Point; zoom: number };
/** The map layer's translate (screen px) and scale (px per map unit). */
export type Transform = { x: number; y: number; k: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Pixels per map unit at zoom 1: the Figma framing, kept as the screen changes shape. */
export const baseScale = (viewport: Size) =>
    Math.max(viewport.width / FRAME_VIEW.width, viewport.height / FRAME_VIEW.height);

/**
 * The transform that puts `view.focus` on `anchor`. It is then held inside the
 * map's edges, so a stop near the border shifts its dot rather than show past the
 * end of the picture.
 */
export const toTransform = (view: View, viewport: Size, anchor: Point): Transform => {
    const cover = Math.max(viewport.width / MAP_IMAGE.width, viewport.height / MAP_IMAGE.height);
    const k = Math.max(baseScale(viewport) * view.zoom, cover);
    const right = (MAP_IMAGE.left + MAP_IMAGE.width) * k;
    const bottom = (MAP_IMAGE.top + MAP_IMAGE.height) * k;

    return {
        x: clamp(anchor.x - view.focus.x * k, viewport.width - right, -MAP_IMAGE.left * k),
        y: clamp(anchor.y - view.focus.y * k, viewport.height - bottom, -MAP_IMAGE.top * k),
        k,
    };
};

/**
 * How much a long flight pulls back to show where it is going: the curvature of
 * the path below. Lower is flatter; d3's default is √2.
 */
const RHO = 1.2;

/**
 * A flight from one view to another along van Wijk and Nuij's "smooth and
 * efficient zooming and panning" path, the curve d3-zoom and map libraries fly
 * along. Panning and zooming are one motion rather than two: the camera keeps an
 * even perceived speed and eases back only as far as the distance needs, so a
 * hop reads as a soft glide across the map.
 *
 * `at(t)` gives the view for t from 0 to 1; `duration` is in seconds.
 */
export const flightPath = (from: View, to: View, viewport: Size) => {
    // The path works in the width of map the screen shows, rather than in zoom.
    const toWidth = (zoom: number) => viewport.width / (baseScale(viewport) * zoom);
    const toZoom = (width: number) => viewport.width / (baseScale(viewport) * width);
    const w0 = toWidth(from.zoom);
    const w1 = toWidth(to.zoom);
    const dx = to.focus.x - from.focus.x;
    const dy = to.focus.y - from.focus.y;
    const d2 = dx * dx + dy * dy;
    const rho2 = RHO * RHO;

    let length: number;
    let at: (t: number) => View;

    if (d2 < 1e-12) {
        // Zooming on the spot.
        length = Math.log(w1 / w0) / RHO;
        at = (t) => ({ focus: from.focus, zoom: toZoom(w0 * Math.exp(RHO * t * length)) });
    } else {
        const d1 = Math.sqrt(d2);
        const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * d2) / (2 * w0 * rho2 * d1);
        const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * d2) / (2 * w1 * rho2 * d1);
        const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
        const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
        length = (r1 - r0) / RHO;
        at = (t) => {
            const s = t * length;
            const u = (w0 / (rho2 * d1)) * (Math.cosh(r0) * Math.tanh(RHO * s + r0) - Math.sinh(r0));
            return {
                focus: { x: from.focus.x + u * dx, y: from.focus.y + u * dy },
                zoom: toZoom((w0 * Math.cosh(r0)) / Math.cosh(RHO * s + r0)),
            };
        };
    }

    // Seconds: about one for the shortest hops, two for crossing the map. With
    // nowhere to go (the next date at the same place) it is only the pause while
    // the card changes.
    const span = Math.abs(length);
    const duration = span < 0.005 ? 0.5 : clamp(0.95 + span * 1.4, 1, 2.2);

    return { at, duration };
};

/**
 * How far the dots of a many-anecdote place have fanned out: gathered into one
 * dot in the overview, fully spread once the camera is close.
 */
export const clusterSpread = (k: number, base: number) => clamp((k / base - 2.2) / 1, 0, 1);

/**
 * Where the dots of one place sit around it (screen px, before spreading), in
 * date order. They never move. Each layout is scattered by hand so it reads like
 * places on a map rather than a grid, while staying:
 * - no more than 15px from side to side, so a card hung the standard distance
 *   from any of its dots (23.5px to the right) still clears the rest;
 * - at least 12px between any two dots, so none overlap.
 */
const SCATTER: Record<number, Point[]> = {
    1: [{ x: 0, y: 0 }],
    2: [
        { x: -2, y: -7 },
        { x: 3, y: 6 },
    ],
    3: [
        { x: 2, y: -8 },
        { x: -6, y: 2 },
        { x: 6, y: 7 },
    ],
    4: [
        { x: -4, y: -11 },
        { x: 6, y: -4 },
        { x: -7, y: 3 },
        { x: 3, y: 10 },
    ],
    6: [
        { x: -3, y: -17 },
        { x: 7, y: -9 },
        { x: -6, y: -4 },
        { x: 5, y: 4 },
        { x: -8, y: 9 },
        { x: 2, y: 18 },
    ],
};

export const clusterLayout = (count: number): Point[] =>
    SCATTER[count] ??
    // Any other number of dates zigzags down in the same loose way.
    Array.from({ length: count }, (_, index) => ({
        x: (index % 2 === 0 ? -6 : 6) + ((index * 7) % 5) - 2,
        y: (index - (count - 1) / 2) * 8.5,
    }));

/** Scales and moves a route's path data (an absolute M, then relative curves) onto the screen. */
export const routeToScreen = (d: string, transform: Transform) => {
    const [move, curves] = d.slice(1).split("c");
    const [x, y] = move.split(",").map(Number);
    const relative = (curves.match(/-?\d*\.?\d+/g) ?? []).map((value) => Number(value) * transform.k);

    return `M${x * transform.k + transform.x},${y * transform.k + transform.y}c${relative.join(",")}`;
};
