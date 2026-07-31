// Exclusivity records: every account carries one, tied to its Account Owner.
// Status is always COMPUTED from the dates (never stored), so a record flips
// Active → Expiring Soon → Expired on its own as time passes.

const DAY = 86400000;
export const EXCLUSIVITY_MONTHS = 6;
export const EXPIRING_SOON_DAYS = 30;

const iso = (d) => d.toISOString().slice(0, 10);

export function addMonths(dateStr, months) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return iso(d);
}

// Build a fresh 6-month record for an owner, starting today by default.
export function newExclusivity(owner, startDate = iso(new Date())) {
  return {
    owner,
    startDate,
    endDate: addMonths(startDate, EXCLUSIVITY_MONTHS),
    challengeStatus: "None",
  };
}

// Active / Expiring Soon / Expired — or null when there's no record.
export function exclusivityStatus(exclusivity, today = new Date()) {
  if (!exclusivity || !exclusivity.endDate) return null;
  const end = new Date(exclusivity.endDate + "T23:59:59Z");
  if (end < today) return "Expired";
  if ((end - today) / DAY <= EXPIRING_SOON_DAYS) return "Expiring Soon";
  return "Active";
}

// Decorate a record with its computed status (for API responses / display).
export function withStatus(exclusivity, today = new Date()) {
  if (!exclusivity) return null;
  return { ...exclusivity, status: exclusivityStatus(exclusivity, today) || exclusivity.status || "None" };
}
