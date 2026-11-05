import { Link } from "react-router";
import { Clock, BookOpen, Sparkles, CheckCircle2, MapPin, LibraryBig, HeartHandshake, MoonStar, ChevronLeft, Loader2, Navigation, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareToast } from "@/components/ShareToast";
import { usePrayerTimes, todayKey } from "@/hooks/usePrayerTimes";
import { usePrayerTracker, useAzkarProgress } from "@/hooks/useWorship";
import { useStoryShare } from "@/hooks/useStoryShare";
import { dailyVerse, REMINDERS } from "@/data/verses";
import { dailyHadith } from "@/data/hadith";
import { AZKAR_CATEGORIES, azkarByCategory } from "@/data/azkar";
import { dailyDeeds } from "@/data/deeds";
import { EGYPT_LANDMARKS } from "@/data/mosques-egypt";
import { HijriDate, LocationGate, fmt12 } from "@/components/shared";
import { PRAYERS, prayerMinutes } from "@/lib/api";
import { cn } from "@/lib/utils";

const QUICK = [
  { to: "/prayer-times", label: "المواقيت", icon: Clock },
  { to: "/tracker", label: "متابعة الصلوات", icon: CheckCircle2 },
  { to: "/quran", label: "القرآن", icon: BookOpen },
  { to: "/azkar", label: "الأذكار", icon: Sparkles },
  { to: "/mosques", label: "المساجد", icon: MapPin },
  { to: "/library", label: "المكتبة", icon: LibraryBig },
  { to: "/charity", label: "الأعمال الصالحة", icon: HeartHandshake },
  { to: "/ramadan", label: "رمضان", icon: MoonStar },
];

export default function Home() {
  const pt = usePrayerTimes();
  const tracker = usePrayerTracker(todayKey());
  const azkar = useAzkarProgress(todayKey());
  const verse = dailyVerse();
  const hadith = dailyHadith();
  const deeds = dailyDeeds();
  const { share, busyId, toast } = useStoryShare();
  const reminder = REMINDERS[Math.floor(Date.now() / 86400000) % REMINDERS.length];
  const landmark = EGYPT_LANDMARKS[2];

  const list = pt.data ? prayerMinutes(pt.data.timings) : [];
  const prayersDone = tracker.completed.length;

  // azkar summary today
  const azkarTotals = AZKAR_CATEGORIES.map((c) => {
    const items = azkarByCategory(c.key);
    const done = items.filter((d) => (azkar.progress[d.id] ?? 0) >= d.count).length;
    return { ...c, done, total: items.length };
  });
  const azkarDoneTotal = azkarTotals.reduce((s, c) => s + c.done, 0);
  const azkarAllTotal = azkarTotals.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col justify-center gap-4 p-7 md:p-10">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-gold">
              <span className="h-px w-7 bg-[hsl(var(--gold))]/60" />
              رفيقك اليومي
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {pt.data ? <HijriDate hijri={pt.data.hijri} /> : new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="font-kufi text-3xl font-bold leading-snug md:text-[2.6rem] md:leading-[1.3]">
              السلام عليكم ورحمة الله
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {reminder}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link to="/prayer-times">
                  <Clock className="h-4 w-4" /> مواقيت اليوم
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/mosques">
                  <MapPin className="h-4 w-4" /> مساجد قريبة
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[220px] md:min-h-[320px]">
            <img src="/images/mosque.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,36%,4%)]/85 via-[hsl(158,30%,8%)]/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="h-px w-10 bg-[hsl(var(--gold))]/70" />
              <p className="mt-2 text-[11px] tracking-wide text-[hsl(42,30%,88%)]/80">
                اقرأ · اذكر · وصلِّ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Next prayer + quick access */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="relative overflow-hidden border-gold lg:col-span-3 glow-gold">
          <CardContent className="p-6">
            {!pt.location ? (
              <LocationGate onGeolocate={pt.useGeolocation} loading={pt.loading} compact />
            ) : pt.loading && !pt.data ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل المواقيت…
              </div>
            ) : pt.error ? (
              <p className="py-6 text-center text-sm text-destructive">{pt.error}</p>
            ) : pt.data && pt.next ? (
              <div className="flex flex-col items-center gap-5 md:flex-row md:justify-between">
                <div className="text-center md:text-right">
                  <p className="text-sm text-muted-foreground">الصلاة القادمة — {pt.location.label ?? ""}</p>
                  <p className="font-kufi mt-1 text-4xl font-bold text-gold">
                    {PRAYERS.find((p) => p.key === pt.next!.key)?.ar}
                  </p>
                  <p className="mt-1 text-lg text-foreground/80">{fmt12(pt.data.timings[pt.next.key[0].toUpperCase() + pt.next.key.slice(1)] ?? "")}</p>
                  <Link to="/prayer-times" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    جميع المواقيت <ChevronLeft className="h-4 w-4" />
                  </Link>
                </div>
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="hsl(var(--gold))" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - pt.progressPct / 100)}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">متبقي</span>
                    <span className="font-mono text-lg font-bold tracking-tight" dir="ltr">{pt.countdown}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Today summary */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="font-kufi text-lg font-bold">عبادات اليوم</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">الصلوات المكتملة</span>
                  <span className="font-bold text-primary">{prayersDone} / 5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(prayersDone / 5) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">الأذكار المكتملة</span>
                  <span className="font-bold text-gold">{azkarDoneTotal} / {azkarAllTotal}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[hsl(var(--gold))] transition-all duration-500" style={{ width: `${azkarAllTotal ? (azkarDoneTotal / azkarAllTotal) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {list.map((p) => (
                  <div
                    key={p.key}
                    className={cn(
                      "flex-1 rounded-lg border px-1 py-2 text-center text-xs",
                      pt.next?.key === p.key ? "border-gold bg-[hsl(var(--gold))]/10 font-bold text-gold" : "border-border text-muted-foreground",
                      tracker.completed.includes(p.key) && "bg-primary/10 text-primary border-primary/30",
                    )}
                  >
                    {PRAYERS.find((x) => x.key === p.key)?.ar}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verse + Hadith */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-fade-up overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-gold">
                <BookOpen className="h-4 w-4" /> آية اليوم
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  share("daily-verse", {
                    text: verse.text,
                    reference: verse.reference,
                    kind: "ayah",
                  })
                }
                disabled={busyId === "daily-verse"}
                className="h-8 w-8 text-muted-foreground hover:text-gold"
                aria-label="مشاركة آية اليوم كصورة ستوري"
                title="مشاركة كستوري"
              >
                {busyId === "daily-verse"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Share2 className="h-4 w-4" />}
              </Button>
            </div>
            <p className="font-quran text-xl leading-loose md:text-2xl">﴿{verse.text}﴾</p>
            <p className="mt-3 text-sm text-muted-foreground">{verse.reference}</p>
            <Link to="/quran" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              تابع القراءة في المصحف <ChevronLeft className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
        <Card className="animate-fade-up delay-150">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gold">
              <LibraryBig className="h-4 w-4" /> حديث اليوم
            </div>
            <p className="font-quran text-lg leading-loose">«{hadith.text}»</p>
            <p className="mt-3 text-sm text-muted-foreground">
              الراوي: {hadith.narrator} — {hadith.source}
            </p>
            <Link to="/library" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              المزيد في المكتبة <ChevronLeft className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Curated Egyptian mosque */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative min-h-[210px] md:min-h-[260px]">
            <img src="/images/mosque-interior.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,36%,4%)]/80 via-transparent to-transparent" />
            <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-[hsl(158,35%,6%)]/70 px-3 py-1 text-[11px] font-bold text-[hsl(42,30%,90%)] backdrop-blur">
              مسجد الأسبوع
            </span>
          </div>
          <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
            <p className="text-xs font-bold text-gold">
              {landmark.city} · {landmark.era}
            </p>
            <h2 className="font-kufi text-2xl font-bold">{landmark.name}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{landmark.note}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/mosques" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                دليل مساجد مصر <ChevronLeft className="h-4 w-4" />
              </Link>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${landmark.lat},${landmark.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Navigation className="h-3.5 w-3.5" /> الاتجاهات
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Deeds + quick grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gold">
              <HeartHandshake className="h-4 w-4" /> عمل صالح مقترح
            </div>
            <ul className="space-y-3">
              {deeds.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--gold))]" />
                  {d}
                </li>
              ))}
            </ul>
            <Link to="/charity" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              سجّل أعمالك الصالحة <ChevronLeft className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
          {QUICK.map(({ to, label, icon: Icon }, i) => (
            <Link
              key={to}
              to={to}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-fade-up group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:glow-gold"
            >
              <Icon className="h-6 w-6 text-primary transition-colors group-hover:text-gold" strokeWidth={1.6} />
              <span className="text-sm font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <ShareToast text={toast} />
    </div>
  );
}
