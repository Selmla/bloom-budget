import { BudgetPeriod } from "./types";

export const WEEKS_PER_MONTH = 4.345;

// Local calendar date as YYYY-MM-DD. Deliberately NOT date.toISOString() —
// that converts to UTC first, which silently shifts the date back by one day
// for anyone in a timezone ahead of UTC (e.g. Sweden, CET/CEST) whenever the
// local time is past midnight but still before UTC midnight.
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function daysLeftInWeek(): number {
  const now = new Date();
  const isoDay = now.getDay() || 7; // Monday=1 ... Sunday=7
  return 7 - isoDay;
}

export function addMonthOnDay(date: Date, day: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, day);
}

export function mostRecentOnDay(date: Date, day: number): Date {
  let d = new Date(date.getFullYear(), date.getMonth(), day);
  if (d > date) d = new Date(date.getFullYear(), date.getMonth() - 1, day);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function mostRecentMonday(date: Date): Date {
  const isoDay = date.getDay() || 7; // Monday=1 ... Sunday=7
  return addDays(date, -(isoDay - 1));
}

// Start/end (end exclusive) of the budget period containing `date`, for whichever
// period type is active. Weeks always run Monday–Sunday; months start on `startDay`.
export function periodBounds(date: Date, period: BudgetPeriod, startDay: number): [Date, Date] {
  if (period === "week") {
    const start = mostRecentMonday(date);
    return [start, addDays(start, 7)];
  }
  const start = mostRecentOnDay(date, startDay);
  return [start, addMonthOnDay(start, startDay)];
}

// The period immediately following one that ended at `prevEnd`.
export function nextPeriodBounds(prevEnd: Date, period: BudgetPeriod, startDay: number): [Date, Date] {
  if (period === "week") return [prevEnd, addDays(prevEnd, 7)];
  return [prevEnd, addMonthOnDay(prevEnd, startDay)];
}

const SHORT_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function cycleRangeLabel(anchorISO: string, endISO: string): string {
  const start = new Date(anchorISO);
  const end = new Date(endISO);
  end.setDate(end.getDate() - 1);
  return `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]} – ${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}`;
}

export function budgetRingColor(pctRemaining: number): string {
  if (pctRemaining >= 50) return "#2EC4B6";
  if (pctRemaining >= 20) return "#FFB627";
  return "#FF6B5B";
}

export function daysSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
}
