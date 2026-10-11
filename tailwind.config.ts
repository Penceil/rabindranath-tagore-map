import type { Config } from "tailwindcss";

/**
 * The part of the main repository's Tailwind config the journey map uses: the
 * site's fonts, breakpoints and Sarong to Sari palette, and the map's animations.
 */
const config: Config = {
    content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
        fontFamily: {
            Bodoni: ["var(--font-bodoni-moda)"],
            TTNormsPro: ["var(--font-TTNormsPro)"]
        },
        screens: {
            xxs: "390px",
            xs: "460px",
            sm: "576px",
            md: "768px",
            lg: "992px",
            xl: "1200px",
            xxl: "1366px",
            "2xl": "1400px",
            "3xl": "1600px",
            "4xl": "1920px"
        },
        extend: {
            animation: {
                // Gaps running along the header's link underline like a stitch.
                stitch: "stitch 0.6s linear infinite",
                // The journey map: dashes travelling along the crossing being read.
                march: "march 1.4s linear infinite",
                // The journey map: the dashed ring round the current stop, turning slowly.
                "spin-slow": "spin 14s linear infinite"
            },
            keyframes: {
                stitch: {
                    from: { maskPosition: "0 0" },
                    to: { maskPosition: "64px 0" }
                },
                march: {
                    from: { strokeDashoffset: "0" },
                    to: { strokeDashoffset: "-16" }
                }
            },
            colors: {
                // Sarong to Sari microsite palette, taken from the Figma file's named styles.
                s2s: {
                    maroon: "#6a151c",
                    // The deeper red "The Journey" sets its dates in.
                    wine: "#7c1126",
                    brown: "#7f665b",
                    ink: "#444444",
                    muted: "#666666",
                    gray: "#737373",
                    soft: "#999999",
                    line: "#aaaaaa",
                    panel: "#f8f8f8",
                    tan: "#a39385",
                    gold: "#cd8c3f",
                    sand: "#c3af9d",
                    mist: "#f1f1f1",
                    paper: "#fbfbfb"
                }
            }
        }
    },
    plugins: []
};

export default config;
