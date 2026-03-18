import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetDashboardMetrics } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  Briefcase, 
  Users, 
  AlertCircle,
  Activity,
  ArrowUpRight,
  Layers
} from "lucide-react";

export default function Dashboard() {
  const { data: metrics, isLoading } = useGetDashboardMetrics();

  if (isLoading || !metrics) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: "Total Revenue", value: formatCurrency(metrics.totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Active Projects", value: metrics.activeProjects, icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Clients", value: metrics.totalClients, icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Overdue Invoices", value: metrics.overdueInvoices, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-4xl font-display font-bold">Dashboard Overview</h1>
          <p className="mt-2 text-muted-foreground">Here's what's happening at your agency today.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 hover-glow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Clients by Phase */}
        {(metrics as any).clientsByPhase && (metrics as any).clientsByPhase.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-display font-bold">Portal — Clients by Phase</h3>
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(phase => {
                const phaseLabels: Record<number, string> = {
                  1: "Discovery", 2: "Onboarding", 3: "Production", 4: "Launch", 5: "Post-Launch"
                };
                const found = ((metrics as any).clientsByPhase as { phase: number; count: number }[]).find(p => p.phase === phase);
                const count = found?.count ?? 0;
                return (
                  <div key={phase} className={`rounded-xl p-4 text-center border ${count > 0 ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-white/2'}`}>
                    <div className={`text-2xl font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</div>
                    <div className="text-xs text-muted-foreground mt-1">Phase {phase}</div>
                    <div className="text-xs text-muted-foreground font-medium">{phaseLabels[phase]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <h3 className="mb-6 text-xl font-display font-bold">Revenue Overview</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.revenueByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-display font-bold">Recent Activity</h3>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              {metrics.recentActivity.map((activity) => (
                <div key={activity.id} className="relative pl-6">
                  <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_0_hsl(var(--primary))]" />
                  <div className="absolute left-[3px] top-4 -bottom-4 w-[2px] bg-border last:hidden" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-primary">{activity.userName}</span> {activity.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
