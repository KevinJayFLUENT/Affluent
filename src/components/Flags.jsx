import React from "react";

// Tiny inline SVG country flags (emoji flags don't render on Windows).
const FLAGS = {
  US: (
    <svg viewBox="0 0 20 14" className="flag">
      <rect width="20" height="14" fill="#ffffff" />
      {[1, 3, 5, 7, 9, 11, 13].map((y) => (
        <rect key={y} y={y} width="20" height="1" fill="#b22234" />
      ))}
      <rect width="9" height="7" fill="#3c3b6e" />
    </svg>
  ),
  CA: (
    <svg viewBox="0 0 20 14" className="flag">
      <rect width="20" height="14" fill="#ffffff" />
      <rect width="5" height="14" fill="#d52b1e" />
      <rect x="15" width="5" height="14" fill="#d52b1e" />
      <path d="M10 3 L11 5.4 L13.2 4.8 L12 7 L13.6 8.2 L11.2 8.6 L11.4 11 L10 9.4 L8.6 11 L8.8 8.6 L6.4 8.2 L8 7 L6.8 4.8 L9 5.4 Z" fill="#d52b1e" />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 20 14" className="flag">
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#ffffff" strokeWidth="2.8" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" strokeWidth="1.2" />
      <path d="M10 0 V14 M0 7 H20" stroke="#ffffff" strokeWidth="4.6" />
      <path d="M10 0 V14 M0 7 H20" stroke="#c8102e" strokeWidth="2.6" />
    </svg>
  ),
};

const NORMALIZE = { "united states": "US", us: "US", usa: "US", canada: "CA", ca: "CA", "united kingdom": "GB", uk: "GB", gb: "GB" };

export function countryOf(target) {
  const raw = (target.details?.scraping?.hqCountry || "US").toLowerCase();
  return NORMALIZE[raw] || raw.toUpperCase();
}

export default function Flag({ country }) {
  return FLAGS[country] || (
    <svg viewBox="0 0 20 14" className="flag">
      <rect width="20" height="14" rx="2" fill="#e5e7eb" />
      <circle cx="10" cy="7" r="4" fill="none" stroke="#9ca3af" strokeWidth="1.2" />
      <path d="M6 7 H14 M10 3 C12 5 12 9 10 11 C8 9 8 5 10 3" fill="none" stroke="#9ca3af" strokeWidth="0.9" />
    </svg>
  );
}
