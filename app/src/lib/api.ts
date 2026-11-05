// External API clients: AlAdhan (prayer times), Quran.com v4, Overpass (mosques)
// All are public, keyless, CORS-enabled APIs used per their official docs.
import { computePrayerTimes, hijriDate } from "@/lib/praytimes";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYERS: { key: PrayerKey; ar: string }[] = [
  { key: "fajr", ar: "الفجر" },
  { key: "dhuhr", ar: "الظهر" },
  { key: "asr", ar: "العصر" },
  { key: "maghrib", ar: "المغرب" },
  { key: "isha", ar: "العشاء" },
];

export const CALC_METHODS: { id: number; ar: string }[] = [
  { id: 4, ar: "أم القرى — مكة المكرمة" },
  { id: 3, ar: "رابطة العالم الإسلامي" },
  { id: 5, ar: "الهيئة المصرية العامة للمساحة" },
  { id: 2, ar: "ISNA — أمريكا الشمالية" },
  { id: 1, ar: "جامعة كراتشي" },
  { id: 8, ar: "منطقة الخليج" },
  { id: 9, ar: "الكويت" },
  { id: 10, ar: "قطر" },
  { id: 11, ar: "سنغافورة" },
  { id: 12, ar: "الاتحاد الإسلامي — فرنسا" },
  { id: 13, ar: "تركيا (ديانت)" },
  { id: 14, ar: "روسيا" },
  { id: 16, ar: "الهند" },
];

export interface PrayerTimings {
  timings: Record<string, string>;
  hijri: {
    day: string;
    month: { ar: string; en: string; number: number };
    year: string;
    weekday: { ar: string };
  };
  gregorian: { date: string; weekday: { en: string } };
  meta: { timezone: string; methodName?: string };
  source: "aladhan" | "local";
}

const cache = new Map<string, { at: number; ttl: number; data: unknown }>();
function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return Promise.resolve(hit.data as T);
  return fn().then((d) => {
    cache.set(key, { at: Date.now(), ttl: ttlMs, data: d });
    return d;
  });
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** direct fetch racing the same-origin server proxy — first success wins */
async function resilientGet(url: string): Promise<Response> {
  const direct = fetchWithTimeout(url, 5000).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });
  const proxied = fetchWithTimeout(`/api/proxy?url=${encodeURIComponent(url)}`, 8000).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });
  return Promise.any([direct, proxied]);
}

async function resilientPost(url: string, body: string): Promise<Response> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  };
  const direct = fetchWithTimeout(url, 6000, init).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });
  const proxied = fetchWithTimeout(`/api/proxy?url=${encodeURIComponent(url)}`, 10000, init).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });
  return Promise.any([direct, proxied]);
}

function mapAladhan(json: { data: { timings: Record<string, string>; date: { hijri: PrayerTimings["hijri"]; gregorian: PrayerTimings["gregorian"] }; meta: { timezone: string; method?: { name?: string } } } }): PrayerTimings {
  const d = json.data;
  return {
    timings: d.timings,
    hijri: d.date.hijri,
    gregorian: d.date.gregorian,
    meta: { timezone: d.meta.timezone, methodName: d.meta?.method?.name },
    source: "aladhan",
  };
}

/** Offline fallback: compute times locally (PrayTimes algorithm) + built-in Hijri calendar */
function localTimings(lat: number, lng: number, method: number): PrayerTimings {
  const { times: t, timeZone } = computePrayerTimes(lat, lng, method);
  const h = hijriDate();
  const now = new Date();
  return {
    timings: {
      Fajr: t.fajr, Sunrise: t.sunrise, Dhuhr: t.dhuhr, Asr: t.asr,
      Maghrib: t.maghrib, Isha: t.isha, Imsak: t.imsak, Midnight: t.midnight,
      Sunset: t.maghrib,
    },
    hijri: {
      day: h.day, month: { ar: h.monthAr, en: "", number: h.monthNumber },
      year: h.year, weekday: { ar: h.weekdayAr },
    },
    gregorian: { date: now.toISOString().slice(0, 10), weekday: { en: "" } },
    meta: { timezone: timeZone, methodName: CALC_METHODS.find((m) => m.id === method)?.ar },
    source: "local",
  };
}

// coordinates for major cities — last-resort offline fallback for city mode
const CITY_COORDS: Record<string, [number, number, string]> = {
  "مكة المكرمة": [21.4225, 39.8262, "السعودية"], "makkah": [21.4225, 39.8262, "السعودية"], "mecca": [21.4225, 39.8262, "السعودية"],
  "المدينة المنورة": [24.4672, 39.6111, "السعودية"], "madinah": [24.4672, 39.6111, "السعودية"], "medina": [24.4672, 39.6111, "السعودية"],
  "الرياض": [24.7136, 46.6753, "السعودية"], "riyadh": [24.7136, 46.6753, "السعودية"],
  "جدة": [21.4858, 39.1925, "السعودية"], "jeddah": [21.4858, 39.1925, "السعودية"],
  "الدمام": [26.4207, 50.0888, "السعودية"], "dammam": [26.4207, 50.0888, "السعودية"],
  "القاهرة": [30.0444, 31.2357, "مصر"], "cairo": [30.0444, 31.2357, "مصر"],
  "الإسكندرية": [31.2001, 29.9187, "مصر"], "alexandria": [31.2001, 29.9187, "مصر"],
  "عمّان": [31.9454, 35.9284, "الأردن"], "amman": [31.9454, 35.9284, "الأردن"],
  "القدس": [31.7683, 35.2137, "فلسطين"], "jerusalem": [31.7683, 35.2137, "فلسطين"],
  "دبي": [25.2048, 55.2708, "الإمارات"], "dubai": [25.2048, 55.2708, "الإمارات"],
  "أبوظبي": [24.4539, 54.3773, "الإمارات"], "abudhabi": [24.4539, 54.3773, "الإمارات"],
  "الدوحة": [25.2854, 51.531, "قطر"], "doha": [25.2854, 51.531, "قطر"],
  "الكويت": [29.3759, 47.9774, "الكويت"], "kuwait": [29.3759, 47.9774, "الكويت"],
  "المنامة": [26.2285, 50.586, "البحرين"], "manama": [26.2285, 50.586, "البحرين"],
  "مسقط": [23.588, 58.3829, "عُمان"], "muscat": [23.588, 58.3829, "عُمان"],
  "بغداد": [33.3152, 44.3661, "العراق"], "baghdad": [33.3152, 44.3661, "العراق"],
  "دمشق": [33.5138, 36.2765, "سوريا"], "damascus": [33.5138, 36.2765, "سوريا"],
  "بيروت": [33.8938, 35.5018, "لبنان"], "beirut": [33.8938, 35.5018, "لبنان"],
  "إسطنبول": [41.0082, 28.9784, "تركيا"], "istanbul": [41.0082, 28.9784, "تركيا"],
  "أنقرة": [39.9334, 32.8597, "تركيا"], "ankara": [39.9334, 32.8597, "تركيا"],
  "الرباط": [34.0209, -6.8416, "المغرب"], "rabat": [34.0209, -6.8416, "المغرب"],
  "الدار البيضاء": [33.5731, -7.5898, "المغرب"], "casablanca": [33.5731, -7.5898, "المغرب"],
  "تونس": [36.8065, 10.1815, "تونس"], "tunis": [36.8065, 10.1815, "تونس"],
  "الجزائر": [36.7538, 3.0588, "الجزائر"], "algiers": [36.7538, 3.0588, "الجزائر"],
  "طرابلس": [32.8872, 13.1913, "ليبيا"], "tripoli": [32.8872, 13.1913, "ليبيا"],
  "الخرطوم": [15.5007, 32.5599, "السودان"], "khartoum": [15.5007, 32.5599, "السودان"],
  "صنعاء": [15.3694, 44.191, "اليمن"], "sanaa": [15.3694, 44.191, "اليمن"],
  "كوالالمبور": [3.139, 101.6869, "ماليزيا"], "kualalumpur": [3.139, 101.6869, "ماليزيا"],
  "جاكرتا": [-6.2088, 106.8456, "إندونيسيا"], "jakarta": [-6.2088, 106.8456, "إندونيسيا"],
  "إسلام آباد": [33.6844, 73.0479, "باكستان"], "islamabad": [33.6844, 73.0479, "باكستان"],
  "كاراشي": [24.8607, 67.0011, "باكستان"], "karachi": [24.8607, 67.0011, "باكستان"],
  "دكا": [23.8103, 90.4125, "بنغلاديش"], "dhaka": [23.8103, 90.4125, "بنغلاديش"],
  "لندن": [51.5074, -0.1278, "بريطانيا"], "london": [51.5072, -0.1276, "بريطانيا"],
  "باريس": [48.8566, 2.3522, "فرنسا"], "paris": [48.8566, 2.3522, "فرنسا"],
  "نيويورك": [40.7128, -74.006, "أمريكا"], "newyork": [40.7128, -74.006, "أمريكا"],
  "برلين": [52.52, 13.405, "ألمانيا"], "berlin": [52.52, 13.405, "ألمانيا"],
};

export async function fetchTimingsByCoords(lat: number, lng: number, method: number): Promise<PrayerTimings> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${now.getFullYear()}?latitude=${lat}&longitude=${lng}&method=${method}`;
  return cached(`t-c-${lat.toFixed(2)}-${lng.toFixed(2)}-${method}-${dd}`, 30 * 60 * 1000, async () => {
    try {
      const res = await resilientGet(url);
      const json = await res.json();
      if (json.code === 200 && json.data) return mapAladhan(json);
      throw new Error("bad response");
    } catch {
      return localTimings(lat, lng, method);
    }
  });
}

export async function fetchTimingsByCity(city: string, country: string, method: number): Promise<PrayerTimings> {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  return cached(`t-city-${city}-${country}-${method}`, 30 * 60 * 1000, async () => {
    try {
      const res = await resilientGet(url);
      const json = await res.json();
      if (json.code !== 200) throw new Error("المدينة غير معروفة، تحقق من الاسم");
      return mapAladhan(json);
    } catch (e) {
      // offline fallback: known-city coordinates + local computation
      const key = Object.keys(CITY_COORDS).find(
        (k) => city.trim().toLowerCase().includes(k) || k.includes(city.trim().toLowerCase()),
      );
      if (key) {
        const [lat, lng] = CITY_COORDS[key];
        return localTimings(lat, lng, method);
      }
      // last resort: geocode then compute locally
      try {
        const place = await geocodeCity(`${city}, ${country}`);
        if (place) return localTimings(place.lat, place.lon, method);
      } catch { /* offline */ }
      throw e instanceof Error ? e : new Error("تعذر جلب مواقيت الصلاة");
    }
  });
}

export function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

/** minutes-since-midnight for each of the five prayers */
export function prayerMinutes(timings: Record<string, string>): { key: PrayerKey; minutes: number }[] {
  const map: Record<PrayerKey, string> = {
    fajr: timings.Fajr,
    dhuhr: timings.Dhuhr,
    asr: timings.Asr,
    maghrib: timings.Maghrib,
    isha: timings.Isha,
  };
  return PRAYERS.map((p) => {
    const { h, m } = parseTime(map[p.key] ?? "00:00");
    return { key: p.key, minutes: h * 60 + m };
  });
}

// ---------------- Quran.com v4 ----------------

export interface Chapter {
  id: number;
  name_arabic: string;
  name_simple: string;
  verses_count: number;
  revelation_place: string;
  translated_name?: { name: string };
}

export async function fetchChapters(): Promise<Chapter[]> {
  return cached("chapters", 24 * 60 * 60 * 1000, async () => {
    const res = await fetch("https://api.quran.com/api/v4/chapters?language=ar");
    if (!res.ok) throw new Error("تعذر جلب قائمة السور");
    const json = await res.json();
    return json.chapters as Chapter[];
  });
}

export interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

export interface VersesPage {
  verses: Verse[];
  totalPages: number;
  page: number;
}

export async function fetchVerses(chapterId: number, page: number, perPage = 50): Promise<VersesPage> {
  const url =
    `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=ar` +
    `&fields=text_uthmani&per_page=${perPage}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر جلب آيات السورة");
  const json = await res.json();
  return {
    verses: json.verses as Verse[],
    totalPages: json.pagination.total_pages as number,
    page: json.pagination.current_page as number,
  };
}

export interface Reciter {
  id: number;
  name: string;
  arabic_name?: string;
}

export async function fetchReciters(): Promise<Reciter[]> {
  return cached("reciters", 24 * 60 * 60 * 1000, async () => {
    const res = await fetch("https://api.quran.com/api/v4/resources/chapter_reciters?language=ar");
    if (!res.ok) throw new Error("تعذر جلب قائمة القرّاء");
    const json = await res.json();
    return json.reciters as Reciter[];
  });
}

export async function fetchChapterAudio(reciterId: number, chapterId: number): Promise<string> {
  return cached(`audio-${reciterId}-${chapterId}`, 24 * 60 * 60 * 1000, async () => {
    const res = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${chapterId}`);
    if (!res.ok) throw new Error("تعذر جلب التلاوة الصوتية");
    const json = await res.json();
    const file = json.audio_file?.audio_url as string | undefined;
    if (!file) throw new Error("لا تتوفر تلاوة لهذه السورة");
    return file.startsWith("http") ? file : `https://verses.quran.com/${file}`;
  });
}

export interface SearchResultVerse {
  verse_key: string;
  text: string;
  chapter_id?: number;
}

export async function searchQuran(q: string): Promise<SearchResultVerse[]> {
  const url = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(q)}&size=20&language=ar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر البحث");
  const json = await res.json();
  const results = (json.search?.results ?? []) as { verse_key: string; text: string }[];
  return results.map((r) => ({
    verse_key: r.verse_key,
    text: r.text,
    chapter_id: Number(r.verse_key.split(":")[0]),
  }));
}

// ---------------- Overpass / Nominatim ----------------
export interface Mosque {
  id: number;
  name: string;
  lat: number;
  lon: number;
  distance: number; // meters
  addr?: string;
  women?: string;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Overall deadline so a slow Overpass mirror never freezes the page. */
const MOSQUES_DEADLINE_MS = 12000;

export async function fetchMosques(lat: number, lon: number, radiusM = 4000): Promise<Mosque[]> {
  return cached(`mosques-${lat.toFixed(3)}-${lon.toFixed(3)}-${radiusM}`, 10 * 60 * 1000, async () => {
    const query = `[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon}););out center 60;`;

    const load = async (): Promise<Mosque[]> => {
      let res: Response;
      try {
        res = await resilientPost("https://overpass-api.de/api/interpreter", `data=${encodeURIComponent(query)}`);
      } catch {
        res = await resilientPost("https://overpass.kumi.systems/api/interpreter", `data=${encodeURIComponent(query)}`);
      }
      const json = await res.json();
      if (!json.elements) throw new Error("تعذر البحث عن المساجد القريبة");
      const out: Mosque[] = [];
      for (const el of json.elements ?? []) {
        const mLat = el.lat ?? el.center?.lat;
        const mLon = el.lon ?? el.center?.lon;
        if (mLat == null || mLon == null) continue;
        const tags = el.tags ?? {};
        out.push({
          id: el.id,
          name: tags.name || tags["name:ar"] || "مسجد",
          lat: mLat,
          lon: mLon,
          distance: haversineMeters(lat, lon, mLat, mLon),
          addr: [tags["addr:street"], tags["addr:city"]].filter(Boolean).join("، ") || undefined,
          women: tags["prayer:female"] ?? tags["female"],
        });
      }
      return out.sort((a, b) => a.distance - b.distance).slice(0, 60);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("overpass timeout")), MOSQUES_DEADLINE_MS);
    });

    try {
      return await Promise.race([load(), deadline]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
}

export interface GeoPlace {
  lat: number;
  lon: number;
  display: string;
}

export async function geocodeCity(q: string, countryCode?: string): Promise<GeoPlace | null> {
  const country = countryCode ? `&countrycodes=${encodeURIComponent(countryCode)}` : "";
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ar${country}&q=${encodeURIComponent(q)}`;
  const res = await resilientGet(url);
  const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!json.length) return null;
  return { lat: Number(json[0].lat), lon: Number(json[0].lon), display: json[0].display_name };
}
