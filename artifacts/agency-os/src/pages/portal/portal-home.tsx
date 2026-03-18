import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  FileText, Upload, Palette, Rocket, Star, 
  CheckCircle2, Clock, Lock, ArrowRight,
  DollarSign, Calendar, Package
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PHASES = [
  { num: 1, label: "Discovery", subtitle: "Tell us about your business", icon: FileText, href: "/portal/discovery", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { num: 2, label: "Onboarding", subtitle: "Upload content & assets", icon: Upload, href: "/portal/onboarding", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  { num: 3, label: "Production", subtitle: "Review & provide feedback", icon: Palette, href: "/portal/production", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  { num: 4, label: "Launch", subtitle: "Launch day checklist", icon: Rocket, href: "/portal/launch", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { num: 5, label: "Post-Launch", subtitle: "Testimonial & referrals", icon: Star, href: "/portal/post-launch", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
];

export default function PortalHome() {
  const { data, isLoading, error } = usePortalData();

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PortalLayout>
    );
  }

  if (error || !data) {
    return (
      <PortalLayout>
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
          Failed to load your project data. Please refresh the page.
        </div>
      </PortalLayout>
    );
  }

  const { project, client, package: pkg, checklist, invoices } = data;
  const currentPhase = project.currentPhase;
  const maxPhase = data.maxVisiblePhase ?? pkg?.phases ?? 5;

  const phase2Items = checklist.filter(c => c.phase === 2);
  const phase2Done = phase2Items.filter(c => c.isCompleted).length;

  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {/* Welcome header */}
        <div>
          <p className="text-sm font-medium tracking-widest text-gradient-brand mb-2">CLIENT PORTAL</p>
          <h1 className="text-4xl font-display font-bold">
            Welcome back, <span className="text-gradient-103">{client.name}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">{project.name}</p>
        </div>

        {/* Project stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Package</span>
            </div>
            <p className="text-xl font-bold text-foreground">{pkg?.name ?? "Custom"}</p>
            <p className="text-sm text-muted-foreground">{pkg ? formatCurrency(pkg.price) : ""}</p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalPaid)}</p>
            <p className="text-sm text-muted-foreground">{paidInvoices.length} invoice{paidInvoices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-400/10">
                <Calendar className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-sm text-muted-foreground">Target Date</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {project.dueDate ? new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
            </p>
          </div>
        </div>

        {/* Phase progress */}
        <div>
          <h2 className="text-2xl font-display font-bold mb-6">Your Project Journey</h2>

          {/* Phase progress bar */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-background">
                {currentPhase}
              </div>
              <span className="text-sm font-medium text-foreground">Phase {currentPhase} of {maxPhase} Active</span>
              <span className="ml-auto text-sm text-muted-foreground">{Math.round((currentPhase / maxPhase) * 100)}% complete</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentPhase / maxPhase) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="mt-4 flex justify-between">
              {Array.from({ length: maxPhase }, (_, i) => i + 1).map(n => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${n < currentPhase ? 'bg-emerald-400' : n === currentPhase ? 'bg-primary' : 'bg-white/10'}`} />
                  <span className="text-[10px] text-muted-foreground">{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phase cards */}
          <div className="grid grid-cols-1 gap-4">
            {PHASES.filter(p => p.num <= maxPhase).map((phase, i) => {
              const isDone = phase.num < currentPhase;
              const isCurrent = phase.num === currentPhase;
              const isLocked = phase.num > currentPhase;

              return (
                <motion.div
                  key={phase.num}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={isLocked ? "#" : phase.href}>
                    <div className={`glass-card rounded-2xl p-5 flex items-center gap-4 transition-all ${
                      isLocked ? 'opacity-40 cursor-not-allowed' : 'hover-glow cursor-pointer'
                    } ${isCurrent ? 'border border-primary/30' : ''}`}>
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${phase.bg} ${phase.border} border`}>
                        {isDone ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : isLocked ? (
                          <Lock className="h-6 w-6 text-muted-foreground/40" />
                        ) : (
                          <phase.icon className={`h-6 w-6 ${phase.color}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tracking-wider text-muted-foreground">PHASE {phase.num}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">ACTIVE</span>
                          )}
                          {isDone && (
                            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">COMPLETE</span>
                          )}
                        </div>
                        <p className="font-bold text-foreground">{phase.label}</p>
                        <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
                        {phase.num === 2 && phase2Items.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-white/5">
                              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(phase2Done / phase2Items.length) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{phase2Done}/{phase2Items.length}</span>
                          </div>
                        )}
                      </div>
                      {!isLocked && (
                        <ArrowRight className={`h-5 w-5 shrink-0 ${phase.color}`} />
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <div>
            <h2 className="text-2xl font-display font-bold mb-4">Invoices</h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-muted-foreground">INVOICE</th>
                    <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-muted-foreground">AMOUNT</th>
                    <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-muted-foreground">DUE</th>
                    <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-muted-foreground">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className={i < invoices.length - 1 ? "border-b border-white/5" : ""}>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(inv.amount)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inv.status === 'paid' ? 'bg-emerald-400/10 text-emerald-400' :
                          inv.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                          inv.status === 'sent' ? 'bg-primary/10 text-primary' :
                          'bg-white/5 text-muted-foreground'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </PortalLayout>
  );
}
