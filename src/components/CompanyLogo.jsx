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
