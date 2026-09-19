import { beforeAll, describe, expect, it } from "vitest";
import { formatEventWhen } from "./event-time";

beforeAll(() => {
  // Fixed zone so results don't depend on the machine running the tests.
  process.env.TZ = "America/New_York";
});

describe("formatEventWhen", () => {
  it("converts synced (auto-) events from UTC to local time with a weekday and zone tag", () => {
    expect(formatEventWhen({ id: "auto-2026-09-16-fomc-statement", date: "2026-09-16", time: "18:00:00" })).toBe(
      "Wed 2026-09-16 14:00 EDT"
    );
  });

  it("rolls the date and weekday back when the conversion crosses midnight", () => {
    // 02:00 UTC on Friday 2026-01-02 is Thursday evening in New York.
    expect(formatEventWhen({ id: "auto-2026-01-02-nfp", date: "2026-01-02", time: "02:00:00" })).toBe(
      "Thu 2026-01-01 21:00 EST"
    );
  });

  it("adds the weekday to manually added events without changing the time", () => {
    expect(formatEventWhen({ id: "3f1c2a9e-0000-4000-8000-000000000000", date: "2026-09-16", time: "09:30" })).toBe(
      "Wed 2026-09-16 09:30"
    );
  });

  it("does not throw on an empty time or invalid date for synced events", () => {
    expect(formatEventWhen({ id: "auto-x", date: "2026-09-16", time: "" })).toBe("Wed 2026-09-16");
    expect(formatEventWhen({ id: "auto-x", date: "not-a-date", time: "18:00:00" })).toBe("not-a-date 18:00:00");
  });
});
