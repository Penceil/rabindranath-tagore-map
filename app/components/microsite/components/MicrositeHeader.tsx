"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { micrositeNavigation } from "../data/navigation";
import { S2S_ASSETS } from "../data/home";
import { useMicrositeNav } from "../hooks/useMicrositeNav";
import { CloseIcon } from "./icons";
import { stitchMask } from "./home/UnderlineLink";

type NavLinkProps = {
  href: string;
  label: string;
  onNavigate?: () => void;
};

/**
 * The current page is set in Bodoni italic over a drawn underline; the rest in
 * plain lowercase, taking on the same italic and underline while hovered. While
 * hovered the underline also runs with gaps, like the calls to action.
 *
 * Both versions of the label sit in one grid cell, so the link is always as wide
 * as the wider of the two and the menu does not shift when the font changes.
 */
const NavLink = ({ href, label, onNavigate }: NavLinkProps) => {
  const isActive = useMicrositeNav(href);

  // Demo only: pages that are not part of this preview show their label without a link.
  if (!href) {
    return (
      <span aria-disabled="true" className="inline-grid cursor-default whitespace-nowrap lowercase text-s2s-brown">
        <span className="text-[15px] leading-[24.8px]">{label}</span>
      </span>
    );
  }
  const shown = isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100";
  const hidden = isActive ? "opacity-0" : "opacity-100 group-hover:opacity-0 group-focus-visible:opacity-0";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className="group relative inline-grid whitespace-nowrap lowercase text-s2s-brown focus:outline-none focus-visible:ring-2 focus-visible:ring-s2s-maroon"
    >
      <span className={`[grid-area:1/1] text-[15px] leading-[24.8px] transition-opacity duration-200 ${hidden}`}>{label}</span>
      <span aria-hidden className={`[grid-area:1/1] font-Bodoni text-[16px] italic leading-[24.8px] transition-opacity duration-200 ${shown}`}>
        {label}
      </span>
      <span
        aria-hidden
        className={`absolute left-0 top-[24px] h-[3.5px] w-[max(79.73px,calc(100%-5px))] origin-left transition-transform duration-300 ${stitchMask} ${
          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
        }`}
      >
        <Image src={`${S2S_ASSETS}/nav-underline.svg`} alt="" fill unoptimized />
      </span>
    </Link>
  );
};

const MicrositeHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0px_5px_34px_0px_rgba(127,102,91,0.1)]">
      <div className="mx-auto flex h-[57px] max-w-[1440px] items-center pl-4 pr-[14px] lg:h-[64px] lg:px-[60px]">
        <Link href="/" className="shrink-0" aria-label="Sarong to Sari home">
          <Image
            src={`${S2S_ASSETS}/s2s-logo.svg`}
            alt=""
            width={94.996}
            height={42.012}
            unoptimized
            priority
            className="h-auto w-[76px] lg:w-[95px]"
          />
        </Link>

        <nav
          aria-label="Microsite navigation"
          className="hidden lg:ml-[123px] lg:mr-[15px] lg:flex lg:flex-1 lg:items-center lg:justify-between xl:grid xl:grid-cols-[22.9fr_23.7fr_24.4fr_17.2fr_11.8fr]"
        >
          {micrositeNavigation.map((item, index) => (
            <div key={item.label} className={index === micrositeNavigation.length - 1 ? "xl:justify-self-end" : ""}>
              <NavLink href={item.href} label={item.label} />
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="microsite-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="ml-auto flex h-[25px] w-[25px] items-center justify-center rounded-sm text-s2s-brown focus:outline-none focus-visible:ring-2 focus-visible:ring-s2s-maroon lg:hidden"
        >
          {menuOpen ? (
            <CloseIcon className="h-[22px] w-[22px]" />
          ) : (
            <Image src={`${S2S_ASSETS}/icon-menu.svg`} alt="" width={25} height={25} unoptimized />
          )}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="microsite-menu"
          aria-label="Microsite navigation"
          className="border-t border-[#eeeeee] bg-white px-5 pb-6 pt-4 lg:hidden"
        >
          <ul className="flex flex-col gap-4">
            {micrositeNavigation.map((item) => (
              <li key={item.label}>
                <NavLink href={item.href} label={item.label} onNavigate={() => setMenuOpen(false)} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
};

export default MicrositeHeader;
