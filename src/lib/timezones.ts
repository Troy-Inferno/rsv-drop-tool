/**
 * IANA timezone catalog for the RSV Drop Tool.
 *
 * - `SOURCE_TZ` is the airline's operational source timezone used for all
 *   window-anchor times (0900 MT open, 0900 MT close, 1900 MT NOC).
 * - `STATE_TIMEZONES` maps US state codes to one or more IANA zones so
 *   users in multi-zone states can pick the correct one.
 *
 * Never hardcode UTC offsets. All conversions go through Luxon's IANA
 * support so DST transitions are handled correctly.
 */

export const SOURCE_TZ = "America/Denver" as const;

export interface TimezoneOption {
  label: string;
  iana: string;
}

export interface StateOption {
  code: string;
  name: string;
  zones: TimezoneOption[];
}

/**
 * State → IANA zone catalog. States with multiple zones list each
 * variant so the user can pick the one that matches their location.
 */
export const STATE_TIMEZONES: StateOption[] = [
  { code: "AL", name: "Alabama", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  {
    code: "AK",
    name: "Alaska",
    zones: [
      { label: "Alaska Time", iana: "America/Anchorage" },
      { label: "Hawaii-Aleutian Time", iana: "America/Adak" },
    ],
  },
  { code: "AZ", name: "Arizona", zones: [{ label: "Mountain Standard Time (no DST)", iana: "America/Phoenix" }, { label: "Mountain Time — Navajo Nation", iana: "America/Denver" }] },
  { code: "AR", name: "Arkansas", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  { code: "CA", name: "California", zones: [{ label: "Pacific Time", iana: "America/Los_Angeles" }] },
  { code: "CO", name: "Colorado", zones: [{ label: "Mountain Time", iana: "America/Denver" }] },
  { code: "CT", name: "Connecticut", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "DE", name: "Delaware", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "DC", name: "District of Columbia", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  {
    code: "FL",
    name: "Florida",
    zones: [
      { label: "Eastern Time", iana: "America/New_York" },
      { label: "Central Time (Panhandle)", iana: "America/Chicago" },
    ],
  },
  { code: "GA", name: "Georgia", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "HI", name: "Hawaii", zones: [{ label: "Hawaii-Aleutian Standard Time", iana: "Pacific/Honolulu" }] },
  {
    code: "ID",
    name: "Idaho",
    zones: [
      { label: "Mountain Time", iana: "America/Boise" },
      { label: "Pacific Time (Northern Idaho)", iana: "America/Los_Angeles" },
    ],
  },
  { code: "IL", name: "Illinois", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  {
    code: "IN",
    name: "Indiana",
    zones: [
      { label: "Eastern Time", iana: "America/Indiana/Indianapolis" },
      { label: "Central Time (Western IN)", iana: "America/Indiana/Knox" },
    ],
  },
  { code: "IA", name: "Iowa", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  {
    code: "KS",
    name: "Kansas",
    zones: [
      { label: "Central Time", iana: "America/Chicago" },
      { label: "Mountain Time (Western KS)", iana: "America/Denver" },
    ],
  },
  {
    code: "KY",
    name: "Kentucky",
    zones: [
      { label: "Eastern Time", iana: "America/New_York" },
      { label: "Central Time (Western KY)", iana: "America/Chicago" },
    ],
  },
  { code: "LA", name: "Louisiana", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  { code: "ME", name: "Maine", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "MD", name: "Maryland", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "MA", name: "Massachusetts", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  {
    code: "MI",
    name: "Michigan",
    zones: [
      { label: "Eastern Time", iana: "America/Detroit" },
      { label: "Central Time (UP)", iana: "America/Menominee" },
    ],
  },
  { code: "MN", name: "Minnesota", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  { code: "MS", name: "Mississippi", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  { code: "MO", name: "Missouri", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  { code: "MT", name: "Montana", zones: [{ label: "Mountain Time", iana: "America/Denver" }] },
  {
    code: "NE",
    name: "Nebraska",
    zones: [
      { label: "Central Time", iana: "America/Chicago" },
      { label: "Mountain Time (Western NE)", iana: "America/Denver" },
    ],
  },
  { code: "NV", name: "Nevada", zones: [{ label: "Pacific Time", iana: "America/Los_Angeles" }] },
  { code: "NH", name: "New Hampshire", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "NJ", name: "New Jersey", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "NM", name: "New Mexico", zones: [{ label: "Mountain Time", iana: "America/Denver" }] },
  { code: "NY", name: "New York", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "NC", name: "North Carolina", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  {
    code: "ND",
    name: "North Dakota",
    zones: [
      { label: "Central Time", iana: "America/Chicago" },
      { label: "Mountain Time (Western ND)", iana: "America/Denver" },
    ],
  },
  { code: "OH", name: "Ohio", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "OK", name: "Oklahoma", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  {
    code: "OR",
    name: "Oregon",
    zones: [
      { label: "Pacific Time", iana: "America/Los_Angeles" },
      { label: "Mountain Time (Malheur County)", iana: "America/Boise" },
    ],
  },
  { code: "PA", name: "Pennsylvania", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "RI", name: "Rhode Island", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "SC", name: "South Carolina", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  {
    code: "SD",
    name: "South Dakota",
    zones: [
      { label: "Central Time", iana: "America/Chicago" },
      { label: "Mountain Time (Western SD)", iana: "America/Denver" },
    ],
  },
  {
    code: "TN",
    name: "Tennessee",
    zones: [
      { label: "Central Time", iana: "America/Chicago" },
      { label: "Eastern Time (Eastern TN)", iana: "America/New_York" },
    ],
  },
  {
    code: "TX",
    name: "Texas",
    zones: [
      { label: "Central Time", iana: "America/Chicago" },
      { label: "Mountain Time (El Paso)", iana: "America/Denver" },
    ],
  },
  { code: "UT", name: "Utah", zones: [{ label: "Mountain Time", iana: "America/Denver" }] },
  { code: "VT", name: "Vermont", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "VA", name: "Virginia", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "WA", name: "Washington", zones: [{ label: "Pacific Time", iana: "America/Los_Angeles" }] },
  { code: "WV", name: "West Virginia", zones: [{ label: "Eastern Time", iana: "America/New_York" }] },
  { code: "WI", name: "Wisconsin", zones: [{ label: "Central Time", iana: "America/Chicago" }] },
  { code: "WY", name: "Wyoming", zones: [{ label: "Mountain Time", iana: "America/Denver" }] },
];

/** All IANA zones referenced by any state — useful for validation. */
export const KNOWN_IANA_ZONES: ReadonlySet<string> = new Set(
  STATE_TIMEZONES.flatMap((s) => s.zones.map((z) => z.iana)),
);

/** Find a state by code (case-insensitive). */
export function findState(code: string): StateOption | undefined {
  const upper = code.toUpperCase();
  return STATE_TIMEZONES.find((s) => s.code === upper);
}

/** Returns true if the IANA zone is one we list in our state catalog. */
export function isKnownZone(zone: string): boolean {
  return KNOWN_IANA_ZONES.has(zone);
}
