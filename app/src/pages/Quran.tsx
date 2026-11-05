import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { BookOpen, Bookmark, Search, Loader2, Target, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";
import { fetchChapters, searchQuran, type Chapter } from "@/lib/api";
import { useQuranUserData } from "@/hooks/useWorship";
import { cn } from "@/lib/utils";

export default function Quran() {
  const navigate = useNavigate();
  const { bookmarks, position, setGoal } = useQuranUserData();
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ verse_key: string; text: string }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<"surahs" | "bookmarks">("surahs");


  useEffect(() => {
    fetchChapters().then(setChapters).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    const q = query.trim();
    if (!q) return chapters;
    return chapters.filter((c) => c.name_arabic.includes(q) || c.name_simple.toLowerCase().includes(q.toLowerCase()) || String(c.id) === q);
  }, [chapters, query]);

  const doVerseSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const r = await searchQuran(query.trim());
      setSearchResults(r as { verse_key: string; text: string }[]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <PageHeader title="القرآن الكريم" subtitle="اقرأ وتدبّر — المصدر: Quran.com API" />

      {/* Reading status */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="border-gold">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">آخر موضع قراءة</p>
              <p className="mt-1 text-lg font-bold">
                سورة رقم {position.lastSurah} — الآية {position.lastVerse}
              </p>
            </div>
            <Button asChild className="gap-2 shrink-0">
              <Link to={`/quran/${position.lastSurah}?verse=${position.lastVerse}`}>
                <Play className="h-4 w-4" /> متابعة القراءة
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-gold" />
              <div>
                <p className="text-sm text-muted-foreground">الهدف اليومي</p>
                <p className="font-bold">{position.dailyGoalVerses} آيات</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[5, 10, 20, 50].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={position.dailyGoalVerses === n ? "default" : "outline"}
                  onClick={() => setGoal(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchResults(null); }}
            onKeyDown={(e) => e.key === "Enter" && doVerseSearch()}
            placeholder="ابحث باسم سورة أو رقمها، واضغط Enter للبحث في نص القرآن…"
            className="pr-9"
          />
        </div>
        <Button variant="outline" onClick={doVerseSearch} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "بحث في الآيات"}
        </Button>
      </div>

      {searchResults && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-bold text-muted-foreground">نتائج البحث ({searchResults.length})</h3>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا نتائج مطابقة.</p>
            ) : (
              <ul className="max-h-72 space-y-3 overflow-y-auto">
                {searchResults.map((r) => {
                  const [s, v] = r.verse_key.split(":").map(Number);
                  return (
                    <li key={r.verse_key}>
                      <button
                        onClick={() => navigate(`/quran/${s}?verse=${v}`)}
                        className="w-full rounded-lg border border-border p-3 text-right transition-colors hover:border-gold"
                      >
                        <span className="font-quran block leading-loose" dangerouslySetInnerHTML={{ __html: r.text }} />
                        <span className="mt-1 block text-xs text-gold">الآية {r.verse_key}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "surahs" ? "default" : "outline"} size="sm" onClick={() => setTab("surahs")}>
          <BookOpen className="ml-1 h-4 w-4" /> السور (١١٤)
        </Button>
        <Button variant={tab === "bookmarks" ? "default" : "outline"} size="sm" onClick={() => setTab("bookmarks")}>
          <Bookmark className="ml-1 h-4 w-4" /> المحفوظات ({bookmarks.length})
        </Button>
      </div>

      {tab === "bookmarks" ? (
        bookmarks.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            لا توجد آيات محفوظة بعد — اضغط على أيقونة الحفظ بجانب أي آية أثناء القراءة.
          </CardContent></Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((b) => (
              <Link
                key={`${b.surah}:${b.verse}`}
                to={`/quran/${b.surah}?verse=${b.verse}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-gold"
              >
                <span className="font-bold">السورة {b.surah} — الآية {b.verse}</span>
                <Bookmark className="h-4 w-4 fill-[hsl(var(--gold))] text-gold" />
              </Link>
            ))}
          </div>
        )
      ) : error ? (
        <Card><CardContent className="p-10 text-center text-destructive">{error}</CardContent></Card>
      ) : !chapters ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل المصحف…
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/quran/${c.id}`)}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-right transition-all hover:-translate-y-0.5 hover:border-gold",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-kufi text-sm font-bold text-primary">
                {c.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-quran block truncate text-lg font-bold">{c.name_arabic}</span>
                <span className="block text-xs text-muted-foreground">
                  {c.revelation_place === "makkah" ? "مكية" : "مدنية"} — {c.verses_count} آية
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
