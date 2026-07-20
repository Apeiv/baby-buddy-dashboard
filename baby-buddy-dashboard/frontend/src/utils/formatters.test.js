import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getAge,
  formatElapsed,
  timeAgo,
  parseDuration,
  formatDuration,
  parseDurationHours,
  formatDurationString,
  formatElapsedHM,
  formatDueLabel,
  getMedicationStatus,
  dailyDiaperTotals,
  buildDailyMeasurementsReport,
  toFeedingTimeline,
} from "./formatters";

const NOW = new Date("2026-07-20T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getAge", () => {
  it("returns days for a baby under a month old", () => {
    expect(getAge(new Date("2026-07-10T12:00:00.000Z").toISOString())).toBe("10 days");
  });

  it("returns months and days for a baby under a year old", () => {
    expect(getAge(new Date("2026-03-05T12:00:00.000Z").toISOString())).toBe("4mo 15d");
  });

  it("returns whole years with no remainder", () => {
    expect(getAge(new Date("2024-07-20T12:00:00.000Z").toISOString())).toBe("2y");
  });

  it("returns years and months when there is a remainder", () => {
    expect(getAge(new Date("2024-01-20T12:00:00.000Z").toISOString())).toBe("2y 6mo");
  });
});

describe("formatElapsed", () => {
  it("pads minutes and seconds", () => {
    expect(formatElapsed(65)).toBe("01:05");
    expect(formatElapsed(5)).toBe("00:05");
    expect(formatElapsed(3600)).toBe("60:00");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' under a minute", () => {
    expect(timeAgo(new Date(NOW.getTime() - 30_000).toISOString())).toBe("just now");
  });

  it("returns minutes under an hour", () => {
    expect(timeAgo(new Date(NOW.getTime() - 5 * 60_000).toISOString())).toBe("5m ago");
  });

  it("returns hours and minutes under a day", () => {
    expect(timeAgo(new Date(NOW.getTime() - (2 * 3600_000 + 15 * 60_000)).toISOString())).toBe("2h 15m ago");
  });

  it("omits minutes when exactly on the hour", () => {
    expect(timeAgo(new Date(NOW.getTime() - 3 * 3600_000).toISOString())).toBe("3h ago");
  });

  it("returns days and hours beyond a day", () => {
    expect(timeAgo(new Date(NOW.getTime() - (2 * 86400_000 + 5 * 3600_000)).toISOString())).toBe("2d 5h ago");
  });
});

describe("parseDuration / formatDuration", () => {
  it("parses HH:MM:SS", () => {
    expect(parseDuration("01:30:00")).toBeCloseTo(1.5);
  });

  it("parses MM:SS", () => {
    expect(parseDuration("30:00")).toBe(30);
  });

  it("returns 0 for falsy input", () => {
    expect(parseDuration(null)).toBe(0);
    expect(parseDuration("")).toBe(0);
  });

  it("formats sub-hour durations as minutes", () => {
    expect(formatDuration("00:20:00")).toBe("20m");
  });

  it("formats hour-plus durations with one decimal", () => {
    expect(formatDuration("01:30:00")).toBe("1.5h");
  });

  it("formats missing duration as an em dash", () => {
    expect(formatDuration(null)).toBe("—");
  });
});

describe("parseDurationHours (Baby Buddy DurationField format)", () => {
  it("parses plain HH:MM:SS", () => {
    expect(parseDurationHours("06:00:00")).toBe(6);
  });

  it("parses a days-prefixed duration for intervals >= 24h", () => {
    expect(parseDurationHours("1 00:00:00")).toBe(24);
  });

  it("returns null for empty/zero input", () => {
    expect(parseDurationHours(null)).toBeNull();
    expect(parseDurationHours("")).toBeNull();
    expect(parseDurationHours("00:00:00")).toBeNull();
  });
});

describe("formatDurationString", () => {
  it("round-trips whole and fractional hours into HH:MM:00", () => {
    expect(formatDurationString(6)).toBe("06:00:00");
    expect(formatDurationString(1.5)).toBe("01:30:00");
    expect(formatDurationString(24)).toBe("24:00:00");
  });
});

describe("formatElapsedHM", () => {
  it("shows only minutes under an hour", () => {
    expect(formatElapsedHM(45 * 60_000)).toBe("45m");
  });

  it("shows hours and minutes, omitting minutes when exact", () => {
    expect(formatElapsedHM(90 * 60_000)).toBe("1h 30m");
    expect(formatElapsedHM(120 * 60_000)).toBe("2h");
  });
});

describe("formatDueLabel", () => {
  it("reports overdue doses with elapsed time", () => {
    const dueAt = new Date(NOW.getTime() - 90 * 60_000);
    expect(formatDueLabel(dueAt)).toBe("Overdue by 1h 30m");
  });

  it("labels a dose due later today", () => {
    const dueAt = new Date(NOW.getTime() + 2 * 3600_000);
    expect(formatDueLabel(dueAt)).toMatch(/^Next: Today at/);
  });

  it("labels a dose due tomorrow", () => {
    const dueAt = new Date(NOW);
    dueAt.setDate(dueAt.getDate() + 1);
    expect(formatDueLabel(dueAt)).toMatch(/^Next: Tomorrow at/);
  });
});

describe("getMedicationStatus", () => {
  it("only considers doses with a next_dose_interval set", () => {
    const meds = [{ name: "Vitamin D", time: NOW.toISOString(), next_dose_interval: null }];
    expect(getMedicationStatus(meds)).toEqual([]);
  });

  it("flags a dose as overdue once past its interval", () => {
    const meds = [
      { name: "Tylenol", time: new Date(NOW.getTime() - 8 * 3600_000).toISOString(), next_dose_interval: "06:00:00" },
    ];
    const [status] = getMedicationStatus(meds);
    expect(status.overdue).toBe(true);
    expect(status.name).toBe("Tylenol");
  });

  it("uses only the most recent dose per medication name", () => {
    const meds = [
      { name: "Tylenol", time: new Date(NOW.getTime() - 8 * 3600_000).toISOString(), next_dose_interval: "06:00:00" },
      { name: "Tylenol", time: new Date(NOW.getTime() - 1 * 3600_000).toISOString(), next_dose_interval: "06:00:00" },
    ];
    const statuses = getMedicationStatus(meds);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].overdue).toBe(false);
  });
});

describe("dailyDiaperTotals", () => {
  it("counts changes on their calendar day and trims leading empty days", () => {
    const changes = [{ time: NOW.toISOString() }, { time: NOW.toISOString() }];
    const result = dailyDiaperTotals(changes, 5);
    expect(result[result.length - 1].count).toBe(2);
    expect(result[0].count).toBeGreaterThan(0);
  });

  it("returns all-zero days untouched when there are no entries", () => {
    const result = dailyDiaperTotals([], 3);
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });
});

describe("buildDailyMeasurementsReport", () => {
  it("places each metric on its own date row and leaves gaps null", () => {
    const dateStr = NOW.toISOString().slice(0, 10);
    const report = buildDailyMeasurementsReport(
      [{ date: dateStr, weight: 4.2 }],
      [],
      [{ date: dateStr, head_circumference: 38 }],
      [],
      3
    );
    const today = report[report.length - 1];
    expect(today.weight).toBe(4.2);
    expect(today.headCircumference).toBe(38);
    expect(today.height).toBeNull();
    expect(today.bmi).toBeNull();
  });
});

describe("toFeedingTimeline", () => {
  // Most-recent-first, matching the "-start" ordering the API/mock data always use.
  const feedings = [
    { start: new Date(NOW.getTime() - 30 * 60_000).toISOString(), amount: 120 },
    { start: new Date(NOW.getTime() - 73 * 60_000).toISOString(), amount: 150 },
    { start: new Date(NOW.getTime() - 130 * 60_000).toISOString(), amount: 130 },
  ];

  it("shows time-since-now only for the most recent feeding", () => {
    const [latest] = toFeedingTimeline(feedings);
    expect(latest.detail).toBe("30m ago");
  });

  it("shows the gap to the next (more recent) feeding for every other entry", () => {
    const timeline = toFeedingTimeline(feedings);
    // 73m ago -> 30m ago is a 43 minute gap
    expect(timeline[1].detail).toBe("43m gap");
    // 130m ago -> 73m ago is a 57 minute gap
    expect(timeline[2].detail).toBe("57m gap");
  });
});
