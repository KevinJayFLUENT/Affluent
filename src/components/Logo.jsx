import React from "react";

// TCan Express brand mark — bao buns in a bamboo steamer on a red disc.
export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="TCan Express logo">
      {/* brand disc — blue & white theme */}
      <circle cx="60" cy="54" r="46" fill="#2563eb" />

      {/* steamer body */}
      <path
        d="M30 74 h60 v14 c0 6 -4 10 -10 10 H40 c-6 0 -10 -4 -10 -10 z"
        fill="#bfdbfe"
        stroke="#1e3a5f"
        strokeWidth="3.5"
      />
      {/* steamer vertical ridges */}
      <line x1="45" y1="76" x2="45" y2="96" stroke="#93c5fd" strokeWidth="3" />
      <line x1="60" y1="76" x2="60" y2="97" stroke="#93c5fd" strokeWidth="3" />
      <line x1="75" y1="76" x2="75" y2="96" stroke="#93c5fd" strokeWidth="3" />
      {/* steamer rim */}
      <ellipse cx="60" cy="74" rx="34" ry="7.5" fill="#dbeafe" stroke="#1e3a5f" strokeWidth="3.5" />

      {/* side buns */}
      <circle cx="40" cy="60" r="16" fill="#ffffff" stroke="#1e3a5f" strokeWidth="3.5" />
      <circle cx="80" cy="60" r="16" fill="#ffffff" stroke="#1e3a5f" strokeWidth="3.5" />
      {/* center bun */}
      <circle cx="60" cy="50" r="21" fill="#ffffff" stroke="#1e3a5f" strokeWidth="3.5" />
      {/* pleats on center bun */}
      <path d="M60 34 q-3 8 -12 11" fill="none" stroke="#1e3a5f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 34 q-1 9 -4 13" fill="none" stroke="#1e3a5f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 34 q1 9 4 13" fill="none" stroke="#1e3a5f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 34 q3 8 12 11" fill="none" stroke="#1e3a5f" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
