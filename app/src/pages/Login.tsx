import { Link, useSearchParams } from "react-router";
import { ArrowLeft, ShieldCheck, WifiOff } from "lucide-react";
import { LogoMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29V6.62H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.2 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

const ERROR_TEXT: Record<string, string> = {
  google_unconfigured:
    "تسجيل الدخول بجوجل غير مُفعّل بعد. أضف GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET إلى ملف البيئة ثم أعد تشغيل التطبيق.",
  state_mismatch: "انتهت صلاحية الجلسة. حاول تسجيل الدخول مرة أخرى.",
  oauth_failed: "تعذّر إكمال تسجيل الدخول بجوجل. حاول مرة أخرى.",
};

export default function Login() {
  const [params] = useSearchParams();
  const errorKey = params.get("error") ?? "";
  const error = ERROR_TEXT[errorKey];

  return (
    <div className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
        {/* Photo panel */}
        <div className="relative hidden overflow-hidden lg:block">
          <img
            src="/images/wusuli-beach.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,36%,5%)] via-[hsl(158,32%,7%)]/55 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-3">
              <LogoMark className="h-10 w-10 text-[hsl(42,62%,58%)]" />
              <div>
                <div className="font-kufi text-2xl font-bold leading-none text-[hsl(42,34%,94%)]">
                  وصولي
                </div>
                <div className="mt-1 text-[11px] tracking-wide text-[hsl(42,18%,72%)]">
                  رفيقك اليومي للعبادة
                </div>
              </div>
            </div>

            <div className="max-w-md">
              <p className="font-quran text-2xl leading-loose text-[hsl(42,32%,92%)] xl:text-[28px]">
                ﴿وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ﴾
              </p>
              <p className="mt-3 text-sm text-[hsl(42,16%,70%)]">هود — ١١٤</p>
              <div className="mt-8 h-px w-16 bg-[hsl(42,62%,55%)]/60" />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-[hsl(42,14%,72%)]">
                مواقيت الصلاة، المصحف، الأذكار، ودليل مساجد مصر — في مكان واحد،
                وبخصوصية تامة.
              </p>
            </div>
          </div>
        </div>

        {/* Sign-in panel */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="relative mb-8 overflow-hidden rounded-2xl lg:hidden">
              <img
                src="/images/wusuli-beach.jpg"
                alt=""
                className="h-36 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,36%,5%)]/90 via-[hsl(158,32%,8%)]/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
                <LogoMark className="h-9 w-9 text-[hsl(42,62%,58%)]" />
                <div>
                  <div className="font-kufi text-2xl font-bold leading-none text-[hsl(42,34%,94%)]">وصولي</div>
                  <div className="mt-1 text-[11px] text-[hsl(42,18%,75%)]">رفيقك اليومي للعبادة</div>
                </div>
              </div>
            </div>

            <p className="text-sm font-bold text-gold">أهلًا بك من جديد</p>
            <h1 className="font-kufi mt-2 text-3xl font-bold leading-snug">
              سجّل الدخول لمتابعة عبادتك
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              حساب واحد يحفظ صلواتك ووردك من القرآن وأذكارك، ويُزامنها بين
              أجهزتك.
            </p>

            {error && (
              <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
                {error}
              </div>
            )}

            <a
              href="/api/auth/google"
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 text-[15px] font-bold shadow-sm transition-colors hover:border-[hsl(42,62%,55%)]/60 hover:bg-secondary"
            >
              <GoogleGlyph className="h-5 w-5" />
              المتابعة باستخدام Google
            </a>

            <div className="my-6 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              أو
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" asChild className="w-full gap-2 rounded-xl py-3">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                متابعة كضيف
              </Link>
            </Button>

            <div className="mt-8 space-y-3 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                نطلب الاسم والبريد وصورة الحساب فقط لإنشاء ملفك. لا ننشر شيئًا
                نيابة عنك ولا نطّلع على رسائلك.
              </p>
              <p className="flex items-start gap-2">
                <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                يمكنك استخدام التطبيق كضيف، وستُحفظ بياناتك على هذا الجهاز فقط.
              </p>
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              بالمتابعة أنت توافق على{" "}
              <span className="underline underline-offset-2">شروط الاستخدام</span>{" "}
              و{" "}
              <span className="underline underline-offset-2">سياسة الخصوصية</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
