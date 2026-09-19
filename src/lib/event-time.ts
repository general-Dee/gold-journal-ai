import type { EconomicEvent } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");

function withWeekday(day: Date, text: string): string {
  return Number.isNaN(day.getTime()) ? text : `${WEEKDAYS[day.getDay()]} ${text}`;
}

// Synced events (id prefix "auto-") are stored in UTC; manually added ones are
// stored exactly as the user typed them. Only the former are converted here.
export function formatEventWhen(event: Pick<EconomicEvent, "id" | "date" | "time">): string {
  const raw = `${event.date} ${event.time}`.trim();

  if (event.id.startsWith("auto-") && event.time) {
    const when = new Date(`${event.date}T${event.time}Z`);
    if (!Number.isNaN(when.getTime())) {
      const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(when)
        .find((part) => part.type === "timeZoneName")?.value;

      const local = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
      return withWeekday(when, zone ? `${local} ${zone}` : local);
    }
  }

  // Parse as a local calendar date; `new Date("YYYY-MM-DD")` is UTC and can land on the wrong day.
  const [y, m, d] = event.date.split("-").map(Number);
  return withWeekday(new Date(y, m - 1, d), raw);
}
