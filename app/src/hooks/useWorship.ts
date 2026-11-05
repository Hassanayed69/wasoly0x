import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { todayKey } from "@/hooks/usePrayerTimes";
import type { PrayerKey } from "@/lib/api";

// Dual-mode stores: authenticated users sync to the database via tRPC;
// guests keep data in localStorage with a visible notice in the UI.

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, v: unknown) {
  localStorage.setItem(key, JSON.stringify(v));
}

// ---------------- Prayer tracker ----------------
export function usePrayerTracker(day: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const authedDay = trpc.tracker.getDay.useQuery({ day }, { enabled: isAuthenticated });
  const toggleMut = trpc.tracker.toggle.useMutation({
    onSuccess: () => utils.tracker.invalidate(),
  });

  const [guestDays, setGuestDays] = useState<Record<string, PrayerKey[]>>(() =>
    readJSON("wusuli.prayers", {}),
  );

  const completed: PrayerKey[] = useMemo(() => {
    if (isAuthenticated) return (authedDay.data ?? []) as PrayerKey[];
    return guestDays[day] ?? [];
  }, [isAuthenticated, authedDay.data, guestDays, day]);

  const toggle = useCallback(
    (prayer: PrayerKey) => {
      if (isAuthenticated) {
        toggleMut.mutate({ day, prayer });
      } else {
        setGuestDays((prev) => {
          const list = prev[day] ?? [];
          const next = list.includes(prayer)
            ? list.filter((p) => p !== prayer)
            : [...list, prayer];
          const merged = { ...prev, [day]: next };
          writeJSON("wusuli.prayers", merged);
          return merged;
        });
      }
    },
    [isAuthenticated, day, toggleMut],
  );

  return { completed, toggle, isAuthenticated, authLoading };
}

export function usePrayerStats() {
  const { isAuthenticated } = useAuth();
  const authed = trpc.tracker.stats.useQuery(undefined, { enabled: isAuthenticated });
  const [guestDays] = useState<Record<string, PrayerKey[]>>(() => readJSON("wusuli.prayers", {}));

  return useMemo(() => {
    if (isAuthenticated && authed.data) return authed.data;
    // guest stats from localStorage
    const days = Object.entries(guestDays)
      .map(([day, arr]) => ({ day, count: arr.length }))
      .sort((a, b) => (a.day < b.day ? 1 : -1));
    const full = new Set(days.filter((d) => d.count >= 5).map((d) => d.day));
    let streak = 0;
    const d = new Date();
    if (!full.has(todayKey(d))) d.setDate(d.getDate() - 1);
    while (full.has(todayKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return { days, streak, total: days.reduce((s, x) => s + x.count, 0) };
  }, [isAuthenticated, authed.data, guestDays]);
}

export function usePrayerHistory(from: string, to: string) {
  const { isAuthenticated } = useAuth();
  const authed = trpc.tracker.history.useQuery({ from, to }, { enabled: isAuthenticated });
  const [guestDays] = useState<Record<string, PrayerKey[]>>(() => readJSON("wusuli.prayers", {}));
  return useMemo(() => {
    if (isAuthenticated) return authed.data ?? {};
    const out: Record<string, string[]> = {};
    for (const [day, arr] of Object.entries(guestDays)) {
      if (day >= from && day <= to) out[day] = arr;
    }
    return out;
  }, [isAuthenticated, authed.data, guestDays, from, to]);
}

// ---------------- Tasbeeh ----------------
export function useTasbeeh() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const authed = trpc.azkar.getTasbeeh.useQuery(undefined, { enabled: isAuthenticated });
  const bumpMut = trpc.azkar.bumpTasbeeh.useMutation({
    onSuccess: () => utils.azkar.getTasbeeh.invalidate(),
  });
  const resetMut = trpc.azkar.resetTasbeeh.useMutation({
    onSuccess: () => utils.azkar.getTasbeeh.invalidate(),
  });
  const targetMut = trpc.azkar.setTasbeehTarget.useMutation({
    onSuccess: () => utils.azkar.getTasbeeh.invalidate(),
  });

  const [guest, setGuest] = useState(() =>
    readJSON("wusuli.tasbeeh", { count: 0, lifetime: 0, target: 100 }),
  );

  const state = isAuthenticated && authed.data ? authed.data : guest;

  const bump = useCallback(
    (delta = 1) => {
      if (isAuthenticated) bumpMut.mutate({ delta });
      else
        setGuest((g) => {
          const n = { ...g, count: g.count + delta, lifetime: g.lifetime + delta };
          writeJSON("wusuli.tasbeeh", n);
          return n;
        });
    },
    [isAuthenticated, bumpMut],
  );

  const reset = useCallback(() => {
    if (isAuthenticated) resetMut.mutate();
    else
      setGuest((g) => {
        const n = { ...g, count: 0 };
        writeJSON("wusuli.tasbeeh", n);
        return n;
      });
  }, [isAuthenticated, resetMut]);

  const setTarget = useCallback(
    (target: number) => {
      if (isAuthenticated) targetMut.mutate({ target });
      else
        setGuest((g) => {
          const n = { ...g, target };
          writeJSON("wusuli.tasbeeh", n);
          return n;
        });
    },
    [isAuthenticated, targetMut],
  );

  return { count: state.count, lifetime: state.lifetime, target: state.target, bump, reset, setTarget, isAuthenticated };
}

// ---------------- Azkar progress & favorites ----------------
export function useAzkarProgress(day: string) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const authed = trpc.azkar.getProgress.useQuery({ day }, { enabled: isAuthenticated });
  const setMut = trpc.azkar.setProgress.useMutation({
    onSuccess: () => utils.azkar.getProgress.invalidate(),
  });

  const [guestAll, setGuestAll] = useState<Record<string, Record<string, number>>>(() =>
    readJSON("wusuli.azkarProgress", {}),
  );

  const progress: Record<string, number> = useMemo(() => {
    if (isAuthenticated) return authed.data ?? {};
    return guestAll[day] ?? {};
  }, [isAuthenticated, authed.data, guestAll, day]);

  const set = useCallback(
    (azkarId: string, count: number) => {
      if (isAuthenticated) setMut.mutate({ day, azkarId, count });
      else
        setGuestAll((prev) => {
          const merged = { ...prev, [day]: { ...(prev[day] ?? {}), [azkarId]: count } };
          writeJSON("wusuli.azkarProgress", merged);
          return merged;
        });
    },
    [isAuthenticated, day, setMut],
  );

  return { progress, set, isAuthenticated };
}

export function useAzkarFavorites() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const authed = trpc.azkar.favorites.useQuery(undefined, { enabled: isAuthenticated });
  const toggleMut = trpc.azkar.toggleFavorite.useMutation({
    onSuccess: () => utils.azkar.favorites.invalidate(),
  });

  const [guest, setGuest] = useState<string[]>(() => readJSON("wusuli.azkarFav", []));

  const favorites: string[] = isAuthenticated ? authed.data ?? [] : guest;

  const toggle = useCallback(
    (azkarId: string) => {
      if (isAuthenticated) toggleMut.mutate({ azkarId });
      else
        setGuest((prev) => {
          const next = prev.includes(azkarId) ? prev.filter((x) => x !== azkarId) : [...prev, azkarId];
          writeJSON("wusuli.azkarFav", next);
          return next;
        });
    },
    [isAuthenticated, toggleMut],
  );

  return { favorites, toggle, isAuthenticated };
}

// ---------------- Quran bookmarks & reading position ----------------
export interface Bookmark {
  surah: number;
  verse: number;
}

export function useQuranUserData() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const authedBm = trpc.quran.bookmarks.useQuery(undefined, { enabled: isAuthenticated });
  const toggleBmMut = trpc.quran.toggleBookmark.useMutation({
    onSuccess: () => utils.quran.bookmarks.invalidate(),
  });
  const authedProgress = trpc.quran.getProgress.useQuery(undefined, { enabled: isAuthenticated });
  const setPosMut = trpc.quran.setPosition.useMutation({
    onSuccess: () => utils.quran.getProgress.invalidate(),
  });
  const setGoalMut = trpc.quran.setGoal.useMutation({
    onSuccess: () => utils.quran.getProgress.invalidate(),
  });

  const [guestBm, setGuestBm] = useState<Bookmark[]>(() => readJSON("wusuli.quranBm", []));
  const [guestPos, setGuestPos] = useState(() =>
    readJSON("wusuli.quranPos", { lastSurah: 1, lastVerse: 1, dailyGoalVerses: 10 }),
  );

  const bookmarks: Bookmark[] = useMemo(() => {
    if (isAuthenticated) return (authedBm.data ?? []).map((b) => ({ surah: b.surah, verse: b.verse }));
    return guestBm;
  }, [isAuthenticated, authedBm.data, guestBm]);

  const toggleBookmark = useCallback(
    (surah: number, verse: number) => {
      if (isAuthenticated) toggleBmMut.mutate({ surah, verse });
      else
        setGuestBm((prev) => {
          const has = prev.some((b) => b.surah === surah && b.verse === verse);
          const next = has ? prev.filter((b) => !(b.surah === surah && b.verse === verse)) : [...prev, { surah, verse }];
          writeJSON("wusuli.quranBm", next);
          return next;
        });
    },
    [isAuthenticated, toggleBmMut],
  );

  const position = isAuthenticated && authedProgress.data
    ? { lastSurah: authedProgress.data.lastSurah, lastVerse: authedProgress.data.lastVerse, dailyGoalVerses: authedProgress.data.dailyGoalVerses }
    : guestPos;

  const setPosition = useCallback(
    (surah: number, verse: number) => {
      if (isAuthenticated) setPosMut.mutate({ surah, verse });
      else
        setGuestPos((p) => {
          const n = { ...p, lastSurah: surah, lastVerse: verse };
          writeJSON("wusuli.quranPos", n);
          return n;
        });
    },
    [isAuthenticated, setPosMut],
  );

  const setGoal = useCallback(
    (dailyGoalVerses: number) => {
      if (isAuthenticated) setGoalMut.mutate({ dailyGoalVerses });
      else
        setGuestPos((p) => {
          const n = { ...p, dailyGoalVerses };
          writeJSON("wusuli.quranPos", n);
          return n;
        });
    },
    [isAuthenticated, setGoalMut],
  );

  return { bookmarks, toggleBookmark, position, setPosition, setGoal, isAuthenticated };
}

export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
