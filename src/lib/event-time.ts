import type { EconomicEvent } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

// Synced events (id prefix "auto-") are stored in UTC; manually added ones are
// stored exactly as the user typed them. Only the former are converted here.
export function formatEventWhen(event: Pick<EconomicEvent, "id" | "date" | "time">): string {
  const raw = `${event.date} ${event.time}`.trim();
  if (!event.id.startsWith("auto-") || !event.time) return raw;

  const when = new Date(`${event.date}T${event.time}Z`);
  if (Number.isNaN(when.getTime())) return raw;

  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(when)
    .find((part) => part.type === "timeZoneName")?.value;

  const local = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
  return zone ? `${local} ${zone}` : local;
}
