import { type ReactNode } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-kufi text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LocationGate({
  onGeolocate,
  loading,
  compact,
}: {
  onGeolocate: () => void;
  loading?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className={cn("border-gold bg-card", compact && "border-dashed")}>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-bold">حدّد موقعك لعرض مواقيت الصلاة</p>
          <p className="mt-1 text-sm text-muted-foreground">
            فعّل تحديد الموقع تلقائيًا أو اختر مدينتك من صفحة المواقيت.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onGeolocate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            تحديد موقعي
          </Button>
          <Button variant="outline" asChild>
            <Link to="/prayer-times">اختيار مدينة يدويًا</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HijriDate({ hijri }: { hijri: { day: string; month: { ar: string }; year: string; weekday: { ar: string } } }) {
  return (
    <span>
      {hijri.weekday.ar}، {hijri.day} {hijri.month.ar} {hijri.year}هـ
    </span>
  );
}

export function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "ص" : "م";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
