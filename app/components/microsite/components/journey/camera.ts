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

/**
 * The camera's course for a date with travel lines: from where it stands, along
 * the lines, to where the card will hang, smoothed so the hand-drawn wiggles of a
 * line never shake the map. `at(f)` is the point a fraction f of the way along it;
 * `length` is in map units.
 */
export const smoothTrack = (from: Point, line: Point[], to: Point) => {
    const resample = (points: Point[], count: number) => {
        const lengths = [0];
        for (let i = 1; i < points.length; i++) {
            lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
        }
        const total = lengths[lengths.length - 1];
        const at = (distance: number): Point => {
            let i = 1;
            while (i < lengths.length - 1 && lengths[i] < distance) {
                i++;
            }
            const span = lengths[i] - lengths[i - 1] || 1;
            const t = clamp((distance - lengths[i - 1]) / span, 0, 1);
            return {
                x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
                y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
            };
        };
        return { total, at, points: Array.from({ length: count + 1 }, (_, i) => at((total * i) / count)) };
    };

    const SAMPLES = 160;
    const raw = resample([from, ...line, to], SAMPLES);
    if (raw.total < 1e-6) {
        return { at: () => from, length: 0 };
    }

    // A Gaussian blur along the course, a fifth of its length wide. Past either end
    // the course is mirrored through the end point, so the ends keep their heading.
    const even = raw.points;
    const sigma = SAMPLES * 0.1;
    const reach = Math.ceil(sigma * 3);
    const pointAt = (j: number): Point => {
        if (j < 0) {
            return { x: 2 * even[0].x - even[-j].x, y: 2 * even[0].y - even[-j].y };
        }
        if (j > SAMPLES) {
            const m = 2 * SAMPLES - j;
            return { x: 2 * even[SAMPLES].x - even[m].x, y: 2 * even[SAMPLES].y - even[m].y };
        }
        return even[j];
    };
    const blurred = even.map((_, i) => {
        let x = 0;
        let y = 0;
        let weights = 0;
        for (let j = i - reach; j <= i + reach; j++) {
            const w = Math.exp(-((j - i) ** 2) / (2 * sigma * sigma));
            const p = pointAt(Math.min(Math.max(j, -SAMPLES), 2 * SAMPLES));
            x += p.x * w;
            y += p.y * w;
            weights += w;
        }
        return { x: x / weights, y: y / weights };
    });
    // Pinned to start exactly where the camera is and end exactly where the card hangs.
    const first = { x: even[0].x - blurred[0].x, y: even[0].y - blurred[0].y };
    const last = { x: even[SAMPLES].x - blurred[SAMPLES].x, y: even[SAMPLES].y - blurred[SAMPLES].y };
    const pinned = blurred.map((p, i) => {
        const u = i / SAMPLES;
        return { x: p.x + first.x * (1 - u) + last.x * u, y: p.y + first.y * (1 - u) + last.y * u };
    });

    const track = resample(pinned, SAMPLES);
    return { at: (f: number) => track.at(clamp(f, 0, 1) * track.total), length: track.total };
};

/**
 * A line's path data (an absolute M, then relative curves) with its ends moved
 * exactly onto `start` and `end`, carrying the neighbouring control points along
 * so the line keeps its shape. Either end may be left where it is.
 */
export const attachEnds = (d: string, start?: Point, end?: Point) => {
    const [move, curves] = d.slice(1).split("c");
    const [x0, y0] = move.split(",").map(Number);
    const values = (curves.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);

    // To absolute cubic segments: [from, control 1, control 2, to].
    const segments: Point[][] = [];
    let current = { x: x0, y: y0 };
    for (let i = 0; i + 5 < values.length; i += 6) {
        const at = (dx: number, dy: number) => ({ x: current.x + dx, y: current.y + dy });
        const segment = [current, at(values[i], values[i + 1]), at(values[i + 2], values[i + 3]), at(values[i + 4], values[i + 5])];
        segments.push(segment);
        current = segment[3];
    }
    if (!segments.length) {
        return d;
    }
    const shift = (point: Point, by: Point) => ({ x: point.x + by.x, y: point.y + by.y });
    if (start) {
        const first = segments[0];
        const by = { x: start.x - first[0].x, y: start.y - first[0].y };
        segments[0] = [start, shift(first[1], by), first[2], first[3]];
    }
    if (end) {
        const last = segments[segments.length - 1];
        const by = { x: end.x - last[3].x, y: end.y - last[3].y };
        segments[segments.length - 1] = [last[0], last[1], shift(last[2], by), end];
    }

    const round = (value: number) => Math.round(value * 100) / 100;
    const relative = segments.flatMap(([from, c1, c2, to]) =>
        [c1, c2, to].flatMap((point) => [round(point.x - from.x), round(point.y - from.y)])
    );
    return `M${round(segments[0][0].x)},${round(segments[0][0].y)}c${relative.join(",")}`;
};
