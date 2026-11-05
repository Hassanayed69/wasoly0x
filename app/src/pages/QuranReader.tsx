import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowRight, Bookmark, BookmarkCheck, Play, Pause, Loader2, ChevronRight, ChevronLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareToast } from "@/components/ShareToast";
import { fetchChapterAudio, fetchChapters, fetchReciters, fetchVerses, type Chapter, type Reciter, type Verse } from "@/lib/api";
import { useQuranUserData } from "@/hooks/useWorship";
import { useStoryShare } from "@/hooks/useStoryShare";
import { todayKey } from "@/hooks/usePrayerTimes";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const BISMILLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

export default function QuranReader() {
  const { surah: surahParam } = useParams();
  const surahId = Math.min(114, Math.max(1, Number(surahParam) || 1));
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightVerse = Number(searchParams.get("verse")) || 0;

  const { isAuthenticated } = useAuth();
  const { bookmarks, toggleBookmark, setPosition } = useQuranUserData();
  const { share, busyId, toast } = useStoryShare();
  const logMut = trpc.quran.logReading.useMutation();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [reciterId, setReciterId] = useState(() => Number(localStorage.getItem("wusuli.reciter")) || 7);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseRefs = useRef<Record<number, HTMLElement | null>>({});
  const readLogged = useRef(false);

  // load chapter meta
  useEffect(() => {
    fetchChapters().then((chs) => setChapter(chs.find((c) => c.id === surahId) ?? null)).catch(() => null);
    fetchReciters().then(setReciters).catch(() => null);
  }, [surahId]);

  // load verses
  useEffect(() => {
    setLoading(true);
    setError(null);
    setVerses([]);
    setAudioUrl(null);
    setPlaying(false);
    audioRef.current?.pause();
    readLogged.current = false;
    fetchVerses(surahId, 1, 300)
      .then((p) => setVerses(p.verses))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [surahId]);

  // scroll to highlighted verse + log reading
  useEffect(() => {
    if (!loading && verses.length > 0) {
      if (highlightVerse > 0) {
        setTimeout(() => verseRefs.current[highlightVerse]?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      }
      if (!readLogged.current && verses.length > 0) {
        readLogged.current = true;
        const last = verses[verses.length - 1];
        const lastNum = Number(last.verse_key.split(":")[1]);
        setPosition(surahId, Math.max(1, lastNum));
        if (isAuthenticated) logMut.mutate({ day: todayKey(), verses: verses.length });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, verses, surahId, highlightVerse]);

  const toggleAudio = useCallback(async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      let url = audioUrl;
      if (!url) {
        setAudioLoading(true);
        url = await fetchChapterAudio(reciterId, surahId);
        setAudioUrl(url);
      }
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.onended = () => setPlaying(false);
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setError("تعذر تشغيل التلاوة الصوتية");
    } finally {
      setAudioLoading(false);
    }
  }, [playing, audioUrl, reciterId, surahId]);

  const isBookmarked = (v: Verse) => {
    const num = Number(v.verse_key.split(":")[1]);
    return bookmarks.some((b) => b.surah === surahId && b.verse === num);
  };

  const changeReciter = (v: string) => {
    const id = Number(v);
    setReciterId(id);
    localStorage.setItem("wusuli.reciter", String(id));
    setAudioUrl(null);
    setPlaying(false);
    audioRef.current?.pause();
  };

  const goToVerse = (num: number) => setSearchParams({ verse: String(num) });

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="عودة إلى الفهرس">
            <Link to="/quran"><ArrowRight className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="font-quran text-2xl font-bold md:text-3xl">
              {chapter ? `سورة ${chapter.name_arabic}` : `السورة ${surahId}`}
            </h1>
            {chapter && (
              <p className="text-sm text-muted-foreground">
                {chapter.revelation_place === "makkah" ? "مكية" : "مدنية"} — {chapter.verses_count} آية
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(reciterId)} onValueChange={changeReciter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="القارئ" /></SelectTrigger>
            <SelectContent>
              {reciters.slice(0, 30).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={toggleAudio} disabled={audioLoading} className="gap-2">
            {audioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "إيقاف" : "استماع"}
          </Button>
        </div>
      </div>

      <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Share2 className="h-3.5 w-3.5 text-gold" />
        اضغط أيقونة المشاركة بجانب أي آية لتحويلها إلى صورة ستوري جاهزة.
      </p>

      {/* Reader */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {surahId !== 1 && surahId !== 9 && (
          <p className="font-quran border-b border-border bg-[hsl(var(--gold))]/6 py-5 text-center text-2xl md:text-3xl">
            {BISMILLAH}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل الآيات…
          </div>
        ) : error ? (
          <p className="p-10 text-center text-destructive">{error}</p>
        ) : (
          <div className="font-quran px-5 py-6 text-xl leading-[2.6] md:px-10 md:text-[1.55rem]">
            {verses.map((v) => {
              const num = Number(v.verse_key.split(":")[1]);
              const hl = num === highlightVerse;
              return (
                <span
                  key={v.verse_key}
                  ref={(el) => { verseRefs.current[num] = el; }}
                  className={cn(
                    "group relative rounded-md transition-colors duration-300",
                    hl && "bg-[hsl(var(--gold))]/18 px-1",
                  )}
                >
                  {v.text_uthmani}{" "}
                  <button
                    onClick={() => goToVerse(num)}
                    className={cn(
                      "mx-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-1 align-middle text-sm",
                      hl ? "border-gold bg-[hsl(var(--gold))]/15 text-gold" : "border-primary/40 text-primary",
                    )}
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                    aria-label={`الآية ${num}`}
                  >
                    {num}
                  </button>
                  <button
                    onClick={() => toggleBookmark(surahId, num)}
                    aria-label="حفظ الآية"
                    className={cn(
                      "mx-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full align-middle opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100",
                      isBookmarked(v) && "opacity-100",
                    )}
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    {isBookmarked(v)
                      ? <BookmarkCheck className="h-4 w-4 text-gold" />
                      : <Bookmark className="h-4 w-4 text-muted-foreground hover:text-gold" />}
                  </button>
                  <button
                    onClick={() =>
                      share(`ayah-${num}`, {
                        text: v.text_uthmani,
                        reference: chapter
                          ? `سورة ${chapter.name_arabic} — الآية ${num}`
                          : `الآية ${num}`,
                        kind: "ayah",
                      })
                    }
                    aria-label={`مشاركة الآية ${num} كصورة ستوري`}
                    title="مشاركة الآية كستوري"
                    className="mx-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full align-middle text-muted-foreground opacity-45 transition-opacity hover:text-gold focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    {busyId === `ayah-${num}`
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Share2 className="h-4 w-4" />}
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Surah nav */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" asChild disabled={surahId <= 1}>
            <Link to={`/quran/${surahId - 1}`} className={cn(surahId <= 1 && "pointer-events-none opacity-40")}>
              <ChevronRight className="h-4 w-4" /> السورة السابقة
            </Link>
          </Button>
          <span className="font-kufi text-sm text-muted-foreground">{surahId} / 114</span>
          <Button variant="outline" asChild disabled={surahId >= 114}>
            <Link to={`/quran/${surahId + 1}`} className={cn(surahId >= 114 && "pointer-events-none opacity-40")}>
              السورة التالية <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <ShareToast text={toast} />
    </div>
  );
}
