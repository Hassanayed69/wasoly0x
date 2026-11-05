import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Check, Flame, ChevronRight, ChevronLeft, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePrayerTracker, usePrayerHistory, usePrayerStats } from "@/hooks/useWorship";
import { todayKey } from "@/hooks/usePrayerTimes";
import { PageHeader } from "@/components/shared";
import { PRAYERS, type PrayerKey } from "@/lib/api";
import { cn } from "@/lib/utils";

const DAY_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function Tracker() {
  const today = todayKey();
  const { completed, toggle, isAuthenticated } = usePrayerTracker(today);
  const stats = usePrayerStats();
  const [calDate, setCalDate] = useState(() => new Date());

  const range = useMemo(() => {
    const y = calDate.getFullYear();
    const m = calDate.getMonth();
    const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const last = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    return { from, to };
  }, [calDate]);

  const history = usePrayerHistory(range.from, range.to);

  const weekDays = useMemo(() => {
    const out: { day: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const found = stats.days.find((x) => x.day === key);
      out.push({ day: key, label: DAY_AR[d.getDay()], count: found?.count ?? 0 });
    }
    return out;
  }, [stats.days]);

  const monthDays = useMemo(() => {
    const y = calDate.getFullYear();
    const m = calDate.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return { key, n: history[key]?.length ?? 0 };
    });
  }, [calDate, history]);

  const firstWeekday = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
  const weeklyTotal = weekDays.reduce((s, d) => s + d.count, 0);
  const monthTotal = monthDays.reduce((s, d) => s + d.n, 0);

  return (
    <div>
      <PageHeader title="متابعة الصلوات" subtitle="سجّل صلواتك اليومية وتابع ثباتك — خاص بك ولا يشاركه أحد" />

      {!isAuthenticated && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gold bg-[hsl(var(--gold))]/8 px-4 py-3 text-sm">
          <span>أنت تستخدم وضع الضيف — بياناتك محفوظة على هذا الجهاز فقط.</span>
          <Button size="sm" variant="outline" asChild className="gap-1.5 shrink-0">
            <Link to="/login"><LogIn className="h-3.5 w-3.5" /> سجّل الدخول للمزامنة</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Today */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-kufi text-lg font-bold">صلوات اليوم</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                {completed.length} / 5
              </span>
            </div>
            <div className="space-y-2">
              {PRAYERS.map((p) => {
                const done = completed.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => toggle(p.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-right transition-all duration-200",
                      done
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-accent/5",
                    )}
                  >
                    <span className={cn("font-bold", done ? "text-primary" : "text-foreground")}>{p.ar}</span>
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {done && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {completed.length === 5
                ? "ما شاء الله! أتممت صلوات اليوم — ثبّتك الله."
                : completed.length > 0
                  ? "خطوة بخطوة… أتمم ما تبقى من صلواتك."
                  : "ابدأ بتسجيل صلواتك — كل صلاة نور ليومك."}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15">
                <Flame className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.streak} {stats.streak === 1 ? "يوم" : stats.streak <= 10 ? "أيام" : "يومًا"}</p>
                <p className="text-sm text-muted-foreground">أيام متتالية بخمس صلوات كاملة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 text-sm font-bold text-muted-foreground">آخر ٧ أيام — {weeklyTotal} صلاة</h3>
              <div className="flex h-28 items-end gap-2">
                {weekDays.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground">{d.count || ""}</span>
                    <div
                      className={cn("w-full rounded-t-md transition-all duration-500", d.count >= 5 ? "bg-[hsl(var(--gold))]" : "bg-primary")}
                      style={{ height: `${(d.count / 5) * 80}%`, minHeight: d.count > 0 ? 6 : 2, opacity: d.count === 0 ? 0.15 : 0.4 + (d.count / 5) * 0.6 }}
                    />
                    <span className="text-[10px] text-muted-foreground">{d.label.slice(0, 6)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-kufi text-lg font-bold">
              سجل {calDate.toLocaleDateString("ar", { month: "long", year: "numeric" })} — {monthTotal} صلاة
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" aria-label="الشهر السابق"
                onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="الشهر التالي"
                onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DAY_AR.map((d) => (
              <div key={d} className="pb-1 text-[11px] font-bold text-muted-foreground">{d.slice(0, 5)}</div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {monthDays.map((d, i) => {
              const isToday = d.key === today;
              return (
                <div
                  key={d.key}
                  title={`${i + 1}: ${d.n}/5 صلوات`}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors",
                    d.n === 5 && "bg-[hsl(var(--gold))]/20 text-gold font-bold",
                    d.n > 0 && d.n < 5 && "bg-primary/15 text-primary",
                    d.n === 0 && "text-muted-foreground/60",
                    isToday && "ring-2 ring-[hsl(var(--gold))]",
                  )}
                >
                  <span>{i + 1}</span>
                  {d.n > 0 && <span className="text-[9px] opacity-80">{d.n}/5</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[hsl(var(--gold))]/40" /> يوم مكتمل</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary/30" /> يوم جزئي</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { PrayerKey };
