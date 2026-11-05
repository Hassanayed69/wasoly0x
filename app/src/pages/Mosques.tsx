import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2, Search, Navigation, ExternalLink, Landmark, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared";
import { fetchMosques, geocodeCity, haversineMeters, type Mosque } from "@/lib/api";
import {
  EGYPT_CENTER,
  EGYPT_CITIES,
  EGYPT_LANDMARKS,
  type EgyptCity,
} from "@/data/mosques-egypt";
import { cn } from "@/lib/utils";

const mosqueIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#d9a744;border:3px solid #fff8;box-shadow:0 0 0 3px #d9a74455"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#1d9e75;border:3px solid #fff;box-shadow:0 0 12px #1d9e75"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} م` : `${(m / 1000).toFixed(1)} كم`;
}

function landmarksAsMosques(c: { lat: number; lon: number }): Mosque[] {
  return EGYPT_LANDMARKS.map((m, i) => ({
    id: -(i + 1),
    name: m.name,
    lat: m.lat,
    lon: m.lon,
    distance: haversineMeters(c.lat, c.lon, m.lat, m.lon),
    addr: `${m.city} — ${m.era}`,
  })).sort((a, b) => a.distance - b.distance);
}

/** Curated fallback: nearby landmarks first, else the closest ones from the Egypt guide. */
function curatedFallback(c: { lat: number; lon: number }): Mosque[] {
  const all = landmarksAsMosques(c);
  const near = all.filter((m) => m.distance < 40000);
  return (near.length ? near : all).slice(0, 8);
}

export default function Mosques() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const didInit = useRef(false);
  const [center, setCenter] = useState(EGYPT_CENTER);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cityQ, setCityQ] = useState("");
  const [activeCity, setActiveCity] = useState("القاهرة");
  const [selected, setSelected] = useState<number | null>(null);

  // init map over Cairo
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, {
      center: [EGYPT_CENTER.lat, EGYPT_CENTER.lon],
      zoom: 11,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapObj.current = map;
    return () => {
      map.remove();
      mapObj.current = null;
    };
  }, []);

  const renderMosques = useCallback((list: Mosque[], c: { lat: number; lon: number }) => {
    const map = mapObj.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    L.marker([c.lat, c.lon], { icon: userIcon }).addTo(layer).bindPopup("مركز البحث");
    for (const m of list) {
      L.marker([m.lat, m.lon], { icon: mosqueIcon })
        .addTo(layer)
        .bindPopup(`<b>${m.name}</b><br/>${fmtDist(m.distance)}`);
    }
    if (list.length > 1) {
      map.fitBounds(L.latLngBounds(list.map((m) => [m.lat, m.lon])).pad(0.15));
    } else {
      map.setView([c.lat, c.lon], 14);
    }
  }, []);

  const search = useCallback(
    async (c: { lat: number; lon: number }, cityName?: string) => {
      setLoading(true);
      setError(null);
      setNotice(null);
      if (cityName) setActiveCity(cityName);
      try {
        const list = await fetchMosques(c.lat, c.lon, 5000);
        if (list.length === 0) {
          const fallback = curatedFallback(c);
          setMosques(fallback);
          renderMosques(fallback, c);
          setNotice("لم تصلنا بيانات من الخريطة الآن — نعرض لك مساجد مختارة من دليل مصر.");
        } else {
          setMosques(list);
          renderMosques(list, c);
        }
      } catch {
        const fallback = curatedFallback(c);
        setMosques(fallback);
        renderMosques(fallback, c);
        setNotice("تعذّر الوصول إلى OpenStreetMap بسرعة — نعرض لك مساجد مختارة من دليل مصر.");
      } finally {
        setLoading(false);
      }
    },
    [renderMosques],
  );

  // أول تحميل: مساجد وسط القاهرة
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void search(EGYPT_CENTER, "القاهرة");
  }, [search]);

  const pickCity = (city: EgyptCity) => {
    setCenter({ lat: city.lat, lon: city.lon });
    setCityQ("");
    setSelected(null);
    setMosques([]);
    markersRef.current?.clearLayers();
    void search({ lat: city.lat, lon: city.lon }, city.name);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCenter(c);
        setActiveCity("موقعك الحالي");
        setMosques([]);
        markersRef.current?.clearLayers();
        void search(c);
      },
      () => {
        setLoading(false);
        setError(
          "تعذّر الوصول إلى موقعك. اسمح للمتصفح باستخدام الموقع من أيقونة القفل بجوار العنوان، أو اختر مدينتك من القائمة.",
        );
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  };

  const searchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityQ.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const place = await geocodeCity(cityQ.trim(), "eg");
      if (!place) {
        setError("لم نجد هذه المدينة داخل مصر — جرّب اسمًا آخر مثل «المنصورة» أو «أسوان».");
        setLoading(false);
        return;
      }
      const c = { lat: place.lat, lon: place.lon };
      setCenter(c);
      setActiveCity(cityQ.trim());
      setMosques([]);
      markersRef.current?.clearLayers();
      await search(c, cityQ.trim());
    } catch {
      setError("تعذّر البحث عن المدينة الآن.");
      setLoading(false);
    }
  };

  const flyTo = (m: Mosque) => {
    setSelected(m.id);
    mapObj.current?.setView([m.lat, m.lon], 16);
  };

  return (
    <div>
      <PageHeader
        title="المساجد القريبة منك"
        subtitle="دليل مساجد مصر — ابحث في مدينتك أو استخدم موقعك الحالي"
        action={
          <Button variant="outline" onClick={locate} className="gap-2">
            <MapPin className="h-4 w-4" /> موقعي الحالي
          </Button>
        }
      />

      <form onSubmit={searchCity} className="mb-2 flex gap-2">
        <Input
          value={cityQ}
          onChange={(e) => setCityQ(e.target.value)}
          placeholder="ابحث باسم مدينة أو حي داخل مصر…"
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          بحث
        </Button>
      </form>
      <p className="mb-4 text-xs text-muted-foreground">
        زر «موقعي الحالي» يطلب إذن المتصفح مرة واحدة؛ إن رفضته يمكنك اختيار
        المدينة يدويًا.
      </p>

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {EGYPT_CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => pickCity(city)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors disabled:opacity-60",
              activeCity === city.name
                ? "border-gold bg-[hsl(var(--gold))]/15 text-gold"
                : "border-border text-muted-foreground hover:border-gold/60 hover:text-foreground",
            )}
          >
            {city.name}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 rounded-lg border border-gold/40 bg-[hsl(var(--gold))]/8 px-4 py-2 text-sm text-gold">
          {notice}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-border lg:col-span-3">
          <div ref={mapRef} className="h-[380px] w-full md:h-[520px]" />
        </div>

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-bold text-muted-foreground">
                {loading
                  ? "جارٍ البحث…"
                  : mosques.length > 0
                    ? `${mosques.length} مسجدًا حول ${activeCity}`
                    : "النتائج ستظهر هنا"}
              </h2>
              <button
                onClick={() => void search(center, activeCity)}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" /> تحديث
              </button>
            </div>
            <ul className="max-h-[478px] space-y-2 overflow-y-auto">
              {mosques.map((m) => (
                <li key={m.id}>
                  <div
                    className={cn(
                      "w-full rounded-xl border p-3 transition-colors",
                      selected === m.id
                        ? "border-gold bg-[hsl(var(--gold))]/8"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <button onClick={() => flyTo(m)} className="w-full text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{m.name}</span>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {fmtDist(m.distance)}
                        </span>
                      </div>
                      {m.addr && <p className="mt-1 text-xs text-muted-foreground">{m.addr}</p>}
                      {m.women && (
                        <p className="mt-1 text-xs text-gold">
                          مصلى النساء: {m.women === "yes" ? "متوفر" : m.women === "no" ? "غير متوفر" : m.women}
                        </p>
                      )}
                    </button>
                    <div className="mt-2 flex gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                      >
                        <Navigation className="h-3 w-3" /> الاتجاهات
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=17/${m.lat}/${m.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70"
                      >
                        <ExternalLink className="h-3 w-3" /> على الخريطة
                      </a>
                    </div>
                  </div>
                </li>
              ))}
              {mosques.length === 0 && !loading && (
                <li className="py-10 text-center text-sm text-muted-foreground">
                  اختر مدينة من الأعلى أو ابحث باسمها لعرض المساجد القريبة.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Curated Egyptian landmarks */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-kufi flex items-center gap-2 text-xl font-bold">
              <Landmark className="h-5 w-5 text-gold" />
              مساجد مصرية تستحق الزيارة
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مختارات من عمارة مصر الإسلامية عبر أكثر من ألف عام.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EGYPT_LANDMARKS.map((m) => (
            <article
              key={m.name}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold/60"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-kufi text-lg font-bold leading-snug">{m.name}</h3>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {m.city}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.note}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-xs text-gold">{m.era}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCenter({ lat: m.lat, lon: m.lon });
                      mapObj.current?.setView([m.lat, m.lon], 16);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    اعرض على الخريطة
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    الاتجاهات
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        بيانات المساجد من OpenStreetMap عبر Overpass API، وقد تكون بعض المواقع
        ناقصة أو قديمة. الدليل المختار مراجَع يدويًا.
      </p>
    </div>
  );
}
