import { useMemo } from "react";
import { Link } from "react-router";
import { MoonStar, LogIn, Sunrise, Sunset, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, fmt12 } from "@/components/shared";
import { usePrayerTimes, todayKey } from "@/hooks/usePrayerTimes";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Ramadan() {
  const { isAuthenticated } = useAuth();
  const pt = usePrayerTimes();
  const utils = trpc.useUtils();
  const today = todayKey();

  const range = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 40);
    const to = new Date();
    to.setDate(to.getDate() + 5);
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from: f(from), to: f(to) };
  }, []);

  const logsQ = trpc.ramadan.getRange.useQuery(range, { enabled: isAuthenticated });
  const upsertMut = trpc.ramadan.upsert.useMutation({ onSuccess: () => utils.ramadan.getRange.invalidate() });

  const logs = logsQ.data ?? {};
  const todayLog = logs[today];
  const isRamadan = pt.data?.hijri.month.number === 9;

  const days = useMemo(() => {
    // آخر 30 يومًا + اليوم
    const out: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(todayKey(d));
    }
    return out;
  }, []);

  const stats = useMemo(() => {
    const arr = Object.values(logs);
    return {
      fasted: arr.filter((l) => l.fasted).length,
      taraweeh: arr.filter((l) => l.taraweeh).length,
      qiyam: arr.filter((l) => l.qiyam).length,
      charity: arr.filter((l) => l.charity).length,
      pages: arr.reduce((s, l) => s + l.quranPages, 0),
    };
  }, [logs]);

  const toggle = (field: "fasted" | "taraweeh" | "qiyam" | "charity") => {
    if (!isAuthenticated) return;
    upsertMut.mutate({ day: today, [field]: !(todayLog?.[field] ?? false) });
  };

  const setPages = (delta: number) => {
    if (!isAuthenticated) return;
    upsertMut.mutate({ day: today, quranPages: Math.max(0, (todayLog?.quranPages ?? 0) + delta) });
  };

  const toggles = [
    { key: "fasted" as const, label: "صيام اليوم", icon: MoonStar, value: todayLog?.fasted },
    { key: "taraweeh" as const, label: "صلاة التراويح", icon: MoonStar, value: todayLog?.taraweeh },
    { key: "qiyam" as const, label: "قيام الليل", icon: MoonStar, value: todayLog?.qiyam },
    { key: "charity" as const, label: "صدقة اليوم", icon: MoonStar, value: todayLog?.charity },
  ];

  return (
    <div>
      <PageHeader title="وضع رمضان" subtitle={isRamadan ? "رمضان كريم — تقبل الله صيامكم وقيامكم" : "تجهّز لرمضان وتتبع عباداتك في أي وقت"} />

      {/* Banner */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative">
          <img src="/images/night-prayer.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-l from-[hsl(158,35%,5%)]/90 to-[hsl(158,30%,7%)]/55" />
          <CardContent className="relative z-10 grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-xl border border-[hsl(42,62%,55%)]/40 bg-[hsl(158,30%,6%)]/70 p-4 text-center">
              <Sunrise className="mx-auto h-5 w-5 text-gold" />
              <p className="mt-1 text-sm text-[hsl(42,25%,80%)]">الإمساك / السحور حتى</p>
              <p className="font-mono text-2xl font-bold text-[hsl(42,40%,92%)]" dir="ltr">{pt.data?.timings.Fajr ?? "--:--"}</p>
              <p className="text-xs text-[hsl(42,20%,65%)]">{pt.data ? fmt12(pt.data.timings.Fajr) : "حدّد موقعك أولًا"}</p>
            </div>
            <div className="rounded-xl border border-[hsl(42,62%,55%)]/40 bg-[hsl(158,30%,6%)]/70 p-4 text-center">
              <Sunset className="mx-auto h-5 w-5 text-gold" />
              <p className="mt-1 text-sm text-[hsl(42,25%,80%)]">الإفطار عند</p>
              <p className="font-mono text-2xl font-bold text-[hsl(42,40%,92%)]" dir="ltr">{pt.data?.timings.Maghrib ?? "--:--"}</p>
              <p className="text-xs text-[hsl(42,20%,65%)]">{pt.data ? fmt12(pt.data.timings.Maghrib) : "حدّد موقعك أولًا"}</p>
            </div>
          </CardContent>
        </div>
      </Card>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <LogIn className="h-7 w-7 text-gold" />
            <p className="font-bold">سجل الدخول لتفعيل متابعة رمضان</p>
            <p className="max-w-md text-sm text-muted-foreground">
              تتبع الصيام والتراويح والقيام وقراءة القرآن يُحفظ في حسابك ويزامَن عبر أجهزتك.
            </p>
            <Button asChild><Link to="/login">تسجيل الدخول</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Today */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="font-kufi mb-4 text-lg font-bold">عبادات اليوم</h2>
              <div className="grid grid-cols-2 gap-3">
                {toggles.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => toggle(t.key)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4 transition-all",
                      t.value ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className={cn("font-bold", t.value && "text-primary")}>{t.label}</span>
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      t.value ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}>
                      {t.value && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-gold bg-[hsl(var(--gold))]/8 p-4">
                <span className="font-bold">صفحات القرآن اليوم</span>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPages(-1)} disabled={upsertMut.isPending}>−</Button>
                  <span className="w-10 text-center font-mono text-xl font-bold" dir="ltr">{todayLog?.quranPages ?? 0}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPages(1)} disabled={upsertMut.isPending}>+</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-kufi mb-4 text-lg font-bold">إحصاءات آخر ٣٠ يومًا</h2>
              <dl className="space-y-3 text-sm">
                {[
                  ["أيام الصيام", stats.fasted],
                  ["ليالي التراويح", stats.taraweeh],
                  ["ليالي القيام", stats.qiyam],
                  ["أيام الصدقة", stats.charity],
                  ["صفحات القرآن", stats.pages],
                ].map(([label, v]) => (
                  <div key={label as string} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-mono text-lg font-bold text-gold" dir="ltr">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* 30-day calendar */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <h2 className="font-kufi mb-4 text-lg font-bold">تقويم الثلاثين يومًا</h2>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                {days.map((d) => {
                  const l = logs[d];
                  const score = l ? (l.fasted ? 1 : 0) + (l.taraweeh ? 1 : 0) + (l.qiyam ? 1 : 0) + (l.charity ? 1 : 0) : 0;
                  return (
                    <div
                      key={d}
                      title={`${d} — ${score}/4`}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs",
                        score >= 3 ? "border-gold bg-[hsl(var(--gold))]/15 text-gold font-bold"
                          : score >= 1 ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground/60",
                        d === today && "ring-2 ring-[hsl(var(--gold))]",
                      )}
                    >
                      <span>{new Date(d).getDate()}</span>
                      {score > 0 && <span className="text-[9px]">{score}/4</span>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
