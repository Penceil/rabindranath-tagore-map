"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

export const useMicrositeNav = (href: string): boolean => {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) {
      return false;
    }

    if (href === "/microsite") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  }, [href, pathname]);
};
