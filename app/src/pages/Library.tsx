import { useMemo, useState } from "react";
import { Search, LibraryBig } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared";
import { HADITHS, HADITH_TOPICS } from "@/data/hadith";
import { cn } from "@/lib/utils";

export default function Library() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return HADITHS.filter((h) => {
      const matchQ = !q.trim() || h.text.includes(q.trim()) || h.narrator.includes(q.trim()) || h.source.includes(q.trim());
      const matchT = !topic || h.topic === topic;
      return matchQ && matchT;
    });
  }, [q, topic]);

  return (
    <div>
      <PageHeader title="المكتبة الإسلامية" subtitle="أحاديث صحيحة منتقاة من الكتب المعتمدة مع تخريجها" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في نص الحديث أو الراوي أو المصدر…" className="pr-9" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setTopic(null)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
            !topic ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50",
          )}
        >
          الكل
        </button>
        {HADITH_TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => setTopic(topic === t ? null : t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
              topic === t ? "border-gold bg-[hsl(var(--gold))]/15 text-gold" : "border-border hover:border-gold/60",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد نتائج مطابقة لبحثك.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((h, i) => (
            <Card key={i} className="transition-all duration-200 hover:-translate-y-0.5 hover:border-gold">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gold">
                    <LibraryBig className="h-3.5 w-3.5" /> {h.topic}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">{h.source}</span>
                </div>
                <p className="font-quran text-lg leading-loose">«{h.text}»</p>
                <p className="mt-3 text-xs text-muted-foreground">الراوي: {h.narrator}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        جميع الأحاديث المعروضة من دواوين السنة المعتمدة (صحيح البخاري، صحيح مسلم، السنن) مع ذكر التخريج.
      </p>
    </div>
  );
}
