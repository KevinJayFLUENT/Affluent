import React from "react";

// Unified inline icon set (lucide-style paths). stroke: currentColor so
// icons inherit text color everywhere.
const Icon = ({ size = 14, children, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, verticalAlign: "-0.12em", ...style }}
  >
    {children}
  </svg>
);

export const Zap = (p) => (
  <Icon {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none" /></Icon>
);
export const ArrowUpRight = (p) => (
  <Icon {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Icon>
);
export const ArrowDownLeft = (p) => (
  <Icon {...p}><path d="M17 7 7 17" /><path d="M16 17H7V8" /></Icon>
);
export const Check = (p) => (
  <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>
);
export const X = (p) => (
  <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
);
export const FastForward = (p) => (
  <Icon {...p}><polygon points="13 19 22 12 13 5 13 19" fill="currentColor" stroke="none" /><polygon points="2 19 11 12 2 5 2 19" fill="currentColor" stroke="none" /></Icon>
);
export const Mail = (p) => (
  <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Icon>
);
export const RotateCcw = (p) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Icon>
);
export const FileText = (p) => (
  <Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M10 13h6" /><path d="M10 17h6" /></Icon>
);
export const ChevronDown = (p) => (
  <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
);
export const ChevronUp = (p) => (
  <Icon {...p}><path d="m18 15-6-6-6 6" /></Icon>
);
export const Play = (p) => (
  <Icon {...p}><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" /></Icon>
);
export const TrendingUp = (p) => (
  <Icon {...p}><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></Icon>
);
export const CalendarClock = (p) => (
  <Icon {...p}><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M12 14v3l2 1" /></Icon>
);
export const ClipboardList = (p) => (
  <Icon {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /></Icon>
);
export const Gauge = (p) => (
  <Icon {...p}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></Icon>
);
