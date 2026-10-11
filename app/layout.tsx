import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

const ttNormsPro = localFont({
  src: [
    { path: "./fonts/TT-norms/TT_Norms_Pro_Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/TT-norms/TT_Norms_Pro_Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/TT-norms/TT_Norms_Pro_Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-TTNormsPro",
  display: "swap",
});

const bodoniModa = localFont({
  src: [
    { path: "../node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-bodoni-moda",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Journey · Sarong to Sari",
  description:
    "Rabindranath Tagore's 1927 journey to Java and Bali, and the way home: a preview of the Sarong to Sari journey map.",
  // A preview for the client, not the public site: keep it out of search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${ttNormsPro.variable} ${bodoniModa.variable}`}>
      <body>{children}</body>
    </html>
  );
}
