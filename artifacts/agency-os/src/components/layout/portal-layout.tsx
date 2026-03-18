import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Home,
  FileText,
  Upload,
  Palette,
  Rocket,
  Star,
  LogOut,
} from "lucide-react";

const phaseNav = [
  { href: "/portal", label: "Overview", icon: Home, phase: 0 },
  { href: "/portal/discovery", label: "Phase 1: Discovery", icon: FileText, phase: 1, description: "Tell us about your business" },
  { href: "/portal/onboarding", label: "Phase 2: Onboarding", icon: Upload, phase: 2, description: "Upload content & assets" },
  { href: "/portal/production", label: "Phase 3: Production", icon: Palette, phase: 3, description: "Review & provide feedback" },
  { href: "/portal/launch", label: "Phase 4: Launch", icon: Rocket, phase: 4, description: "Launch day checklist" },
  { href: "/portal/post-launch", label: "Phase 5: Post-Launch", icon: Star, phase: 5, description: "Testimonial & referrals" },
];

interface PortalLayoutProps {
  children: React.ReactNode;
  currentPhase?: number;
  maxPhase?: number;
}

export function PortalLayout({ children, currentPhase = 0, maxPhase = 5 }: PortalLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-72 shrink-0 flex-col justify-between glass-panel">
        <div>
          <div className="flex h-24 items-center px-8 border-b border-white/5">
            <div className="flex flex-col">
              <span className="text-3xl font-display font-black tracking-tighter text-gradient-103">103</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-primary">CLIENT PORTAL</span>
            </div>
          </div>

          <div className="mt-6 px-4">
            <p className="px-4 text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">Your Journey</p>
            <nav className="flex flex-col gap-1">
              {phaseNav.map((item) => {
                // Hide phases that exceed the package's phase count (phase 0 = overview, always show)
                if (item.phase > 0 && item.phase > maxPhase) return null;

                const isActive = location === item.href;
                const isCompleted = item.phase > 0 && item.phase < currentPhase;
                const isCurrent = item.phase === currentPhase;

                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                        isActive
                          ? "text-primary bg-primary/10 shadow-[inset_0_0_20px_0_hsl(var(--primary)/0.1)]"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      )}
                    >
                      <div className="relative">
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : isCompleted ? "text-emerald-400" : "text-muted-foreground")} />
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        )}
                        {isCurrent && item.phase > 0 && !isActive && (
                          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.description && (
                          <span className="text-[10px] text-muted-foreground/60 truncate">{item.description}</span>
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="portal-sidebar-active"
                          className="absolute left-0 top-1/2 -mt-3 h-6 w-1 rounded-r-full bg-primary shadow-[0_0_10px_0_hsl(var(--primary))]"
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-sm font-bold text-white shadow-lg">
                {user?.name?.charAt(0) || "C"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-bold text-foreground">{user?.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
