import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogIn, Save, Trash2, Plus, Check, Loader2, ShieldCheck, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const settingsQ = trpc.settings.get.useQuery(undefined, { enabled: isAuthenticated });
  const settingsMut = trpc.settings.update.useMutation({ onSuccess: () => utils.settings.get.invalidate() });
  const updateProfileMut = trpc.account.updateProfile.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const deleteMut = trpc.account.deleteAccount.useMutation({
    onSuccess: async () => {
      await logout();
      navigate("/");
    },
  });

  const goalsQ = trpc.goals.list.useQuery(undefined, { enabled: isAuthenticated });
  const addGoalMut = trpc.goals.add.useMutation({ onSuccess: () => utils.goals.list.invalidate() });
  const bumpGoalMut = trpc.goals.bump.useMutation({ onSuccess: () => utils.goals.list.invalidate() });
  const delGoalMut = trpc.goals.remove.useMutation({ onSuccess: () => utils.goals.list.invalidate() });

  const [name, setName] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("10");

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader title="حسابي" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <LogIn className="h-8 w-8 text-gold" />
            <p className="font-bold text-lg">سجّل الدخول للوصول إلى حسابك</p>
            <p className="max-w-md text-sm text-muted-foreground">
              بحسابك تُحفظ صلواتك وحفظك للقرآن وأذكارك وأهدافك، وتُزامَن عبر جميع أجهزتك بخصوصية تامة.
            </p>
            <Button asChild size="lg"><Link to="/login">تسجيل الدخول باستخدام Google</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const settings = settingsQ.data;
  const goals = goalsQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="حسابي" subtitle="بياناتك وإعداداتك وخصوصيتك" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-kufi mb-4 text-lg font-bold">الملف الشخصي</h2>
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">
                {(user?.name ?? "م").charAt(0)}
              </div>
              <div className="text-sm text-muted-foreground">
                <p>عضو منذ {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar") : "—"}</p>
                <p>آخر دخول: {user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("ar") : "—"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                defaultValue={user?.name ?? ""}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك"
                maxLength={255}
              />
              <Button
                className="gap-2 shrink-0"
                disabled={updateProfileMut.isPending || !name.trim()}
                onClick={() => updateProfileMut.mutate({ name: name.trim() })}
              >
                {updateProfileMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ
              </Button>
            </div>
            {updateProfileMut.isSuccess && <p className="mt-2 text-xs text-primary">تم حفظ الاسم.</p>}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-kufi mb-4 text-lg font-bold">الإعدادات والخصوصية</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">تنبيهات الصلاة</p>
                  <p className="text-xs text-muted-foreground">إشعار عند حلول وقت الصلاة (على هذا الجهاز)</p>
                </div>
                <Switch
                  checked={settings?.notificationsEnabled ?? false}
                  onCheckedChange={(v) => settingsMut.mutate({ notificationsEnabled: v })}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> خصوصية الإحصاءات</p>
                  <p className="text-xs text-muted-foreground">إحصاءات عباداتك خاصة بك ولا تُعرض لأحد — هذا الخيار للميزات الاجتماعية مستقبلًا</p>
                </div>
                <Switch
                  checked={settings?.shareStats ?? false}
                  onCheckedChange={(v) => settingsMut.mutate({ shareStats: v })}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-kufi mb-4 flex items-center gap-2 text-lg font-bold">
            <Target className="h-5 w-5 text-gold" /> أهدافي الروحانية
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="مثال: ختم القرآن هذا العام" className="flex-1" maxLength={300} />
            <Input value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} type="number" min={1} className="w-28" placeholder="الهدف" />
            <Button
              className="gap-2"
              disabled={!goalTitle.trim() || addGoalMut.isPending}
              onClick={() => {
                addGoalMut.mutate({ title: goalTitle.trim(), target: Math.max(1, Number(goalTarget) || 1) });
                setGoalTitle("");
              }}
            >
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {goals.map((g) => (
              <li key={g.id} className={cn("rounded-xl border p-4", g.done ? "border-primary/50 bg-primary/5" : "border-border")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("font-bold", g.done && "text-primary")}>{g.title}</p>
                    <p className="text-xs text-muted-foreground">{g.progress} / {g.target}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {g.done
                      ? <span className="flex items-center gap-1 text-sm font-bold text-primary"><Check className="h-4 w-4" /> تحقق</span>
                      : <Button size="sm" variant="outline" onClick={() => bumpGoalMut.mutate({ id: g.id, delta: 1 })}>+ تقدم</Button>}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => delGoalMut.mutate({ id: g.id })} aria-label="حذف الهدف">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[hsl(var(--gold))] transition-all duration-300" style={{ width: `${Math.min(100, (g.progress / g.target) * 100)}%` }} />
                </div>
              </li>
            ))}
            {goals.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">لا أهداف بعد — حدّد هدفًا روحانيًا وابدأ رحلتك.</li>}
          </ul>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-destructive">حذف الحساب</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              يحذف حسابك وجميع بياناتك (الصلوات، الحفظ، الأذكار، الأهداف) نهائيًا ولا يمكن التراجع.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 shrink-0"><Trash2 className="h-4 w-4" /> حذف حسابي نهائيًا</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيُحذف حسابك وجميع سجلاتك نهائيًا من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>تراجع</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMut.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMut.isPending ? "جارٍ الحذف…" : "نعم، احذف حسابي"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
