import { z } from "zod";
import { DateTime } from "luxon";
import { KNOWN_IANA_ZONES } from "./timezones";

/** Email check that allows plus-addressing and unicode local parts. */
const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((s) => s.toLowerCase());

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((s) => DateTime.fromISO(s).isValid, "Invalid calendar date");

const zoneSchema = z
  .string()
  .min(3)
  .max(64)
  .refine((s) => {
    // Accept any IANA name Luxon can resolve, not just our state catalog,
    // so users can paste in unusual zones (e.g. AK Aleutians) if needed.
    if (KNOWN_IANA_ZONES.has(s)) return true;
    const probe = DateTime.now().setZone(s);
    return probe.isValid;
  }, "Unknown IANA timezone");

export const createReminderSchema = z.object({
  rsvDate: dateSchema,
  timezone: zoneSchema,
  email: emailSchema.optional(),
  remindOpen: z.boolean().default(false),
  remindClose: z.boolean().default(false),
  remindNoc: z.boolean().default(false),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const previewSchema = z.object({
  rsvDate: dateSchema,
  timezone: zoneSchema,
});

export type PreviewInput = z.infer<typeof previewSchema>;
