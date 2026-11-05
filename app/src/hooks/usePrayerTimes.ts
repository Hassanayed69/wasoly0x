import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchTimingsByCity, fetchTimingsByCoords, prayerMinutes, type PrayerKey, type PrayerTimings } from "@/lib/api";

export interface LocationPref {
  mode: "coords" | "city";
  lat?: number;
  lng?: number;
  city?: string;
  country?: string;
  label?: string;
}

const LOC_KEY = "wusuli.location";
const METHOD_KEY = "wusuli.method";

export function loadLocationPref(): LocationPref | null {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    return raw ? (JSON.parse(raw) as LocationPref) : null;
  } catch {
    return null;
  }
}

export function saveLocationPref(p: LocationPref) {
  localStorage.setItem(LOC_KEY, JSON.stringify(p));
}

export function loadMethod(): number {
  const v = Number(localStorage.getItem(METHOD_KEY));
  return Number.isFinite(v) && v > 0 ? v : 4;
}

export function saveMethod(m: number) {
  localStorage.setItem(METHOD_KEY, String(m));
}

export interface PrayerState {
  data: PrayerTimings | null;
  loading: boolean;
  error: string | null;
  location: LocationPref | null;
  method: number;
  next: { key: PrayerKey; minutes: number } | null;
  countdown: string;
  progressPct: number;
  setCity: (city: string, country: string) => void;
  useGeolocation: () => void;
  setMethod: (m: number) => void;
  refresh: () => void;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function usePrayerTimes(): PrayerState {
  const [location, setLocation] = useState<LocationPref | null>(() => loadLocationPref());
  const [method, setMethodState] = useState<number>(() => loadMethod());
  const [data, setData] = useState<PrayerTimings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const locRef = useRef(location);
  locRef.current = location;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (loc: LocationPref | null, m: number) => {
    if (!loc) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d =
        loc.mode === "coords" && loc.lat != null && loc.lng != null
          ? await fetchTimingsByCoords(loc.lat, loc.lng, m)
          : await fetchTimingsByCity(loc.city ?? "", loc.country ?? "", m);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر جلب المواقيت");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(location, method);
  }, [location, method, load]);

  const setCity = useCallback((city: string, country: string) => {
    const p: LocationPref = { mode: "city", city, country, label: `${city}، ${country}` };
    saveLocationPref(p);
    setLocation(p);
  }, []);

  const useGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: LocationPref = {
          mode: "coords",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "موقعك الحالي",
        };
        saveLocationPref(p);
        setLocation(p);
      },
      () => {
        setLoading(false);
        setError("تعذر تحديد الموقع — يمكنك اختيار مدينتك يدويًا");
      },
      { timeout: 12000 },
    );
  }, []);

  const setMethod = useCallback((m: number) => {
    saveMethod(m);
    setMethodState(m);
  }, []);

  const { next, countdown, progressPct } = useMemo(() => {
    if (!data) return { next: null, countdown: "--:--:--", progressPct: 0 };
    const list = prayerMinutes(data.timings);
    // "now" expressed in the *location's* timezone so browsing another city stays correct
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: data.meta.timezone || undefined, hour12: false,
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    const curMin = Number(g("hour")) % 24 * 60 + Number(g("minute")) + Number(g("second")) / 60;
    const locMidnight = Date.UTC(Number(g("year")), Number(g("month")) - 1, Number(g("day")));
    const nowLocMs = locMidnight + curMin * 60000;

    let nx = list.find((p) => p.minutes > curMin) ?? null;
    let prev = [...list].reverse().find((p) => p.minutes <= curMin) ?? null;
    let targetDay = locMidnight;
    if (!nx) {
      // بعد العشاء: الصلاة القادمة فجر الغد
      nx = list[0];
      targetDay = locMidnight + 86400000;
    }
    const ms = targetDay + nx.minutes * 60000 - nowLocMs;
    const span = prev ? nx.minutes - prev.minutes : 0;
    const elapsed = prev ? curMin - prev.minutes : 0;
    const pct = span > 0 ? Math.min(100, Math.max(0, (elapsed / span) * 100)) : 0;
    return { next: nx, countdown: fmtCountdown(ms), progressPct: pct };
  }, [data, now]);

  return {
    data, loading, error, location, method, next, countdown, progressPct,
    setCity, useGeolocation, setMethod,
    refresh: () => load(locRef.current, method),
  };
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
