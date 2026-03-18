import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { ChecklistItem } from "./use-portal-data";

const LAUNCH_STEPS = [
  {
    title: "What happens on launch day?",
    items: [
      "We connect your domain and flip the switch — your new site goes live.",
      "You'll receive an email confirmation once the domain is connected and SSL is active.",
      "We do a final pass to check all links, forms, and pages are working correctly.",
      "Your old site is backed up before we make any changes.",
    ],
  },
  {
    title: "What you'll receive at handover:",
    items: [
      "Login credentials for your website CMS / admin panel.",
      "A short video walkthrough showing you how to make basic updates.",
      "Your Google Analytics / tracking confirmation.",
      "Copies of all design files (if applicable to your package).",
    ],
  },
];

export default function PortalLaunch() {
  const { data, isLoading } = usePortalData();

  const currentPhase = data?.project.currentPhase ?? 1;
  const maxPhase = data?.maxVisiblePhase ?? data?.package?.phases ?? 5;
  const phase4Items = data?.checklist.filter(c => c.phase === 4) ?? [];
  const completedCount = phase4Items.filter(c => c.isCompleted).length;
  const allDone = completedCount === phase4Items.length && phase4Items.length > 0;

  const getItemIcon = (item: ChecklistItem) => {
    if (item.isCompleted) return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />;
    if (currentPhase >= 4) return <Clock className="h-5 w-5 text-yellow-400 shrink-0" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground/40 shrink-0" />;
  };

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 border border-emerald-400/20">
              <Rocket className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-emerald-400">PHASE 4</p>
              <h1 className="text-3xl font-display font-bold">Launch Day</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            You're almost live! Here's what to expect on launch day and what our team completes before handing over the keys.
          </p>
        </div>

        {/* Progress */}
        {phase4Items.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Launch Checklist</span>
              <span className="text-sm text-muted-foreground">{completedCount}/{phase4Items.length} complete</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/5">
              <motion.div
                className={`h-2.5 rounded-full transition-all ${allDone ? 'bg-emerald-400' : 'bg-emerald-400/60'}`}
                style={{ width: `${phase4Items.length > 0 ? (completedCount / phase4Items.length) * 100 : 0}%` }}
              />
            </div>
            {allDone && (
              <p className="mt-3 text-sm text-emerald-400 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                All launch tasks complete — you're ready to go live!
              </p>
            )}
          </div>
        )}

        {/* Launch checklist */}
        <div>
          <h2 className="text-xl font-bold mb-4">Pre-Launch Checklist</h2>
          <p className="text-sm text-muted-foreground mb-4">These tasks are completed by our team before your site goes live. You'll be notified as each one is ticked off.</p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {phase4Items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card rounded-2xl p-5 flex items-center gap-4 ${item.isCompleted ? 'border border-emerald-400/20' : ''}`}
                >
                  {getItemIcon(item)}
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${item.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.label}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.isCompleted && (
                    <span className="text-xs text-emerald-400 shrink-0">Done</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* What to expect */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LAUNCH_STEPS.map((section, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-foreground mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="font-bold text-foreground mb-2">Questions about your launch?</h3>
          <p className="text-sm text-muted-foreground">
            Reach us at <span className="text-primary font-medium">support@103software.com</span> or reply to any of our project emails.
            We're available Monday–Friday, 9am–6pm EST.
          </p>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
