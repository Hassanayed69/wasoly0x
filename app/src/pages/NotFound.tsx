import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Brand";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[62vh] items-center justify-center overflow-hidden rounded-3xl border border-border bg-card px-5 py-12">
      <img
        src="/images/eagle.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-20 grayscale"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/35" />

      <div className="relative w-full max-w-md text-center">
        <LogoMark className="mx-auto h-14 w-14 text-gold" />
        <p className="mt-8 font-kufi text-6xl font-bold text-gold">٤٠٤</p>
        <h1 className="font-kufi mt-4 text-2xl font-bold">الصفحة دي مش موجودة</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          يمكن الرابط اتغيّر أو الصفحة اتشالت. ارجع للرئيسية وهتلاقي كل حاجة في
          مكانها.
        </p>
        <Button asChild className="mt-7 gap-2">
          <Link to="/">
            <ArrowRight className="h-4 w-4" />
            ارجع للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
}
