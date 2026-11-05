import { useState } from "react";
import { MapPin, Loader2, Search, Bell, BellOff, Sunrise, Sun, CloudSun, Sunset, MoonStar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PageHeader, HijriDate, fmt12, LocationGate } from "@/components/shared";
import { CALC_METHODS, PRAYERS, prayerMinutes, type PrayerKey } from "@/lib/api";
import { cn } from "@/lib/utils";

const PRAYER_ICONS: Record<PrayerKey, typeof Sun> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: MoonStar,
};

const EXTRA_LABELS: [string, string][] = [
  ["Imsak", "الإمساك"], ["Sunrise", "الشروق"], ["Sunset", "الغروب"],
  ["Midnight", "منتصف الليل"], ["Firstthird", "الثلث الأول"], ["Lastthird", "الثلث الأخير"],
];

export default function PrayerTimes() {
  const pt = usePrayerTimes();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [notif, setNotif] = useState(() => localStorage.getItem("wusuli.notif") === "1");

  const list = pt.data ? prayerMinutes(pt.data.timings) : [];

  const submitCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) pt.setCity(city.trim(), country.trim() || "");
  };

  const toggleNotif = async () => {
    if (!notif) {
      if (!("Notification" in window)) return;
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        localStorage.setItem("wusuli.notif", "1");
        setNotif(true);
        scheduleNotification(pt);
      }
    } else {
      localStorage.setItem("wusuli.notif", "0");
      setNotif(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="مواقيت الصلاة"
        subtitle={pt.data ? undefined : "حدّد موقعك لعرض المواقيت الدقيقة"}
        action={
          <Button variant="outline" size="sm" onClick={toggleNotif} className="gap-2">
            {notif ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {notif ? "التنبيهات مفعّلة" : "تفعيل التنبيهات"}
          </Button>
        }
      />

      {/* Location controls */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <form onSubmit={submitCity} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">المدينة</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مكة المكرمة" />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">الدولة</label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="السعودية" />
            </div>
            <Button type="submit" className="gap-2" disabled={pt.loading}>
              <Search className="h-4 w-4" /> بحث
            </Button>
          </form>
          <div className="flex gap-2">
            <Button variant="outline" onClick={pt.useGeolocation} disabled={pt.loading} className="gap-2">
              {pt.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              موقعي الحالي
            </Button>
          </div>
          <div className="w-full md:w-64">
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">طريقة الحساب</label>
            <Select value={String(pt.method)} onValueChange={(v) => pt.setMethod(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CALC_METHODS.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!pt.location ? (
        <LocationGate onGeolocate={pt.useGeolocation} loading={pt.loading} />
      ) : pt.error ? (
        <Card><CardContent className="p-8 text-center text-destructive">{pt.error}</CardContent></Card>
      ) : pt.loading && !pt.data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل المواقيت…
        </div>
      ) : pt.data ? (
        <>
          {/* Dates + next prayer banner */}
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Card className="border-gold glow-gold lg:col-span-2">
              <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
                <div>
                  <p className="text-sm text-muted-foreground">الصلاة القادمة</p>
                  <p className="font-kufi mt-1 text-3xl font-bold text-gold">
                    {pt.next ? PRAYERS.find((p) => p.key === pt.next!.key)?.ar : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pt.location.label ?? "موقعك"} — {pt.data.meta.timezone}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">الوقت المتبقي</p>
                  <p className="font-mono text-4xl font-bold tracking-tight" dir="ltr">{pt.countdown}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex h-full flex-col justify-center gap-1 p-6 text-center">
                <p className="font-kufi text-xl font-bold text-primary"><HijriDate hijri={pt.data.hijri} /></p>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })} م
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Five prayers */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((p) => {
              const meta = PRAYERS.find((x) => x.key === p.key)!;
              const Icon = PRAYER_ICONS[p.key];
              const isNext = pt.next?.key === p.key;
              const timeStr = pt.data!.timings[meta.key === "fajr" ? "Fajr" : meta.key === "dhuhr" ? "Dhuhr" : meta.key === "asr" ? "Asr" : meta.key === "maghrib" ? "Maghrib" : "Isha"];
              return (
                <Card
                  key={p.key}
                  className={cn(
                    "transition-all duration-300",
                    isNext ? "border-gold bg-[hsl(var(--gold))]/8 glow-gold scale-[1.02]" : "hover:border-primary/40",
                  )}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                    <Icon className={cn("h-6 w-6", isNext ? "text-gold animate-breathe" : "text-primary")} strokeWidth={1.6} />
                    <span className={cn("font-kufi text-lg font-bold", isNext && "text-gold")}>{meta.ar}</span>
                    <span className="font-mono text-xl font-bold" dir="ltr">{timeStr}</span>
                    <span className="text-xs text-muted-foreground">{fmt12(timeStr)}</span>
                    {isNext && <span className="rounded-full bg-[hsl(var(--gold))]/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">التالية</span>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Extra times */}
          <h2 className="font-kufi mb-3 mt-8 text-lg font-bold">أوقات إضافية</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {EXTRA_LABELS.map(([key, label]) =>
              pt.data!.timings[key] ? (
                <div key={key} className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-mono mt-1 text-sm font-bold" dir="ltr">{pt.data!.timings[key]}</div>
                </div>
              ) : null,
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            المواقيت وفق طريقة: {CALC_METHODS.find((m) => m.id === pt.method)?.ar} —{" "}
            {pt.data.source === "aladhan" ? "المصدر: AlAdhan API" : "المصدر: حساب فلكي محلي (احتياطي عند تعذر الاتصال)"}
          </p>
        </>
      ) : null}
    </div>
  );
}

function scheduleNotification(pt: ReturnType<typeof usePrayerTimes>) {
  if (!pt.data || !pt.next) return;
  const minutes = pt.next.minutes;
  const now = new Date();
  const target = new Date(now);
  target.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  let ms = target.getTime() - now.getTime();
  if (ms < 0) ms += 86400000;
  if (ms > 2_000_000_000) return;
  window.setTimeout(() => {
    if (localStorage.getItem("wusuli.notif") === "1" && Notification.permission === "granted") {
      const name = PRAYERS.find((p) => p.key === pt.next?.key)?.ar ?? "الصلاة";
      new Notification("وصولي — حان وقت الصلاة", { body: `حان الآن وقت صلاة ${name}` });
    }
  }, ms);
}
