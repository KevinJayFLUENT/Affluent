import React from "react";

// TCan Express brand mark — bao buns in a bamboo steamer on a red disc.
export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="TCan Express logo">
      {/* red disc */}
      <circle cx="60" cy="54" r="46" fill="#E8262A" />

      {/* steamer body */}
      <path
        d="M30 74 h60 v14 c0 6 -4 10 -10 10 H40 c-6 0 -10 -4 -10 -10 z"
        fill="#EDB459"
        stroke="#1c1c1c"
        strokeWidth="3.5"
      />
      {/* steamer vertical ridges */}
      <line x1="45" y1="76" x2="45" y2="96" stroke="#c98f3a" strokeWidth="3" />
      <line x1="60" y1="76" x2="60" y2="97" stroke="#c98f3a" strokeWidth="3" />
      <line x1="75" y1="76" x2="75" y2="96" stroke="#c98f3a" strokeWidth="3" />
      {/* steamer rim */}
      <ellipse cx="60" cy="74" rx="34" ry="7.5" fill="#F6CF7F" stroke="#1c1c1c" strokeWidth="3.5" />

      {/* side buns */}
      <circle cx="40" cy="60" r="16" fill="#F4ECDB" stroke="#1c1c1c" strokeWidth="3.5" />
      <circle cx="80" cy="60" r="16" fill="#F4ECDB" stroke="#1c1c1c" strokeWidth="3.5" />
      {/* center bun */}
      <circle cx="60" cy="50" r="21" fill="#F7F0E1" stroke="#1c1c1c" strokeWidth="3.5" />
      {/* pleats on center bun */}
      <path d="M60 34 q-3 8 -12 11" fill="none" stroke="#1c1c1c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 34 q-1 9 -4 13" fill="none" stroke="#1c1c1c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 34 q1 9 4 13" fill="none" stroke="#1c1c1c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 34 q3 8 12 11" fill="none" stroke="#1c1c1c" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
