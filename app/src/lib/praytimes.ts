// Local prayer-times computation — port of the PrayTimes.org algorithm (LGPL,
// Hamid Zarrabi-Zadeh), the same calculation family AlAdhan API uses. Used as a
// resilient fallback when the AlAdhan API is unreachable from the client network.

export interface LocalPrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  imsak: string;
  midnight: string;
}

interface MethodParams {
  fajr: number;
  isha: number | { minutes: number };
  asrFactor: number;
  maghrib?: { minutes: number };
}

// AlAdhan method ids → parameters
export const METHOD_PARAMS: Record<number, MethodParams> = {
  1: { fajr: 18, isha: 18, asrFactor: 1 },          // Karachi
  2: { fajr: 15, isha: 15, asrFactor: 1 },          // ISNA
  3: { fajr: 18, isha: 17, asrFactor: 1 },          // MWL
  4: { fajr: 18.5, isha: { minutes: 90 }, asrFactor: 1 }, // Umm al-Qura
  5: { fajr: 19.5, isha: 17.5, asrFactor: 1 },      // Egypt
  8: { fajr: 19.5, isha: { minutes: 90 }, asrFactor: 1 }, // Gulf
  9: { fajr: 18, isha: 17.5, asrFactor: 1 },        // Kuwait
  10: { fajr: 18, isha: { minutes: 90 }, asrFactor: 1 },  // Qatar
  11: { fajr: 20, isha: 18, asrFactor: 1 },         // Singapore
  12: { fajr: 12, isha: 12, asrFactor: 1 },         // UOIF France
  13: { fajr: 18, isha: 17, asrFactor: 1 },         // Diyanet Turkey
  14: { fajr: 16, isha: 14, asrFactor: 1 },         // Russia
  16: { fajr: 18, isha: 18, asrFactor: 1 },         // India (University of Islamic Sciences approx)
};

const dtr = (d: number) => (d * Math.PI) / 180;
const rtd = (r: number) => (r * 180) / Math.PI;

function julianDay(y: number, m: number, d: number): number {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd: number): { declination: number; equation: number } {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(dtr(g)) + 0.02 * Math.sin(dtr(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15;
  const declination = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))));
  const equation = q / 15 - (RA < 0 ? RA + 24 : RA);
  return { declination, equation };
}

function midDay(jd: number, lng: number): number {
  const { equation } = sunPosition(jd);
  return 12 - equation - lng / 15; // hours UTC at solar noon
}

function sunAngleTime(jd: number, lat: number, lng: number, angle: number, direction: 1 | -1): number {
  const { declination, equation } = sunPosition(jd);
  const noon = 12 - equation - lng / 15;
  const cosH =
    (-Math.sin(dtr(angle)) - Math.sin(dtr(declination)) * Math.sin(dtr(lat))) /
    (Math.cos(dtr(declination)) * Math.cos(dtr(lat)));
  if (cosH > 1 || cosH < -1) return NaN; // sun never reaches this angle (polar regions)
  const t = rtd(Math.acos(cosH)) / 15;
  return noon + (direction === 1 ? t : -t);
}

function asrTime(jd: number, lat: number, lng: number, factor: number): number {
  const { declination, equation } = sunPosition(jd);
  const noon = 12 - equation - lng / 15;
  const angle = -rtd(Math.atan(1 / (factor + Math.tan(dtr(Math.abs(lat - declination))))));
  return sunAngleTimeRaw(declination, lat, angle, noon);
}

function sunAngleTimeRaw(declination: number, lat: number, angle: number, noon: number): number {
  const cosH =
    (-Math.sin(dtr(angle)) - Math.sin(dtr(declination)) * Math.sin(dtr(lat))) /
    (Math.cos(dtr(declination)) * Math.cos(dtr(lat)));
  if (cosH > 1 || cosH < -1) return NaN;
  return noon + rtd(Math.acos(cosH)) / 15;
}

function fmtTime(hoursUTC: number, tzOffsetHours: number): string {
  let h = (hoursUTC + tzOffsetHours) % 24;
  if (h < 0) h += 24;
  if (!Number.isFinite(h)) return "--:--";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const m2 = mm === 60 ? 0 : mm;
  const h2 = mm === 60 ? (hh + 1) % 24 : hh;
  return `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`;
}

import tzLookup from "tz-lookup";

/** offset (hours) of an IANA timezone at a given date */
function tzOffsetHoursAt(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return (asUTC - date.getTime()) / 3600000;
}

export function computePrayerTimes(lat: number, lng: number, method: number, date = new Date()): { times: LocalPrayerTimes; timeZone: string } {
  const params = METHOD_PARAMS[method] ?? METHOD_PARAMS[4];
  // use the *location's* civil date and timezone, not the viewer's
  let timeZone: string;
  try {
    timeZone = tzLookup(lat, lng);
  } catch {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  const offset = tzOffsetHoursAt(date, timeZone);
  // civil date at the location
  const locMs = date.getTime() + offset * 3600000;
  const locDate = new Date(locMs);
  const jd = julianDay(locDate.getUTCFullYear(), locDate.getUTCMonth() + 1, locDate.getUTCDate());

  const fajrH = sunAngleTime(jd, lat, lng, params.fajr, -1);
  const sunriseH = sunAngleTime(jd, lat, lng, 0.833, -1);
  const dhuhrH = midDay(jd, lng) + 2 / 60; // +2 دقائق احتياط
  const asrH = asrTime(jd, lat, lng, params.asrFactor);
  const maghribH = params.maghrib?.minutes != null
    ? sunAngleTime(jd, lat, lng, 0.833, 1) + params.maghrib.minutes / 60
    : sunAngleTime(jd, lat, lng, 0.833, 1);
  const ishaH =
    typeof params.isha === "object"
      ? maghribH + params.isha.minutes / 60
      : sunAngleTime(jd, lat, lng, params.isha as number, 1);

  const imsakH = fajrH - 10 / 60;
  const midnightH = maghribH + ((fajrH + 24 - maghribH) % 24) / 2; // منتصف الليل الشرعي تقريبًا

  return {
    times: {
      fajr: fmtTime(fajrH, offset),
      sunrise: fmtTime(sunriseH, offset),
      dhuhr: fmtTime(dhuhrH, offset),
      asr: fmtTime(asrH, offset),
      maghrib: fmtTime(maghribH, offset),
      isha: fmtTime(ishaH, offset),
      imsak: fmtTime(imsakH, offset),
      midnight: fmtTime(midnightH, offset),
    },
    timeZone,
  };
}

// Hijri date via the browser's built-in Umm al-Qura calendar
export function hijriDate(date = new Date()): { day: string; monthAr: string; monthNumber: number; year: string; weekdayAr: string } {
  const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const numParts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).formatToParts(date);
  const monthNumber = Number(numParts.find((p) => p.type === "month")?.value ?? 0);
  return {
    weekdayAr: get("weekday"),
    day: get("day"),
    monthAr: get("month"),
    monthNumber,
    year: get("year").replace(/[^0-9٠-٩]/g, ""),
  };
}
