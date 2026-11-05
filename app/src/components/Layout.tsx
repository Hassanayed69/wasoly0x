import { NavLink, Outlet, useLocation } from "react-router";
import {
  Home, Clock, CheckCircle2, BookOpen, Sparkles, MapPin, LibraryBig,
  HeartHandshake, MoonStar, UserRound, Sun, Moon, Menu, LogIn, LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Logo, LogoMark } from "@/components/Brand";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/prayer-times", label: "مواقيت الصلاة", icon: Clock },
  { to: "/tracker", label: "متابعة الصلوات", icon: CheckCircle2 },
  { to: "/quran", label: "القرآن الكريم", icon: BookOpen },
  { to: "/azkar", label: "الأذكار والتسبيح", icon: Sparkles },
  { to: "/mosques", label: "المساجد القريبة", icon: MapPin },
  { to: "/library", label: "المكتبة الإسلامية", icon: LibraryBig },
  { to: "/charity", label: "الصدقة والأعمال", icon: HeartHandshake },
  { to: "/ramadan", label: "رمضان", icon: MoonStar },
  { to: "/profile", label: "حسابي", icon: UserRound },
];

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[4], NAV[9]];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-colors duration-200",
              "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              isActive && "bg-sidebar-accent text-sidebar-primary font-bold",
            )
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-5 py-6">
      <Logo
        tagline="رفيقك اليومي للعبادة"
        markClassName="h-9 w-9 text-sidebar-primary"
        titleClassName="text-sidebar-foreground"
      />
    </div>
  );
}

function UserFooter() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div className="mt-auto border-t border-sidebar-border p-4">
      {isAuthenticated ? (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-primary font-bold">
            {(user?.name ?? "م").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-sidebar-foreground">{user?.name ?? "مستخدم"}</div>
            <button
              onClick={logout}
              className="mt-0.5 flex items-center gap-1 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-primary"
            >
              <LogOut className="h-3 w-3" /> تسجيل الخروج
            </button>
          </div>
        </div>
      ) : (
        <NavLink
          to="/login"
          className="flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary px-4 py-2.5 text-sm font-bold text-sidebar-primary-foreground transition-opacity hover:opacity-90"
        >
          <LogIn className="h-4 w-4" /> تسجيل الدخول
        </NavLink>
      )}
    </div>
  );
}

export default function Layout() {
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar — pinned to the right in RTL */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[264px] flex-col border-l border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto pb-4">
          <NavItems />
        </div>
        <UserFooter />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground" aria-label="القائمة">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[280px] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
            <Brand />
            <div className="flex-1 overflow-y-auto">
              <NavItems />
            </div>
            <UserFooter />
          </SheetContent>
        </Sheet>
        <NavLink to="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7 text-sidebar-primary" />
          <span className="font-kufi text-xl font-bold text-sidebar-foreground">وصولي</span>
        </NavLink>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="تبديل المظهر" className="text-sidebar-foreground">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      {/* Main content */}
      <main key={location.pathname} className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:max-w-none lg:pb-10 lg:pl-8 lg:pr-[288px] lg:pt-8 xl:pl-12">
        <div className="hidden justify-end lg:mb-2 lg:flex">
          <Button variant="outline" size="sm" onClick={toggle} className="gap-2 rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
          </Button>
        </div>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                isActive ? "text-sidebar-primary font-bold" : "text-sidebar-foreground/60",
              )
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
