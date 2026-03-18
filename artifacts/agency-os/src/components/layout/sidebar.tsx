import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CheckSquare, 
  Receipt,
  LogOut,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/invoices", label: "Invoices", icon: Receipt },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-72 flex-col justify-between glass-panel">
      <div>
        <div className="flex h-24 items-center px-8 border-b border-white/5">
          <div className="flex flex-col">
            <span className="text-3xl font-display font-black tracking-tighter text-gradient-103">
              103
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-primary">
              AGENCY OS
            </span>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-2 px-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
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
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -mt-3 h-6 w-1 rounded-r-full bg-primary shadow-[0_0_10px_0_hsl(var(--primary))]"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-sm font-bold text-white shadow-lg">
              {user?.name?.charAt(0) || "U"}
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
  );
}
