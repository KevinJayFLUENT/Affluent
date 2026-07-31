import React from "react";

// Fluent brand mark — three layered blue wing strokes forming an F.
export default function FluentLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Fluent logo">
      <defs>
        <linearGradient id="fl-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e63f0" />
          <stop offset="1" stopColor="#2f86f7" />
        </linearGradient>
        <linearGradient id="fl-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b7cf5" />
          <stop offset="1" stopColor="#4aa3fa" />
        </linearGradient>
        <linearGradient id="fl-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b96f8" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {/* shadow wedges */}
      <path d="M22 40 C40 40 52 36 60 30 L60 44 C50 50 36 52 22 52 Z" fill="#123a8f" />
      <path d="M22 66 C34 66 42 63 48 58 L48 70 C41 75 32 77 22 77 Z" fill="#123a8f" />
      {/* top wing */}
      <path d="M22 8 L86 8 C88 8 89 10 88 12 C78 32 52 44 22 44 Z" fill="url(#fl-a)" />
      {/* middle wing */}
      <path d="M22 36 L66 36 C68 36 69 38 68 40 C60 56 42 66 22 68 Z" fill="url(#fl-b)" />
      {/* bottom wing */}
      <path d="M22 62 L44 62 C46 62 47 64 46 66 C41 78 33 86 22 90 Z" fill="url(#fl-c)" />
    </svg>
  );
}
