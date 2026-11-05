import { useMemo, useState } from "react";
import { Link } from "react-router";
import { HeartHandshake, Plus, Trash2, LogIn, BadgeCheck, ExternalLink, Loader2, MapPin, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared";
import { CHARITIES, EGYPT_CHARITIES, dailyDeeds, type Charity } from "@/data/deeds";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { todayKey } from "@/hooks/usePrayerTimes";
import { cn } from "@/lib/utils";

const CATS: Record<string, string> = {
  charity: "صدقة مالية",
  kindness: "معروف",
  family: "صلة رحم",
  knowledge: "علم نافع",
  other: "أخرى",
};

export default function Charity() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const suggestions = dailyDeeds();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("charity");
  const [amount, setAmount] = useState("");
  const [charityCity, setCharityCity] = useState("الكل");

  const charityCities = useMemo(
    () => ["الكل", ...Array.from(new Set(EGYPT_CHARITIES.map((c) => c.city ?? c.region)))],
    [],
  );
  const shownCharities =
    charityCity === "الكل"
      ? EGYPT_CHARITIES
      : EGYPT_CHARITIES.filter((c) => (c.city ?? c.region) === charityCity);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { from: f(from), to: f(to) };
  }, []);

  const deedsQ = trpc.deeds.list.useQuery(range, { enabled: isAuthenticated });
  const addMut = trpc.deeds.add.useMutation({
    onSuccess: () => { utils.deeds.list.invalidate(); setTitle(""); setAmount(""); },
  });
  const delMut = trpc.deeds.remove.useMutation({ onSuccess: () => utils.deeds.list.invalidate() });

  const deeds = deedsQ.data ?? [];
  const thisMonth = deeds.length;

  return (
    <div>
      <PageHeader title="الصدقة والأعمال الصالحة" subtitle="سجّل أعمالك الصالحة وتصدّق عبر جهات موثقة فقط" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Suggestions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-kufi mb-4 flex items-center gap-2 text-lg font-bold">
              <HeartHandshake className="h-5 w-5 text-gold" /> أعمال مقترحة اليوم
            </h2>
            <ul className="space-y-3">
              {suggestions.map((d, i) => (
                <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                  <span className="text-sm leading-relaxed">{d}</span>
                  {isAuthenticated && (
                    <Button
                      size="sm" variant="outline" className="shrink-0 gap-1"
                      disabled={addMut.isPending}
                      onClick={() => addMut.mutate({ day: todayKey(), title: d, category: "kindness" })}
                    >
                      <Plus className="h-3.5 w-3.5" /> سجّلتها
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Record + history */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-kufi mb-4 text-lg font-bold">سجل أعمالك ({thisMonth} هذا الشهر)</h2>
            {!isAuthenticated ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gold p-8 text-center">
                <LogIn className="h-6 w-6 text-gold" />
                <p className="text-sm text-muted-foreground">سجّل الدخول لحفظ أعمالك الصالحة ومتابعتها عبر أجهزتك.</p>
                <Button asChild><Link to="/login">تسجيل الدخول</Link></Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ماذا فعلت اليوم؟ مثال: تبرعت بمبلغ لكفالة يتيم" maxLength={300} />
                  <div className="flex gap-2">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ (اختياري)" className="w-32" maxLength={60} />
                    <Button
                      onClick={() => title.trim() && addMut.mutate({ day: todayKey(), title: title.trim(), category: category as "charity", amount: amount || undefined })}
                      disabled={!title.trim() || addMut.isPending}
                    >
                      {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                  {deeds.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{d.title}</p>
                        <p className="text-xs text-muted-foreground">{CATS[d.category]}{d.amount ? ` — ${d.amount}` : ""} — {d.day}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => delMut.mutate({ id: d.id })} aria-label="حذف">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {deeds.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">لم تسجل أعمالًا بعد — كل عمل صالح يُحسب لك.</li>}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Egyptian charities */}
      <section className="mt-10">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-kufi flex items-center gap-2 text-xl font-bold">
              <HeartHandshake className="h-5 w-5 text-gold" />
              جهات خيرية في مصر
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أماكن معروفة تعمل على الأرض — تبرّع من موقعها الرسمي أو زر مقرها.
            </p>
          </div>
        </div>

        <p className="mb-4 rounded-lg border border-gold/60 bg-[hsl(var(--gold))]/8 px-4 py-2.5 text-sm leading-relaxed">
          وصولي لا يستلم تبرعات ولا يحتفظ ببيانات الدفع. نعرض الجهات فقط، والتبرع
          يتم مباشرة على قنواتها الرسمية.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {charityCities.map((city) => (
            <button
              key={city}
              onClick={() => setCharityCity(city)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
                charityCity === city
                  ? "border-gold bg-[hsl(var(--gold))]/15 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/60 hover:text-foreground",
              )}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shownCharities.map((c) => (
            <CharityCard key={c.name} charity={c} />
          ))}
        </div>
      </section>

      {/* International funds */}
      <section className="mt-10">
        <h2 className="font-kufi text-lg font-bold">صناديق دولية موثقة</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          خيارات لمن أراد التبرع خارج مصر، بجهات مسجلة وخاضعة للتدقيق.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {CHARITIES.map((c) => (
            <CharityCard key={c.name} charity={c} compact />
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        القائمة مراجعة يدويًا، لكنها ليست توصية مالية. تحقّق دائمًا من ترخيص
        الجهة قبل التبرع، ولا تحوّل أموالًا إلى حسابات شخصية.
      </p>
    </div>
  );
}

function CharityCard({ charity: c, compact }: { charity: Charity; compact?: boolean }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    c.mapQuery ?? `${c.name} ${c.city ?? "مصر"}`,
  )}`;

  return (
    <Card className="h-full transition-colors hover:border-gold/60">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs font-bold text-primary">{c.verified}</span>
        </div>
        <h3 className="font-kufi text-lg font-bold leading-snug">{c.name}</h3>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
          {c.description}
        </p>

        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
          <span>{c.address ?? c.region}</span>
        </div>

        {c.focus && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.focus.map((f) => (
              <span
                key={f}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-bold text-gold hover:underline"
          >
            زيارة الموقع <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {!compact && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              <Navigation className="h-3.5 w-3.5" /> الموقع على الخريطة
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
