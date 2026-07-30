import React from "react";

// Salesforce-style account avatar: deterministic color from the company
// name, initials on a rounded tile. A target can override via
// target.brand = { color, color2, initials }.
const PALETTES = [
  ["#0176d3", "#032d60"],
  ["#06a59a", "#014d44"],
  ["#9050e9", "#401075"],
  ["#e26e64", "#8e2a20"],
  ["#dd7a01", "#8c4b02"],
  ["#3ba755", "#1c5f2e"],
  ["#5867e8", "#1f2b8e"],
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

// Custom demo marks, keyed by brand.mark. "permit" = a stamped permit
// document with an approval check (Vantage Permit Systems).
const MARKS = {
  permit: (
    <svg viewBox="0 0 48 48" width="72%" height="72%">
      {/* document with folded corner */}
      <path
        d="M13 6 h16 l8 8 v26 a2 2 0 0 1 -2 2 H13 a2 2 0 0 1 -2 -2 V8 a2 2 0 0 1 2 -2 z"
        fill="#ffffff"
        opacity="0.95"
      />
      <path d="M29 6 l8 8 h-8 z" fill="#bcd4ea" />
      {/* form lines */}
      <rect x="16" y="18" width="16" height="2.4" rx="1.2" fill="#9fb9d4" />
      <rect x="16" y="23.5" width="12" height="2.4" rx="1.2" fill="#9fb9d4" />
      {/* approval check */}
      <circle cx="30" cy="33" r="9.5" fill="#2e844a" />
      <path
        d="M25.5 33.2 l3.2 3.2 6-6.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function CompanyLogo({ target, size = 36 }) {
  const name = target.company || "?";
  const brand = target.brand || {};
  const [c1, c2] = brand.color
    ? [brand.color, brand.color2 || brand.color]
    : PALETTES[hashCode(name) % PALETTES.length];
  const mark = brand.mark && MARKS[brand.mark];

  return (
    <span
      className="company-logo"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-label={`${name} logo`}
    >
      {mark || brand.initials || initialsOf(name)}
    </span>
  );
}
