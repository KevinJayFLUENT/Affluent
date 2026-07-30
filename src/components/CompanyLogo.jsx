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

export default function CompanyLogo({ target, size = 36 }) {
  const name = target.company || "?";
  const brand = target.brand || {};
  const [c1, c2] = brand.color
    ? [brand.color, brand.color2 || brand.color]
    : PALETTES[hashCode(name) % PALETTES.length];
  const initials = brand.initials || initialsOf(name);

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
      {initials}
    </span>
  );
}
