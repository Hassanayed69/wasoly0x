// صورة ستوري (٩:١٦) للذكر أو الآية + مشاركة عبر Web Share API،
// مع تنزيل الصورة كبديل على الأجهزة التي لا تدعم مشاركة الملفات.

export type StoryKind = "dhikr" | "ayah";

export interface StoryCardOptions {
  text: string;
  reference?: string;
  kind: StoryKind;
}

const W = 1080;
const H = 1920;
const GOLD = "#d9a744";
const CREAM = "#f7f1e3";

const ARCH = "M12.5 58V31.5C12.5 18 20.5 9.5 32 4.5c11.5 5 19.5 13.5 19.5 27V58";
const BASE = "M12.5 58h39";
const LAMP = "M24.2 24.4h15.6l2.3 9.5a10.1 10.1 0 0 1-20.2 0l2.3-9.5Z";
const CORD = "M32 12.7v8.6";
const FLAME = "M32 30.8c1.9 2.1 1.9 5.1 0 7.2-1.9-2.1-1.9-5.1 0-7.2Z";

let fontsPromise: Promise<void> | null = null;

async function ensureFonts(): Promise<void> {
  fontsPromise ??= (async () => {
    try {
      await Promise.all([
        document.fonts.load("700 60px Amiri"),
        document.fonts.load("700 48px Tajawal"),
        document.fonts.load("500 26px Tajawal"),
      ]);
      await document.fonts.ready;
    } catch {
      /* الخطوط الاحتياطية كافية */
    }
  })();
  return fontsPromise;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMark(ctx: CanvasRenderingContext2D, cx: number, top: number, scale: number) {
  ctx.save();
  ctx.translate(cx - 32 * scale, top);
  ctx.scale(scale, scale);
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(ARCH));
  ctx.stroke(new Path2D(BASE));
  ctx.lineWidth = 1.6;
  ctx.stroke(new Path2D(CORD));
  ctx.lineWidth = 1.9;
  ctx.stroke(new Path2D(LAMP));
  ctx.fill(new Path2D(FLAME));
  ctx.beginPath();
  ctx.arc(32, 20.3, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number) {
  for (const size of [60, 54, 48, 44, 40, 36, 32]) {
    ctx.font = `700 ${size}px Amiri, "Times New Roman", serif`;
    const lines = wrapLines(ctx, text, maxWidth);
    const lineHeight = Math.round(size * 1.8);
    if (lines.length * lineHeight <= maxHeight) return { size, lines, lineHeight };
  }
  ctx.font = '700 30px Amiri, "Times New Roman", serif';
  const lines = wrapLines(ctx, text, maxWidth);
  return { size: 30, lines, lineHeight: 54 };
}

export async function buildStoryImage({ text, reference, kind }: StoryCardOptions): Promise<Blob> {
  await ensureFonts();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تجهيز الصورة");

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // خلفية داكنة بلمسة ذهبية
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d3327");
  bg.addColorStop(0.55, "#09241b");
  bg.addColorStop(1, "#061711");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 760, 40, W / 2, 760, 760);
  glow.addColorStop(0, "rgba(217,167,68,0.16)");
  glow.addColorStop(1, "rgba(217,167,68,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // إطار مزدوج
  ctx.strokeStyle = "rgba(217,167,68,0.38)";
  ctx.lineWidth = 2;
  roundRect(ctx, 48, 48, W - 96, H - 96, 30);
  ctx.stroke();
  ctx.strokeStyle = "rgba(217,167,68,0.12)";
  roundRect(ctx, 70, 70, W - 140, H - 140, 24);
  ctx.stroke();

  // هوية وصولي
  drawMark(ctx, W / 2, 108, 1.5);
  ctx.fillStyle = GOLD;
  ctx.font = "700 52px Tajawal, sans-serif";
  ctx.fillText("وصولي", W / 2, 268);
  ctx.fillStyle = "rgba(247,241,227,0.55)";
  ctx.font = "500 23px Tajawal, sans-serif";
  ctx.fillText("رفيقك اليومي للعبادة", W / 2, 308);

  // تصنيف المحتوى
  const label = kind === "ayah" ? "آية من القرآن الكريم" : "ذكر";
  ctx.font = "700 25px Tajawal, sans-serif";
  const labelWidth = ctx.measureText(label).width + 76;
  ctx.strokeStyle = "rgba(217,167,68,0.45)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, W / 2 - labelWidth / 2, 380, labelWidth, 56, 28);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.fillText(label, W / 2, 409);

  // النص
  const display = kind === "ayah" ? `﴿ ${text} ﴾` : text;
  const fitted = fitText(ctx, display, 860, 1070);
  ctx.fillStyle = CREAM;
  ctx.font = `700 ${fitted.size}px Amiri, "Times New Roman", serif`;
  const blockHeight = fitted.lines.length * fitted.lineHeight;
  const startY = 480 + (1070 - blockHeight) / 2 + fitted.lineHeight / 2;
  fitted.lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * fitted.lineHeight);
  });

  // فاصل ذهبي
  const dividerY = 1600;
  ctx.strokeStyle = "rgba(217,167,68,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(360, dividerY);
  ctx.lineTo(492, dividerY);
  ctx.moveTo(588, dividerY);
  ctx.lineTo(720, dividerY);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(W / 2, dividerY - 9);
  ctx.lineTo(W / 2 + 9, dividerY);
  ctx.lineTo(W / 2, dividerY + 9);
  ctx.lineTo(W / 2 - 9, dividerY);
  ctx.closePath();
  ctx.fill();

  // المرجع
  if (reference) {
    let size = 30;
    ctx.font = `600 ${size}px Tajawal, sans-serif`;
    while (ctx.measureText(reference).width > 820 && size > 20) {
      size -= 2;
      ctx.font = `600 ${size}px Tajawal, sans-serif`;
    }
    ctx.fillStyle = GOLD;
    ctx.fillText(reference, W / 2, 1668);
  }

  ctx.fillStyle = "rgba(247,241,227,0.4)";
  ctx.font = "500 24px Tajawal, sans-serif";
  ctx.fillText("وصولي — رفيقك اليومي للعبادة", W / 2, 1802);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("تعذّر تجهيز الصورة"))),
      "image/png",
      1,
    );
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

export async function shareStory(options: StoryCardOptions): Promise<ShareResult> {
  const blob = await buildStoryImage(options);
  const file = new File([blob], "wusuli-story.png", { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "وصولي" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // بعض المتصفحات ترفض مشاركة الملفات — ننزّل الصورة بدلًا من ذلك
    }
  }

  downloadBlob(blob, "wusuli-story.png");
  return "downloaded";
}
