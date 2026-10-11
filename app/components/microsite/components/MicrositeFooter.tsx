import Image from "next/image";
import Decoration from "./home/Decoration";
import { S2S_ASSETS } from "../data/home";

// Weavers Studio's own pages; each opens in a new tab so the microsite stays open.
const socialLinks: { name: string; icon: string; width: number; height: number; href: string }[] = [
  {
    name: "Instagram",
    icon: "icon-instagram.svg",
    width: 24,
    height: 26,
    href: "https://www.instagram.com/weaversstudiokolkata?dlrf=MWl3YzEyYmg2dW44Nw==",
  },
  { name: "Facebook", icon: "icon-facebook.svg", width: 24, height: 24, href: "https://www.facebook.com/share/1GjLuHSSMb/" },
  {
    name: "LinkedIn",
    icon: "icon-linkedin.svg",
    width: 24,
    height: 24,
    href: "https://www.linkedin.com/company/weavers-studio-kolkata?originalSubdomain=in",
  },
];

const MicrositeFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#eeeeee] bg-s2s-paper">
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 text-[14px] leading-[25px] lg:grid lg:min-h-[150px] lg:grid-cols-[247px_313px_335px_1fr] lg:items-center lg:gap-0 lg:px-[60px] lg:py-0">
        {/* The logo and the two text columns hang 42px from the footer's top edge;
            only the social icons sit on its centre line. */}
        <Image
          src={`${S2S_ASSETS}/footer-logo.svg`}
          alt="Sarong to Sari"
          width={200}
          height={76}
          unoptimized
          className="lg:mt-[42px] lg:self-start"
        />

        <div className="lg:mt-[42px] lg:self-start">
          <p className="text-s2s-soft">Presented by</p>
          <p className="text-s2s-ink">Weavers Studio Resource Centre, Kolkata</p>
          <p className="text-[11px] uppercase tracking-[1px] text-s2s-soft">©{year} Weavers Studio</p>
        </div>

        <address className="not-italic lg:mt-[42px] lg:self-start">
          <p className="text-s2s-soft">Contact Us</p>
          <a href="mailto:wsrc@weaversstudio.in" className="block text-s2s-ink hover:text-s2s-maroon">
            wsrc@weaversstudio.in
          </a>
          <a href="tel:+919874314888" className="block tracking-[0.7px] text-s2s-ink hover:text-s2s-maroon">
            +91 98743 14888
          </a>
        </address>

        <ul aria-label="Social media" className="flex items-center gap-[22px]">
          {socialLinks.map((social) => (
            <li key={social.name}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Weavers Studio on ${social.name} (opens in a new tab)`}
                className="block rounded-sm transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-s2s-maroon"
              >
                <Image
                  src={`${S2S_ASSETS}/${social.icon}`}
                  alt=""
                  width={social.width}
                  height={social.height}
                  unoptimized
                />
              </a>
            </li>
          ))}
        </ul>

        {/* The JPEG has a white ground; multiplying it onto the footer's grey removes the box. */}
        <Decoration file="footer-batik.jpg" width={286} height={123} className="bottom-0 right-0 mix-blend-multiply" />
      </div>
    </footer>
  );
};

export default MicrositeFooter;
