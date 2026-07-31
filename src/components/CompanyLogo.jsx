import React from "react";

// Salesforce-style account avatar: deterministic color from the company
// name, initials on a rounded tile. A target can override via
// target.brand = { color, color2, initials }.
const PALETTES = [
  ["#3b5bdb"],
  ["#0b7285"],
  ["#5f3dc4"],
  ["#9a3412"],
  ["#b45309"],
  ["#2b8a3e"],
  ["#364fc7"],
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name) {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  return ((words[0]?.[0] || "?") + (words[1]?.[0] || "")).toUpperCase();
}

// Custom demo marks, keyed by brand.mark — recreated from each account's
// real logo, simplified to stay legible at tile size.
const MARKS = {
  // Vantage: white V (droplet + slanted capsule) on the blue tile
  vee: (
    <svg viewBox="0 0 48 48" width="74%" height="74%">
      <path d="M16 13 a5.5 5.5 0 0 1 5.5 5.5 c0 3.4 -2.4 7 -5.5 10.5 c-3.1 -3.5 -5.5 -7.1 -5.5 -10.5 A5.5 5.5 0 0 1 16 13 Z" fill="#ffffff" />
      <rect x="27" y="8" width="10" height="30" rx="5" fill="#ffffff" transform="rotate(18 32 23)" />
    </svg>
  ),
  // Novaris: four-petal pinwheel (green, cyan, blue, navy)
  novaris: (
    <svg viewBox="0 0 48 48" width="82%" height="82%">
      <path d="M22 22 L22 12 A10 10 0 1 0 12 22 Z" fill="#7ac143" />
      <path d="M26 22 L26 15 A7 7 0 1 1 33 22 Z" fill="#6fd4e8" />
      <path d="M22 26 L13 26 A9 9 0 1 0 22 35 Z" fill="#00b5e2" />
      <path d="M26 26 L26 31.5 A5.5 5.5 0 1 0 31.5 26 Z" fill="#233f94" />
    </svg>
  ),
  // Merritt: radial bloom of wavy blue petals
  merritt: (
    <svg viewBox="0 0 48 48" width="86%" height="86%">
      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg, i) => (
        <path
          key={deg}
          d="M24 20 C25 13 28 8 33 5.5 C31.5 11 30.5 16 26.5 20.5 C25.5 21.5 24.5 21 24 20 Z"
          fill={["#1d4f9e", "#3a7bc8", "#5c9fdd", "#274b8f"][i % 4]}
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
    </svg>
  ),
  // Solenta: navy sky + white streak, tan field, acacia tree, ground lines
  solenta: (
    <svg viewBox="0 0 48 48" width="80%" height="80%">
      <rect x="10" y="5" width="28" height="14" fill="#233e7c" />
      <path d="M10 12 C18 10.5 28 12.5 38 10.5 L38 13.5 C28 15 18 12.5 10 14.5 Z" fill="#ffffff" />
      <rect x="10" y="19" width="28" height="13" fill="#c3a568" />
      <path d="M17 22 C19 19.5 29 19.5 31 22 C33 22.5 32 24.5 29 24.5 L26 24.5 L26 30 L24.5 30 L24.5 24.5 L19 24.5 C16 24.5 15.5 22.5 17 22 Z" fill="#111111" />
      <path d="M8 36 C18 33.5 30 33.5 40 36 C30 35 18 35 8 37.5 Z" fill="#111111" />
      <path d="M11 40 C20 38 28 38 37 40 C28 39.2 20 39.2 11 41.5 Z" fill="#111111" />
    </svg>
  ),
  // Plexa: blue rounded strokes — diagonal, chevron, short stroke, dot
  plexa: (
    <svg viewBox="0 0 48 48" width="80%" height="80%">
      <g stroke="#0d6ef5" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="10" y1="7" x2="34" y2="40" />
        <path d="M43 7 L30.5 19 L43 31" />
        <line x1="10" y1="23" x2="23" y2="41" />
      </g>
      <circle cx="9.5" cy="42" r="4.6" fill="#0d6ef5" />
    </svg>
  ),
  // Kestrel: falcon badge — navy disc, diving falcon, green waveform ring
  kestrel: (
    <svg viewBox="0 0 48 48" width="90%" height="90%">
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i * 360) / 28;
        const r1 = 19.5, r2 = i % 2 ? 23 : 21;
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={24 + r1 * Math.cos(rad)} y1={24 + r1 * Math.sin(rad)}
            x2={24 + r2 * Math.cos(rad)} y2={24 + r2 * Math.sin(rad)}
            stroke="#2fae4a" strokeWidth="1.3"
          />
        );
      })}
      <circle cx="24" cy="24" r="17.5" fill="#14265c" />
      <path d="M14 13 C22 8 31 11 34 18 C30 16.5 27 17.5 25 20 C29 22 31 27 29 33.5 C26 29.5 21.5 27.5 17.5 29 C20.5 24.5 18 18 14 13 Z" fill="#c98e4b" />
      <circle cx="31" cy="16.5" r="2.6" fill="#f0e8d8" />
      <path d="M33.2 15.8 L35.6 16.8 L33.4 17.9 Z" fill="#2b2b2b" />
    </svg>
  ),
  // Orbita: the "o" glyph — black ring with a cyan swirl
  orbita: (
    <svg viewBox="0 0 48 48" width="76%" height="76%">
      <circle cx="24" cy="24" r="11" fill="none" stroke="#1a1414" strokeWidth="8.5" />
      <path d="M13.6 20.4 A11 11 0 0 1 28.2 13.8" fill="none" stroke="#19c1f3" strokeWidth="8.5" strokeLinecap="round" />
    </svg>
  ),
  // Brightspan: gold double arch with sunrise rays at the crest
  brightspan: (
    <svg viewBox="0 0 48 48" width="84%" height="84%">
      <g stroke="#c99a3a" strokeWidth="1.7" strokeLinecap="round">
        <line x1="23" y1="9" x2="23" y2="4" />
        <line x1="17.5" y1="10.5" x2="15.5" y2="6" />
        <line x1="28.5" y1="10.5" x2="30.5" y2="6" />
        <line x1="13" y1="13.5" x2="9.5" y2="10" />
        <line x1="33" y1="13.5" x2="36.5" y2="10" />
      </g>
      <path d="M4 33 C13 15 33 16 44 30 L44 33.5 C33 20 14 19 7 35 Z" fill="#e3b95b" />
      <path d="M4 41 C16 24 36 26 44 39 L44 42 C35 30 17 29 8 43 Z" fill="#c99a3a" />
    </svg>
  ),
  // Cobalt: faceted hexagonal crystal ring in layered blues
  cobalt: (
    <svg viewBox="0 0 48 48" width="76%" height="76%">
      <polygon points="24,7 38.7,15.5 31.8,19.5 24,15" fill="#1a4b9e" />
      <polygon points="38.7,15.5 38.7,32.5 31.8,28.5 31.8,19.5" fill="#1c1a4e" />
      <polygon points="38.7,32.5 24,41 24,33 31.8,28.5" fill="#8fa8d0" />
      <polygon points="24,41 9.3,32.5 16.2,28.5 24,33" fill="#1a4b9e" />
      <polygon points="9.3,32.5 9.3,15.5 16.2,19.5 16.2,28.5" fill="#23205a" />
      <polygon points="9.3,15.5 24,7 24,15 16.2,19.5" fill="#c7d4ea" />
    </svg>
  ),
  // Hartline: hatched heart, blue grid, C, EKG trace
  hartline: (
    <svg viewBox="0 0 48 48" width="84%" height="84%">
      <defs>
        <pattern id="hl-hatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#ffffff" />
          <rect width="2" height="4" fill="#8a8f98" />
        </pattern>
      </defs>
      <path d="M24 14 C22 9 16 7 12.5 10.5 C9 14 10 19.5 14 23.5 L24 33 L34 23.5 C38 19.5 39 14 35.5 10.5 C32 7 26 9 24 14 Z" fill="url(#hl-hatch)" />
      <g stroke="#2e6da4" strokeWidth="1.6">
        <line x1="17" y1="4" x2="17" y2="38" />
        <line x1="31" y1="4" x2="31" y2="38" />
        <line x1="8" y1="15" x2="40" y2="15" />
        <line x1="8" y1="27" x2="40" y2="27" />
      </g>
      <path d="M35 30 A9.5 9.5 0 1 1 35 17" fill="none" stroke="#2e6da4" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M6 34 H20 L23 28 L26 38 L28 31 L30 34 H33 L35 31 L37 34 H43" fill="none" stroke="#111111" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
};

export default function CompanyLogo({ target, size = 36 }) {
  const name = target.company || "?";
  const brand = target.brand || {};
  const [c1] = brand.color ? [brand.color] : PALETTES[hashCode(name) % PALETTES.length];
  const mark = brand.mark && MARKS[brand.mark];

  return (
    <span
      className="company-logo"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        // Multi-color marks sit on a white tile with a hairline ring.
        background: brand.light ? "#ffffff" : c1,
        boxShadow: brand.light ? "inset 0 0 0 1px #e5e7eb" : undefined,
      }}
      aria-label={`${name} logo`}
    >
      {mark || brand.initials || initialsOf(name)}
    </span>
  );
}
