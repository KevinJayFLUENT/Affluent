import React from "react";

// Fluent brand mark — three stacked blue leaf strokes forming an F.
// Flat fills, pointed lower-left tails, swept right tips.
// variant="mono" renders white-on-dark for the royal-blue header.
export default function FluentLogo({ size = 30, variant = "color" }) {
  const fills =
    variant === "mono"
      ? ["rgba(255,255,255,1)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0.6)"]
      : ["#3560d0", "#4a83e8", "#5cb3f0"];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Fluent logo">
      {/* top bar */}
      <path d="M25 40 Q25 14 52 14 L82 14 Q90 14 87.5 20 Q79 37 50 40 Z" fill={fills[0]} />
      {/* middle bar */}
      <path d="M25 68 Q25 44 49 44 L70 44 Q77 44 74.5 50 Q67 65 46 68 Z" fill={fills[1]} />
      {/* bottom petal */}
      <path d="M25 96 Q25 72 45 72 Q54 72 52.5 78 Q49 91 30 96 Z" fill={fills[2]} />
    </svg>
  );
}
