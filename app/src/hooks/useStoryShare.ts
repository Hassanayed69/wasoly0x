import { useCallback, useEffect, useState } from "react";
import { shareStory, type StoryCardOptions } from "@/lib/story-share";

export function useStoryShare() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const share = useCallback(async (id: string, options: StoryCardOptions) => {
    setBusyId(id);
    try {
      const result = await shareStory(options);
      if (result === "downloaded") {
        setToast("تم تنزيل الصورة — ارفعها كستوري في واتساب أو إنستجرام");
      } else if (result === "shared") {
        setToast("تم فتح قائمة المشاركة");
      }
    } catch {
      setToast("تعذّر تجهيز الصورة — جرّب مرة أخرى");
    } finally {
      setBusyId(null);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return { share, busyId, toast };
}
