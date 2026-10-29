import { S2S_ASSETS } from "./home";

/**
 * Content for "The Journey": Tagore's 1927 voyage to Java and Bali, one stop per
 * date, copied from the Figma file's "Key Moment + Anecdotes" frame.
 *
 * Positions are in the map's own units, the 3088 × 1756 viewBox of the SVG the
 * designer exported ("The Journey 2.svg"). The places the designer marked keep the
 * exact coordinates of her dots; the Bali villages, which she left as "a few
 * series of dots", are placed from their latitude and longitude with the same
 * projection her dots follow (x = 25.457 × lon − 1057.2, y = −25.617 × lat + 1072.8).
 */

export const JOURNEY_ASSETS = `${S2S_ASSETS}/journey`;

export type JourneyPlaceId =
    | "calcutta"
    | "madras"
    | "singapore"
    | "malaya"
    | "penang"
    | "belawan"
    | "medan"
    | "batavia"
    | "bandung"
    | "borobudur"
    | "jogjakarta"
    | "prambanan"
    | "surakarta"
    | "surabaya"
    | "buleleng"
    | "denpasar"
    | "bangli"
    | "karangasem"
    | "tampaksiring"
    | "gianyar"
    | "ubud"
    | "mundu"
    | "atSea"
    | "siam";

export type JourneyPlace = {
    name: string;
    x: number;
    y: number;
    /**
     * How large its dot is drawn, as Statskog varies its own: the places the
     * journey turns on are large, passing ones small (never so small they vanish).
     */
    size: "large" | "medium" | "small";
    /** Hidden until the stop with this id has been reached: the Bali villages. */
    revealedBy?: string;
};

export const journeyPlaces: Record<JourneyPlaceId, JourneyPlace> = {
    calcutta: { name: "Calcutta", x: 1195.17, y: 495.51, size: "large" },
    madras: { name: "Madras", x: 992.52, y: 741.8, size: "medium" },
    singapore: { name: "Singapore", x: 1582.21, y: 1038.47, size: "large" },
    // Not one of the designer's dots: Kuala Lumpur, so the Malayan stay has a place of its own.
    malaya: { name: "Malaya", x: 1531.5, y: 992.4, size: "medium" },
    penang: { name: "Penang", x: 1487.92, y: 907.91, size: "medium" },
    belawan: { name: "Belawan", x: 1450.31, y: 976.65, size: "medium" },
    medan: { name: "Medan", x: 1450.31, y: 988.39, size: "small" },
    batavia: { name: "Batavia", x: 1652.77, y: 1227.73, size: "large" },
    bandung: { name: "Bandung", x: 1684.04, y: 1250.68, size: "medium" },
    borobudur: { name: "Borobudur", x: 1746.39, y: 1267.09, size: "small" },
    jogjakarta: { name: "Jogjakarta", x: 1752.74, y: 1273.78, size: "large" },
    prambanan: { name: "Prambanan", x: 1761, y: 1269.9, size: "small" },
    surakarta: { name: "Surakarta", x: 1766.92, y: 1263.89, size: "large" },
    surabaya: { name: "Surabaya", x: 1814.05, y: 1260.82, size: "medium" },
    buleleng: { name: "Buleleng", x: 1874.11, y: 1280.73, size: "large" },
    denpasar: { name: "Den Pasar", x: 1875.91, y: 1293.26, size: "medium" },
    bangli: { name: "Bangli", x: 1879.39, y: 1289.37, size: "small", revealedBy: "bali-tour" },
    karangasem: { name: "Karang Asem", x: 1885.88, y: 1289.26, size: "small", revealedBy: "bali-tour" },
    tampaksiring: { name: "Tampak Siring", x: 1878.25, y: 1288.37, size: "small", revealedBy: "bali-tour" },
    gianyar: { name: "Gianyar", x: 1878.76, y: 1291.57, size: "small", revealedBy: "bali-tour" },
    ubud: { name: "Ubud", x: 1876.97, y: 1290.72, size: "small", revealedBy: "bali-tour" },
    mundu: { name: "Mundu", x: 1872.14, y: 1284.4, size: "small", revealedBy: "bali-tour" },
    atSea: { name: "At sea (ship Mijer)", x: 1572.87, y: 921.64, size: "small" },
    siam: { name: "Siam", x: 1504.15, y: 727.18, size: "medium" },
};

/** Every leg of the journey, in the order it was travelled. */
export type JourneyRouteId =
    | "calcutta-madras"
    | "madras-singapore"
    | "singapore-malaya"
    | "malaya-penang"
    | "penang-belawan"
    | "belawan-medan"
    | "belawan-batavia"
    | "batavia-buleleng"
    | "bali-surabaya"
    | "surabaya-surakarta"
    | "surakarta-jogjakarta"
    | "jogjakarta-prambanan"
    | "jogjakarta-borobudur"
    | "borobudur-bandung"
    | "bandung-batavia"
    | "batavia-singapore"
    | "singapore-at-sea"
    | "at-sea-siam";

export type JourneyRoute = {
    /** By sea, drawn in the map's dark red; overland, drawn in white. */
    kind: "sea" | "land";
    /**
     * The places the leg joins. Its ends are drawn onto their dots exactly, since the
     * designer's lines stop a little short of some.
     */
    from?: JourneyPlaceId;
    to?: JourneyPlaceId;
    /** Path data in map units: an absolute M, then relative curves. */
    d: string;
};

/**
 * The dotted lines joining every place, taken from the designer's SVG ("The
 * Journey 2.svg"), plus the overland stretch from Singapore up through Malaya to
 * Penang, which her map leaves out, drawn in the same manner. Where she drew two legs as one line (Madras to Singapore and on
 * to Siam; Buleleng to Batavia and on to Singapore) it is cut at the stop between,
 * and lines she drew against the direction of travel are reversed, so each draws
 * from where Tagore set out to where he arrived.
 */
export const journeyRoutes: Record<JourneyRouteId, JourneyRoute> = {
    "calcutta-madras": {
        kind: "land",
        from: "calcutta",
        to: "madras",
        d: "M1193.96,495.51c-22.5,1.63,-28.66,4.82,-29.1,7.86,-0.24,1.62,1.23,3.43,0.35,6.34,-0.62,2.07,-2.22,3.86,-5.02,6.1,-5.19,4.15,-7.26,16.6,-13.49,20.23,-6.22,3.63,-40.98,38.91,-46.17,50.84,-5.19,11.93,-19.71,15.56,-21.27,17.12,-1.56,1.56,-28.53,36.83,-57.06,38.91,-28.53,2.07,-20.23,16.08,-22.82,21.27,-8.64,17.28,-17.22,24.88,-20.75,40.46,-1.72,7.61,-0.78,19,11.41,35.27",
    },
    "madras-singapore": {
        kind: "sea",
        from: "madras",
        to: "singapore",
        d: "M993.29,742.93c10.62,10.31,27.8,24.84,51.93,36.39,25.17,12.05,45.98,15.16,81.21,20.67,41.96,6.56,87.65,13.9,99.07,15.85,46,7.85,140.07,23.91,204.47,89.56,37.96,38.69,67.36,76.87,67.36,76.87,14.04,18.23,31.96,43.21,64.19,53.1,8.15,2.5,15.37,3.47,20.67,3.86",
    },
    "singapore-malaya": {
        kind: "land",
        from: "singapore",
        to: "malaya",
        d: "M1582.21,1038.47c-1.41,-1.46,-5.23,-6.1,-8.47,-8.78,-3.24,-2.69,-7.62,-4.51,-10.95,-7.35,-3.33,-2.83,-5.86,-6.72,-9.04,-9.65,-3.18,-2.93,-7.35,-5.24,-10.02,-7.91,-2.67,-2.67,-3.95,-6.04,-5.99,-8.1,-2.04,-2.06,-5.19,-3.57,-6.23,-4.28",
    },
    "malaya-penang": {
        kind: "land",
        from: "malaya",
        to: "penang",
        d: "M1531.5,992.4c-0.5,-1.72,-1.4,-7,-2.98,-10.32,-1.59,-3.33,-5.03,-6.14,-6.53,-9.64,-1.5,-3.5,-0.9,-7.7,-2.48,-11.37,-1.58,-3.67,-5.44,-6.88,-7.02,-10.64,-1.58,-3.75,-0.82,-8.14,-2.48,-11.87,-1.66,-3.74,-5.54,-6.84,-7.48,-10.54,-1.94,-3.71,-1.73,-8.34,-4.16,-11.69,-2.43,-3.35,-8.7,-7,-10.44,-8.41",
    },
    "penang-belawan": {
        kind: "sea",
        from: "penang",
        to: "belawan",
        d: "M1489.19,909.71c9.54,12.84,-10.94,37.52,-36.68,65.69",
    },
    "belawan-medan": {
        kind: "land",
        from: "belawan",
        to: "medan",
        d: "M1450.31,977.23c0,0,1.08,8.78,0,11.15",
    },
    // Back to Belawan's harbour and by sea to Java, down the Strait of Malacca and
    // past Singapore's islands, as in the designer's third map ("The Journey with
    // Details 3.jpg", traced from the raster since it came without an SVG).
    "belawan-batavia": {
        kind: "sea",
        from: "belawan",
        to: "batavia",
        d: "M1450.31,976.65c2.41,-1.05,4.69,-2.45,7.22,-3.14,1.88,-0.51,3.89,-0.56,5.84,-0.41,1.96,0.16,3.91,0.64,5.75,1.35,2.47,0.96,4.94,2.05,7.06,3.64,14.41,10.77,27.96,22.66,42.43,33.35,17.15,12.68,35.2,24.11,52.4,36.73,3.74,2.75,7.23,5.87,10.32,9.33,1.76,1.97,3.06,4.36,4.08,6.79,3.09,7.35,4.35,15.48,8.2,22.46,3.84,6.95,10.51,12.02,14.58,18.83,4.08,6.85,6.02,14.78,9.69,21.86,0.87,1.68,2.18,3.26,3.81,4.23,3.34,1.99,7.37,2.58,10.79,4.44,1.7,0.92,3.34,2.18,4.4,3.8,5.06,7.8,9.78,15.86,13.8,24.25,1.72,3.59,2.62,7.56,3.33,11.48,0.95,5.24,1.44,10.57,1.65,15.89,0.21,5.32,0.05,10.67,-0.38,15.98,-0.54,6.77,-1.67,13.47,-2.5,20.21",
    },
    "batavia-buleleng": {
        kind: "sea",
        from: "batavia",
        to: "buleleng",
        d: "M1652.77,1227.73c16.13,-9.79,34.13,-11.79,52.13,-8.79,48,8,93,14,139,28,15,5,26,16,29.71,31.56",
    },
    "bali-surabaya": {
        kind: "land",
        from: "denpasar",
        to: "surabaya",
        d: "M1874.75,1290.19c-0.25,-1.18,-0.5,-2.37,-0.75,-3.55,-0.04,-0.18,-0.08,-0.36,-0.18,-0.5,-0.43,-0.6,-1.33,-0.14,-2.04,0.06,-0.85,0.24,-1.75,-0.02,-2.6,-0.27,-2.11,-0.63,-4.22,-1.27,-6.33,-1.9,-0.92,-0.28,-1.87,-0.56,-2.83,-0.48,-0.86,0.08,-1.69,0.44,-2.55,0.51,-0.86,0.07,-1.88,-0.3,-2.11,-1.14,-0.2,-0.73,0.28,-1.47,0.36,-2.22,0.13,-1.16,-0.67,-2.19,-1.42,-3.08,-0.34,-0.39,-0.67,-0.79,-1.01,-1.19,-0.79,-0.93,-1.6,-1.88,-2.65,-2.5,-1.33,-0.78,-2.92,-0.95,-4.46,-1.11,-1.3,-0.13,-2.61,-0.27,-3.91,-0.4,-0.47,-0.04,-0.96,-0.09,-1.38,0.12,-0.29,0.14,-0.52,0.38,-0.78,0.57,-1.6,1.13,-3.73,-0.32,-5.68,-0.34,-2.51,-0.02,-4.55,2.37,-7.07,2.4,-1.55,0.02,-2.95,-0.87,-4.3,-1.62,-1.75,-0.97,-3.59,-1.77,-5.5,-2.39,-2.03,-0.66,-4.51,-1.49,-4.9,-3.59,-0.39,-2.09,1.66,-3.91,1.71,-6.03",
    },
    "surabaya-surakarta": {
        kind: "land",
        from: "surabaya",
        to: "surakarta",
        d: "M1811.71,1260.03c-0.28,1.26,-1.57,2.02,-2.82,2.35,-1.25,0.33,-2.58,0.37,-3.76,0.89,-1.1,0.49,-2,1.38,-3.13,1.82,-0.66,0.25,-1.37,0.34,-2.04,0.59,-1.07,0.39,-1.94,1.16,-2.9,1.78,-0.96,0.62,-2.1,1.11,-3.21,0.84,-0.98,-0.24,-1.76,-1.04,-2.74,-1.29,-0.76,-0.2,-1.56,-0.05,-2.35,-0.09,-1.56,-0.09,-3.11,-0.95,-4.61,-0.5,-0.56,0.17,-1.08,0.52,-1.66,0.52,-0.91,0,-1.58,-0.86,-1.98,-1.68,-0.4,-0.82,-0.74,-1.76,-1.52,-2.23,-0.61,-0.37,-1.36,-0.38,-2.07,-0.36,-1.92,0.05,-3.84,0.22,-5.74,0.5,-0.55,0.08,-1.13,0.18,-1.54,0.56,-0.32,0.3,-0.49,0.71,-0.74,1.06,-0.9,1.27,-2.96,1.49,-4.1,0.43",
    },
    "surakarta-jogjakarta": {
        kind: "land",
        from: "surakarta",
        to: "jogjakarta",
        d: "M1765.74,1263.89c-3.71,0,-10.04,0.82,-12.52,5.16,-0.45,0.8,-1.37,2.6,-1.21,4.73",
    },
    "jogjakarta-prambanan": {
        kind: "land",
        from: "jogjakarta",
        to: "prambanan",
        d: "M1753.45,1274.71c0,0,5.96,0.29,7.55,-4.8",
    },
    "jogjakarta-borobudur": {
        kind: "land",
        from: "jogjakarta",
        to: "borobudur",
        d: "M1751.71,1273.03c-0.49,-0.72,-0.87,-1.52,-1.11,-2.35,-0.14,-0.49,-0.24,-1,-0.52,-1.42,-0.27,-0.42,-0.7,-0.71,-1.13,-0.97,-0.69,-0.42,-1.42,-0.79,-2.17,-1.1",
    },
    "borobudur-bandung": {
        kind: "land",
        from: "borobudur",
        to: "bandung",
        d: "M1741.66,1263.46c-0.44,-0.34,-0.91,-0.69,-1.45,-0.81,-0.54,-0.12,-1.2,0.04,-1.47,0.53,-0.21,0.38,-0.15,0.87,-0.39,1.23,-0.51,0.78,-1.88,0.43,-2.44,1.17,-0.1,0.12,-0.16,0.28,-0.27,0.39,-0.15,0.15,-0.35,0.22,-0.55,0.28,-1.69,0.5,-3.57,0.35,-5.16,-0.42,-1.47,-0.71,-2.71,-1.91,-4.3,-2.29,-1.2,-0.28,-2.49,-0.05,-3.67,-0.4,-1.3,-0.38,-2.34,-1.41,-3.64,-1.8,-0.73,-0.22,-1.5,-0.23,-2.24,-0.39,-1.2,-0.26,-2.3,-0.97,-3.05,-1.94,-0.4,-0.52,-0.7,-1.12,-1.13,-1.63,-0.43,-0.51,-1.03,-0.93,-1.69,-0.92,-1.15,0.02,-1.89,1.25,-2.95,1.69,-0.71,0.29,-1.52,0.2,-2.28,0.1,-2.1,-0.28,-4.19,-0.65,-6.26,-1.09,-0.18,-0.04,-0.38,-0.09,-0.52,-0.22,-0.06,-0.05,-0.11,-0.12,-0.15,-0.18,-0.51,-0.74,-1.07,-1.53,-1.93,-1.8,-0.49,-0.15,-1.02,-0.11,-1.53,-0.17,-2.05,-0.24,-3.7,-2.02,-5.76,-2.12,-0.48,-0.03,-0.97,0.05,-1.43,-0.09,-0.46,-0.14,-0.9,-0.56,-0.82,-1.03",
    },
    "bandung-batavia": {
        kind: "land",
        from: "bandung",
        to: "batavia",
        d: "M1682.32,1250.77c-1.58,-0.09,-3.19,-0.22,-4.64,-0.82,-1.45,-0.6,-2.77,-1.75,-3.19,-3.27,-0.28,-1,-0.18,-2.16,-0.79,-3,-0.18,-0.26,-0.42,-0.47,-0.59,-0.74,-0.29,-0.5,-0.3,-1.11,-0.29,-1.69,0.03,-1.38,0.13,-2.78,-0.15,-4.13,-0.28,-1.35,-1,-2.69,-2.22,-3.34,-1.69,-0.91,-3.82,-0.3,-5.64,-0.93,-0.96,-0.33,-1.77,-0.99,-2.71,-1.39,-1.18,-0.5,-2.49,-0.56,-3.75,-0.86,-1.26,-0.3,-2.55,-0.92,-3.07,-2.1",
    },
    "batavia-singapore": {
        kind: "sea",
        from: "batavia",
        to: "singapore",
        d: "M1652.77,1227.73c2.2,-4.5,32.23,-67.64,8.6,-106.44,0,0,-11.46,-18.82,-44.15,-45.53,-5.21,-4.26,-10.56,-7.58,-10.56,-7.58,-4.48,-2.78,-7.66,-4.25,-9.01,-4.97,-4.81,-2.57,-10.85,-8.69,-15.44,-24.74",
    },
    "singapore-at-sea": {
        kind: "sea",
        from: "singapore",
        to: "atSea",
        d: "M1582.19,1039.23c0.52,0.04,1.03,0.07,1.52,0.1,-0.19,0.79,-0.53,2.69,0.46,4.39,1.4,2.38,3.82,2.92,6.01,2.85,5.19,-0.16,9.94,-2.08,11.55,-3.58,6.68,-6.2,-9.58,-24.46,-15.98,-54.61,-3.73,-17.57,0.14,-18.78,-3.56,-37.41,-2.24,-11.28,-5.66,-20.88,-9.5,-29.37",
    },
    "at-sea-siam": {
        kind: "sea",
        from: "atSea",
        to: "siam",
        d: "M1572.69,921.6c-2.84,-6.28,-5.91,-11.95,-8.92,-17.26,-34.09,-60.15,-57.21,-68.77,-66.64,-102.13,-4.59,-16.23,-6.63,-40.73,7.01,-75.05",
    },
};

/** A photograph beside a card, cropped as in Figma: the picture's box relative to its frame. */
export type JourneyImage = {
    src: string;
    alt: string;
    /** The frame is 180px tall and one of two widths. */
    width: 166 | 198;
    crop: { width: string; height: string; left: string; top: string };
};

export type JourneyStop = {
    id: string;
    date: string;
    place: string;
    summary: string;
    /** The second card "read more" opens; stops without one show no button. */
    more?: string;
    /** The design's three card widths, by how much the card has to say. */
    size: "large" | "medium" | "small";
    image?: JourneyImage;
    /** The dot the card belongs to and the camera settles on. */
    marker: JourneyPlaceId;
    /**
     * Stops that share a value are anecdotes from one place (the coloured circles
     * in the design). Their dots gather around that place, one per date.
     */
    cluster?: JourneyPlaceId;
    /** Other places lit with this stop. */
    also?: JourneyPlaceId[];
    /**
     * The legs that bring the journey here, drawn one after another as the map
     * follows them, and traced back the same way when going back past this date.
     */
    routes?: JourneyRouteId[];
    /** An inland tour: its places appear one after another, without a line. */
    series?: JourneyPlaceId[];
    /** How far the map zooms in, against the overview of the first stop. */
    zoom: number;
};

/**
 * For photographs cut from the design exactly as cropped there: the picture fills
 * its frame as it is.
 */
const FULL_FRAME: JourneyImage["crop"] = { width: "100%", height: "100%", left: "0%", top: "0%" };

const image = (
    file: string,
    alt: string,
    width: JourneyImage["width"],
    crop: JourneyImage["crop"]
): JourneyImage => ({ src: `${JOURNEY_ASSETS}/${file}`, alt, width, crop });

export const journeyStops: JourneyStop[] = [
    {
        id: "departure",
        date: "12 July",
        place: "CALCUTTA | DEPARTURE",
        summary:
            "Sets out on a three-and-a-half-month Southeast Asian tour, framed as a cultural mission of Visva Bharati University, Santiniketan.",
        more: "Travels with philologist Suniti Kumar Chatterji, artist-photographer-architect Surendranath Kar, and painter-musician Dhirendra Krishna Deva Varman. Twin aims: study surviving remains of Indian civilization in the region, and build cultural cooperation. At a Calcutta send-off he called it 'a pilgrimage to India beyond its modern political boundaries.'",
        size: "large",
        // No photograph: the first card in the design's Key Moments has none.
        marker: "calcutta",
        zoom: 1,
    },
    {
        id: "en-route",
        date: "July (en route)",
        place: "Madras > Singapore (at sea)",
        summary: "Party sails from Madras to Singapore aboard the French ship Ambois.",
        more: "Fund-raising for Visva Bharati was an open aim of the tour; at the Indian end, families like the Birla and Bajoria helped fund the trip.",
        size: "large",
        image: image("en-route.jpg", "Tagore seated among his travelling companions", 166, {
            width: "100%",
            height: "130.49%",
            left: "0.12%",
            top: "-10.34%",
        }),
        marker: "singapore",
        routes: ["calcutta-madras", "madras-singapore"],
        also: ["madras"],
        zoom: 1.35,
    },
    {
        id: "singapore-malaya",
        date: "Late July - August",
        place: "Singapore & Malaya",
        summary: "Month-long stay in Singapore and Malaya before crossing to the Dutch East Indies.",
        more: "Dutch musicologist Arnold Bake (who had studied at Santiniketan) acted as mediator and had warned Tagore the Dutch were nervous about recent communist uprisings. Tagore's promise to keep out of politics reassured the authorities. The invitation came privately from the Kunstkring (Art Circle), not the colonial government.",
        size: "large",
        image: image("singapore-malaya.jpg", "Tagore with a large gathering of hosts", 198, {
            width: "249.84%",
            height: "183.44%",
            left: "-78.56%",
            top: "-41.49%",
        }),
        marker: "malaya",
        routes: ["singapore-malaya"],
        also: ["singapore"],
        zoom: 1.8,
    },
    {
        id: "penang-belawan",
        date: "17 August",
        place: "Penang > Belawan (Sumatra) > Medan",
        summary:
            "Crosses from Penang to Belawan; spends a few hours in Medan, then sails for Java on the boat Plancius the same day.",
        size: "large",
        image: image("penang-belawan.jpg", "A colonial-era palace behind a formal garden", 198, FULL_FRAME),
        // The crossing ends at Belawan; Medan, a few hours inland, is the day's last stop.
        marker: "medan",
        routes: ["malaya-penang", "penang-belawan", "belawan-medan"],
        also: ["penang", "belawan"],
        zoom: 2.6,
    },
    {
        id: "batavia-arrival",
        date: "21 August",
        place: "Batavia (Java)",
        summary: "Arrives in Batavia.",
        more: "Welcomed by Mr and Mrs Bake, Dr F.D.K. Bosch and Dr Hoesein Djajadiningrat. The Kunstkring hosts a reception; a dinner given by British Consul Mr Crosby lets the party meet local intellectuals and Indian & Chinese businessmen.",
        size: "small",
        image: image("batavia-arrival.jpg", "A colonial building with twin towers and an arched porch", 166, FULL_FRAME),
        marker: "batavia",
        routes: ["belawan-batavia"],
        cluster: "batavia",
        zoom: 3.2,
    },
    {
        id: "buleleng",
        date: "26 August",
        place: "Buleleng (Bali)",
        summary:
            "Arrives at Boeleleng (Buleleng), Bali, after a brief stopover in Surabaya; begins a roughly two-week Bali stay (26 August - 8 September).",
        more: "Had been advised not to miss the rare spectacle of a cremation ceremony for a Hindu prince.",
        size: "large",
        image: image("buleleng.jpg", "A pavilion in Bali", 166, {
            width: "124.15%",
            height: "162%",
            left: "-11.97%",
            top: "-14.3%",
        }),
        marker: "buleleng",
        routes: ["batavia-buleleng"],
        zoom: 3.4,
    },
    {
        id: "bali-tour",
        date: "26 August – 8 September",
        place: "Bali (Buleleng > Bangli > Karang Asem > Tampak Siring > Gianyar > Den Pasar > Ubud > Mundu > Buleleng)",
        summary: "An intensive tour of Bali; no lectures were scheduled.",
        more: "Overwhelmed by the scenery and Hindu ritual - likened arriving processions of offerings to 'some picture from the Ajanta caves' come to life. On a motor ride the Raja of Karang Asem (Hida Anake Agoeng Bagoes Djelantik) startled him with the Sanskrit word 'samudra' and other Sanskrit names for the sea, then reeled off Indian river names. To a philosophical question the raja replied: 'Dewa Dewa tida apa, Nirvana satu' (Gods and their worship are immaterial, Nirvana is the supreme goal). Yet Tagore was disturbed that Balinese culture seemed frozen in an archaic, repeating cycle.",
        size: "large",
        image: image("bali-tour.jpg", "A hall in Bali lit by chandeliers", 198, {
            width: "163.89%",
            height: "100%",
            left: "-45.78%",
            top: "0%",
        }),
        // The card hangs from the tour's easternmost village, so the villages appearing
        // one by one stay clear of it to the west; Buleleng, where it began and ended, is ringed too.
        marker: "karangasem",
        also: ["buleleng"],
        series: ["buleleng", "bangli", "karangasem", "tampaksiring", "gianyar", "denpasar", "ubud", "mundu"],
        zoom: 5,
    },
    {
        id: "surabaya-return",
        date: "9 September",
        place: "Surabaya (Java)",
        summary: "Returns from Bali to Surabaya, beginning the Java leg (9 - 30 September).",
        more: "Hosted by the former Mangkoenegoro VI of Surakarta, who had voluntarily resigned and was living in Surabaya to run his sugar-export business. Tagore was charmed by his hospitality.",
        size: "large",
        image: image("surabaya.jpg", "Tagore seated beside his host", 166, {
            width: "141.01%",
            height: "184%",
            left: "-25.12%",
            top: "-42%",
        }),
        marker: "surabaya",
        routes: ["bali-surabaya"],
        cluster: "surabaya",
        zoom: 3.6,
    },
    {
        id: "surabaya-gathering",
        date: "10 September",
        place: "Surabaya",
        summary:
            "Meets about fifteen educated Javanese at a gathering arranged by Raden M. Harjo Soejono (son of the Mangkoenegoro).",
        more: "These 'Swarajist' nationalists asked whether an East-West union was possible amid continued Western dominance and exploitation. Tagore answered that union was impossible along the path of competition for power and goods, but possible on the intellectual and spiritual plane. The discussion lasted two hours.",
        size: "large",
        image: image("surabaya-gathering.jpg", "A painted portrait of a Javanese nobleman seated in a carved chair", 166, FULL_FRAME),
        marker: "surabaya",
        cluster: "surabaya",
        zoom: 3.6,
    },
    {
        id: "surabaya-lectures",
        date: "11 September",
        place: "Surabaya",
        summary:
            "Chatterji lectures the Indonesische Studieclub on Santiniketan and Indian education; that same evening Tagore speaks on 'What is art?' at the local Kunstkring.",
        size: "large",
        image: image("surabaya-lectures.jpg", "A large group gathered for a formal photograph", 198, FULL_FRAME),
        marker: "surabaya",
        cluster: "surabaya",
        zoom: 3.6,
    },
    {
        id: "surakarta-arrival",
        date: "12 September",
        place: "SURAKARTA",
        summary:
            "Arrives for a five-day stay (12 - 17 September) as guest of honour of Mangkoenegoro VII, a cultivated patron of Javanese culture.",
        more: "Dr Radjiman joins to accompany them. That evening, Tagore's poem on Java - translated into Javanese by the Mangkoenegoro himself - is sung by local singers. Despite failing health, the poet endured the September heat where electric fans were unknown.",
        size: "large",
        image: image("surakarta-arrival.jpg", "Tagore with his hosts at Surakarta", 198, {
            width: "123.14%",
            height: "100%",
            left: "-13.33%",
            top: "0%",
        }),
        marker: "surakarta",
        routes: ["surabaya-surakarta"],
        cluster: "surakarta",
        zoom: 4.5,
    },
    {
        id: "java-instituut",
        date: "13 September",
        place: "SURAKARTA",
        summary: "Visit to the Java Instituut.",
        more: "Meets the celebrated young Dutch scholar of medieval Javanese religion and literature, Dr Theodore Gautier Thomas Pigeaud.",
        size: "small",
        image: image("java-instituut.jpg", "A group of men and women seated outdoors", 166, FULL_FRAME),
        marker: "surakarta",
        cluster: "surakarta",
        zoom: 4.5,
    },
    {
        id: "grand-reception",
        date: "14 September",
        place: "SURAKARTA",
        summary: "Grand reception; Tagore lectures at the Kunstkring on India's attitude to conflict between nations.",
        more: "Meets Dutch engineer J.J. Moens and noted architect T. Karsten. A folder with his Java poem in English and Dutch translation, autographed by poet and Mangkoenegoro, is distributed.",
        size: "large",
        image: image("grand-reception.jpg", "A signed folder printing the Java poem", 198, FULL_FRAME),
        marker: "surakarta",
        cluster: "surakarta",
        zoom: 4.5,
    },
    {
        id: "wajang-poerwa",
        date: "16 September",
        place: "SURAKARTA",
        summary:
            "Meets Dutch authority W.F. Stutterheim; visits the Van Deventer School for Javanese girls; watches a Wajang Poerwa (shadow-theatre) performance at Prince Koesoemajoedo's house.",
        more: "Reflected that Javanese dance and shadow-play are 'the language of their history and their annals.' Watching the shadows he wrote of 'the dance of Mahamaya on the body of the prostrate Shiva.' Stutterheim favoured teaching Sanskrit and Kawi; the idea of Indian help interpreting Balinese inscriptions was raised.",
        size: "large",
        image: image("wajang-poerwa.jpg", "Girls at work around tables in a schoolroom", 198, FULL_FRAME),
        marker: "surakarta",
        cluster: "surakarta",
        zoom: 4.5,
    },
    {
        id: "contact-club",
        date: "17 September",
        place: "SURAKARTA",
        summary: "Reception with Javanese poets at the Contact Club before departure.",
        more: "Poems from his Katha o Kahini (Stories and Fables) were recited in Dutch and Javanese; a Javanese poet's reply to his Java poem was read out and sung. The Surakarta experience was a high point of the Java visit.",
        size: "medium",
        image: image("contact-club.jpg", "The title Katha o Kahini in Bengali, with Tagore's signature", 166, FULL_FRAME),
        marker: "surakarta",
        cluster: "surakarta",
        zoom: 4.5,
    },
    {
        id: "tagorestraat",
        date: "18 September",
        place: "Surakarta > Jogjakarta",
        summary:
            "His three companions (Deva Varman, Kar, Chatterji) leave by car with Samuel Koperberg; Tagore's own departure is delayed so he can open a road named after him, Tagorestraat.",
        size: "large",
        image: image("tagorestraat.jpg", "Tagore standing with a companion beside a palm", 166, {
            width: "121.72%",
            height: "158.82%",
            left: "-18.67%",
            top: "-29.69%",
        }),
        marker: "surakarta",
        routes: ["surakarta-jogjakarta"],
        cluster: "surakarta",
        also: ["jogjakarta"],
        zoom: 4.5,
    },
    {
        id: "pakoe-alam",
        date: "18 September",
        place: "Jogjakarta",
        summary: "Arrives around 11:30 a.m.; hosted by the Pakoe Alam.",
        more: "A Serimpi dance (a group dance for four girls) is performed - Tagore thought it the best dance he had seen so far in Java. Dinner served at the unusual hour of 11 p.m. He learned young Indonesian Muslims were now going to India, besides Mecca, to study Islam.",
        size: "medium",
        image: image("pakoe-alam.jpg", "Dancers performing in a pavilion", 166, FULL_FRAME),
        marker: "jogjakarta",
        cluster: "jogjakarta",
        zoom: 4.5,
    },
    {
        id: "prambanan",
        date: "19 September",
        place: "Prambanan & sites near Jogjakarta",
        summary:
            "Chatterji and Deva Varman visit Tjandi Loembeng, Sewoe, Plaosan and Kalasan with Bosch and Van Stein Callenfels, plus a further trip to Prambanan.",
        more: "Meet Mr Van Haan, engineer in charge of the Prambanan restoration. The party was delighted that Prambanan's Ramayana reliefs had no Indian temple parallel, and intrigued that the Javanese reliefs diverged from the Bhagavata text and showed Puranic tales unknown in India. They witnessed the 'miracle' of cross-cultural temple reconstruction, credited to the Netherlands East Indies government.",
        size: "large",
        image: image("prambanan.jpg", "The temples of Prambanan rising above scattered stones", 166, FULL_FRAME),
        marker: "prambanan",
        routes: ["jogjakarta-prambanan"],
        zoom: 4.5,
    },
    {
        id: "darmo-sedjati",
        date: "(During Jogjakarta Stay)",
        place: "Jogjakarta",
        summary: "Visits four 'Darmo Sedjati' nation-building institutions.",
        more: "Krido Bekso Wiromo (Javanese dance and music), Wanito Oetomo (a women's education society), Taman Siswa (nationalist coeducational school under Raden Mas Soewardi Soerjaningrat), and Habirando (a training school for dalang). The Indians were impressed by their efficiency.",
        size: "medium",
        image: image("jogjakarta-institutions.jpg", "A group seated before a pavilion", 166, {
            width: "140%",
            height: "106.38%",
            left: "-25.69%",
            top: "-3.19%",
        }),
        marker: "jogjakarta",
        cluster: "jogjakarta",
        zoom: 4.5,
    },
    {
        id: "ramayana",
        date: "c. 20 September",
        place: "JOGJAKARTA",
        summary: "Watches a Ramayana dance drama (up to the slaying of Jatayu) at the patih's invitation.",
        // As in the design, where this card repeats 12 September's text.
        more: "Dr Radjiman joins to accompany them. That evening, Tagore's poem on Java - translated into Javanese by the Mangkoenegoro himself - is sung by local singers. Despite failing health, the poet endured the September heat where electric fans were unknown.",
        size: "large",
        image: image("c20-september.jpg", "Batik cloths hung on display", 198, {
            width: "127.86%",
            height: "199%",
            left: "-0.06%",
            top: "-49.63%",
        }),
        marker: "jogjakarta",
        cluster: "jogjakarta",
        zoom: 4.5,
    },
    {
        id: "borobudur",
        date: "(During Jogjakarta Stay)",
        place: "BOROBUDUR",
        summary: "Visits Borobudur; unimpressed by the overall structure but admires the individual sculptures.",
        more: "Called it 'a mountain with a diminutive stone cap,' but specially liked the Jataka reliefs of everyday life 'nowhere tainted with obscenity or vulgarity.' Finished a long poem on Borobudur while seated at the monument's foot - the second of his three memorable Indonesia poems. He gratefully credited the Dutch experts, saying 'we must accept them as our Gurus if we would understand India in its completeness.'",
        size: "large",
        image: image("borobudur.jpg", "Visitors walking before Borobudur", 198, {
            width: "138.78%",
            height: "216%",
            left: "-19.39%",
            top: "-58%",
        }),
        marker: "borobudur",
        routes: ["jogjakarta-borobudur"],
        zoom: 4.5,
    },
    {
        id: "islamic-modernism",
        date: "24 September",
        place: "Jogjakarta",
        summary: "Last day in Jogjakarta; an encounter with Islamic modernism.",
        more: "Marathi-speaking Mirza Ali Baig, a link between Javanese and Indian Muslims, invites Chatterji to the Muhammadiya. Chatterji notes 32 Dutch-Javanese and 60 primary schools under Muhammadiya sponsorship, and visits a Muslim girls' school founded by a Mrs Dachlan.",
        size: "medium",
        image: image("islamic-modernism.jpg", "A man seated at a desk before shelves of books", 166, FULL_FRAME),
        marker: "jogjakarta",
        cluster: "jogjakarta",
        zoom: 4.5,
    },
    {
        id: "bandung-arrival",
        date: "24 September (evening)",
        place: "Bandung",
        summary: "Arrives at the cool mountain resort of Bandung with Pigeaud and Koperberg on the return trip.",
        more: "A much-longed-for respite from the hot Javanese and Balinese summer.",
        size: "large",
        image: image("bandung-arrival.jpg", "An aerial view of a town", 198, FULL_FRAME),
        marker: "bandung",
        routes: ["borobudur-bandung"],
        cluster: "bandung",
        zoom: 3.6,
    },
    {
        id: "bandung-kunstkring",
        date: "25 September",
        place: "BANDUNG",
        summary: "Gives a talk on art at the local Kunstkring.",
        size: "medium",
        image: image("bandung-kunstkring.jpg", "Two album photographs of town streets", 166, FULL_FRAME),
        marker: "bandung",
        cluster: "bandung",
        zoom: 3.6,
    },
    {
        id: "soekarno",
        date: "26 September",
        place: "Lembang / Bandung",
        summary:
            "Visits the theosophical teacher-training centre Goenoeng Sari (a pan-religious prayer meeting); has an unscheduled meeting with young nationalist leader Soekarno; leaves by train for Batavia the same day.",
        more: "With no Dutch officials present, Koperberg introduced Soekarno and two young Sundanese activists. They spoke good English and knew a great deal about Gandhi, Chittaranjan Das, Motilal Nehru and Sarojini Naidu. The poet and companions were much impressed by the charming young leader.",
        size: "large",
        image: image("soekarno.jpg", "A young man in a light suit standing among a crowd", 166, FULL_FRAME),
        marker: "bandung",
        cluster: "bandung",
        zoom: 3.6,
    },
    {
        id: "batavia-farewell",
        date: "27 – 29 September",
        place: "BATAVIA",
        summary: "Reads his poems in Bengali and English translation at a last Kunstkring meeting.",
        more: "Meets archaeologist Mr Maclain Pont (in charge of the Majapahit excavations). Chatterji meets the famous Javanese scholar Poerbatjaraka, a researcher on Agastya.",
        size: "medium",
        image: image("batavia-kunstkring.jpg", "Tagore at a gathering in Batavia", 166, {
            width: "135.65%",
            height: "177%",
            left: "-20.38%",
            top: "-38.5%",
        }),
        marker: "batavia",
        routes: ["bandung-batavia"],
        cluster: "batavia",
        zoom: 3.2,
    },
    {
        id: "batavia-singapore",
        date: "30 September (morning)",
        place: "Batavia > Singapore",
        summary: "Leaves Batavia for Singapore en route to Bangkok, accompanied by Surendranath Kar.",
        more: "Chatterji stays behind for a lecture assignment at the Koninklijk Bataviaasch Genootschap van Kunsten en Wetenschappen.",
        size: "large",
        image: image("batavia-singapore.jpg", "Tagore speaking at a lectern", 166, FULL_FRAME),
        // The card hangs from Singapore, where the day's voyage ends, so the map travels
        // there once and settles rather than flying back to Batavia.
        marker: "singapore",
        routes: ["batavia-singapore"],
        also: ["batavia"],
        zoom: 1.9,
    },
    {
        id: "sagarika",
        date: "1 October",
        place: "At sea (ship Mijer)",
        summary: "Composes his famous Bali poem 'Sagarika,' paying tribute to the island and the Indonesian people.",
        size: "large",
        image: image("sagarika.jpg", "A bust of Tagore on a stone memorial", 166, FULL_FRAME),
        marker: "atSea",
        routes: ["singapore-at-sea"],
        zoom: 1.9,
    },
    {
        id: "siam",
        date: "(On The Way Back to India)",
        place: "Siam (modern Thailand)",
        summary:
            "Pays a brief visit to Siam before returning to India, completing the roughly three-and-a-half-month tour.",
        more: "The article's narrative closes with the return leg and does not record the exact date the poet reached Santiniketan. Its verdict on the visit: India and Indonesia briefly 'recognized an ancient bond and the possibility of a new partnership' - but the planned cultural-exchange programme never materialized on any significant scale.",
        size: "large",
        image: image("siam.jpg", "Boats crowded together on a river", 198, FULL_FRAME),
        marker: "siam",
        routes: ["at-sea-siam"],
        zoom: 1.4,
    },
];
