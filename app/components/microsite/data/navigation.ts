import type { MicrositeNavItem } from "../types";

// The Sarong to Sari header as the design draws it. Only "the journey" is part of
// this demo; the other pages live in the main site, so their links are shown but
// do not go anywhere (an empty href).
export const micrositeNavigation: MicrositeNavItem[] = [
  { label: "exhibition", href: "" },
  { label: "the journey", href: "/" },
  { label: "programme", href: "" },
  { label: "voices", href: "" },
  { label: "community archive", href: "" },
];
