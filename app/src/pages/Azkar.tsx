import { useState } from "react";
import { Link } from "react-router";
import { Sunrise, Sunset, MoonStar, BedDouble, AlarmClock, Sparkles, Heart, RotateCcw, Plus, Check, Minus, LogIn, Share2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";
import { ShareToast } from "@/components/ShareToast";
import { AZKAR_CATEGORIES, azkarByCategory, type AzkarCategory, type Dhikr } from "@/data/azkar";
import { useAzkarProgress, useAzkarFavorites, useTasbeeh } from "@/hooks/useWorship";
import { useStoryShare } from "@/hooks/useStoryShare";
import { todayKey } from "@/hooks/usePrayerTimes";
import { cn } from "@/lib/utils";

const CAT_ICONS: Record<AzkarCategory, typeof Sunrise> = {
  morning: Sunrise,
  evening: Sunset,
  afterPrayer: MoonStar,
  sleep: BedDouble,
  wakeup: AlarmClock,
  general: Sparkles,
};

function DhikrCard({ d, count, onCount, isFav, onFav, onShare, sharing }: {
  d: Dhikr; count: number; onCount: (n: number) => void; isFav: boolean; onFav: () => void;
  onShare: () => void; sharing: boolean;
}) {
  const done = count >= d.count;
  return (
    <Card className={cn("transition-all duration-300", done && "border-primary/50 bg-primary/5")}>
      <CardContent className="p-5">
        <p className="font-quran text-lg leading-loose">{d.text}</p>
        <p className="mt-2 text-xs text-muted-foreground">{d.reference}</p>
        {d.virtue && <p className="mt-1 text-xs text-gold">الفضل: {d.virtue}</p>}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-9 w-9" disabled={count <= 0}
              onClick={() => onCount(count - 1)} aria-label="إنقاص">
              <Minus className="h-4 w-4" />
            </Button>
            <span className={cn("w-14 text-center font-mono text-lg font-bold", done ? "text-primary" : "text-foreground")} dir="ltr">
              {count}/{d.count}
            </span>
            <Button size="icon" className="h-9 w-9" onClick={() => onCount(Math.min(d.count, count + 1))} aria-label="تسبيحة" disabled={done}>
              {done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {done && <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">تم</span>}
            <Button size="icon" variant="ghost" onClick={onShare} disabled={sharing}
              aria-label="مشاركة الذكر كصورة ستوري" title="مشاركة كستوري"
              className="text-muted-foreground hover:text-gold">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={onFav} aria-label="إضافة للمفضلة"
              className={cn(isFav && "text-gold")}>
              <Heart className={cn("h-4 w-4", isFav && "fill-[hsl(var(--gold))]")} />
            </Button>
          </div>
        </div>
        {/* progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, (count / d.count) * 100)}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Azkar() {
  const [cat, setCat] = useState<AzkarCategory>("morning");
  const [showFav, setShowFav] = useState(false);
  const today = todayKey();
  const { progress, set, isAuthenticated } = useAzkarProgress(today);
  const { favorites, toggle } = useAzkarFavorites();
  const tasbeeh = useTasbeeh();
  const { share, busyId, toast } = useStoryShare();

  const items = showFav
    ? azkarByCategory(cat).filter((d) => favorites.includes(d.id))
    : azkarByCategory(cat);

  const doneCount = azkarByCategory(cat).filter((d) => (progress[d.id] ?? 0) >= d.count).length;
  const totalCount = azkarByCategory(cat).length;
  const tasbeehPct = Math.min(100, (tasbeeh.count / tasbeeh.target) * 100);

  return (
    <div>
      <PageHeader title="الأذكار والتسبيح" subtitle="أذكار موثقة من حصن المسلم والأحاديث الصحيحة" />

      {!isAuthenticated && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gold bg-[hsl(var(--gold))]/8 px-4 py-3 text-sm">
          <span>وضع الضيف — تقدّمك محفوظ على هذا الجهاز فقط.</span>
          <Button size="sm" variant="outline" asChild className="gap-1.5 shrink-0">
            <Link to="/login"><LogIn className="h-3.5 w-3.5" /> سجّل للمزامنة</Link>
          </Button>
        </div>
      )}

      {/* Digital tasbeeh */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative">
          <img src="/images/light-figure.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-l from-[hsl(158,30%,6%)]/90 to-[hsl(158,30%,6%)]/50" />
          <CardContent className="relative z-10 flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm font-bold text-[hsl(42,62%,65%)]">المسبحة الرقمية</p>
            <button
              onClick={() => tasbeeh.bump(1)}
              className="group flex h-32 w-32 items-center justify-center rounded-full border-4 border-[hsl(42,62%,55%)]/60 bg-[hsl(158,25%,10%)]/80 transition-transform duration-150 active:scale-95 glow-gold"
              aria-label="سبّح"
            >
              <span className="font-mono text-4xl font-bold text-[hsl(42,40%,92%)]" dir="ltr">{tasbeeh.count}</span>
            </button>
            <p className="text-sm text-[hsl(42,25%,80%)]">
              الهدف: {tasbeeh.target} — المجموع الكلي: {tasbeeh.lifetime}
            </p>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[hsl(42,62%,55%)] transition-all duration-300" style={{ width: `${tasbeehPct}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={tasbeeh.reset} className="gap-1.5 bg-transparent text-[hsl(42,30%,88%)]">
                <RotateCcw className="h-3.5 w-3.5" /> تصفير
              </Button>
              {[33, 100, 500].map((n) => (
                <Button key={n} size="sm" variant={tasbeeh.target === n ? "default" : "outline"}
                  onClick={() => tasbeeh.setTarget(n)}
                  className={cn(tasbeeh.target !== n && "bg-transparent text-[hsl(42,30%,88%)]")}>
                  هدف {n}
                </Button>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Category chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {AZKAR_CATEGORIES.map((c) => {
          const Icon = CAT_ICONS[c.key];
          const catDone = azkarByCategory(c.key).filter((d) => (progress[d.id] ?? 0) >= d.count).length;
          const catTotal = azkarByCategory(c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all",
                cat === c.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <Icon className="h-4 w-4" />
              {c.ar}
              <span className={cn("text-xs font-normal", cat === c.key ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {catDone}/{catTotal}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setShowFav(!showFav)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all",
            showFav ? "border-gold bg-[hsl(var(--gold))]/15 text-gold" : "border-border bg-card hover:border-gold/60",
          )}
        >
          <Heart className="h-4 w-4" /> المفضلة
        </button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {AZKAR_CATEGORIES.find((c) => c.key === cat)?.hint} — {doneCount}/{totalCount} مكتملة
      </p>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Share2 className="h-3.5 w-3.5 text-gold" />
        اضغط أيقونة المشاركة لتحويل الذكر إلى صورة جاهزة لستوري واتساب أو إنستجرام.
      </p>

      {showFav && items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          لا توجد أذكار مفضلة في هذا التصنيف — اضغط على القلب لإضافة ذكر إلى مفضلتك.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((d) => (
            <DhikrCard
              key={d.id}
              d={d}
              count={progress[d.id] ?? 0}
              onCount={(n) => set(d.id, n)}
              isFav={favorites.includes(d.id)}
              onFav={() => toggle(d.id)}
              sharing={busyId === d.id}
              onShare={() => share(d.id, { text: d.text, reference: d.reference, kind: "dhikr" })}
            />
          ))}
        </div>
      )}

      <ShareToast text={toast} />
    </div>
  );
}
