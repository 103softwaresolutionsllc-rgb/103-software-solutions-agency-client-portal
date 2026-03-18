import { useState } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { motion } from "framer-motion";
import { Upload, CheckCircle2, Circle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ChecklistItem } from "./use-portal-data";

export default function PortalOnboarding() {
  const { data, isLoading, refresh } = usePortalData();
  const { toast } = useToast();
  const [toggling, setToggling] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const currentPhase = data?.project.currentPhase ?? 1;
  const maxPhase = data?.package?.phases ?? 5;
  const phase2Items = data?.checklist.filter(c => c.phase === 2) ?? [];
  const completedCount = phase2Items.filter(c => c.isCompleted).length;
  const progressPct = phase2Items.length > 0 ? (completedCount / phase2Items.length) * 100 : 0;
  const allDone = completedCount === phase2Items.length && phase2Items.length > 0;

  const handleToggle = async (item: ChecklistItem) => {
    setToggling(item.id);
    try {
      const res = await fetch(`/api/portal/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !item.isCompleted }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await refresh();
      toast({
        title: item.isCompleted ? "Item unchecked" : "Item checked!",
        description: item.label,
      });
    } catch {
      toast({ title: "Failed to update item", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 border border-yellow-400/20">
              <Upload className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-yellow-400">PHASE 2</p>
              <h1 className="text-3xl font-display font-bold">Onboarding Checklist</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Check off each item as you send or upload it to us. We need all of these to begin production.
          </p>
        </div>

        {/* Progress */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{completedCount} of {phase2Items.length} items collected</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/5">
            <motion.div
              className={`h-2.5 rounded-full transition-all ${allDone ? 'bg-emerald-400' : 'bg-yellow-400'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {allDone && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-sm text-emerald-400 font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              All items collected! We're ready to move into production.
            </motion.p>
          )}
        </div>

        {/* How to share banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">How to share your assets</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send files to <span className="text-primary font-medium">assets@103software.com</span> with your project name in the subject line,
              or share via Google Drive / Dropbox link. Check each item off as you send it.
            </p>
          </div>
        </div>

        {/* Checklist */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3">
            {phase2Items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card rounded-2xl overflow-hidden transition-all ${item.isCompleted ? 'border border-emerald-400/20' : ''}`}
              >
                <div className="flex items-center gap-4 p-5">
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={toggling === item.id}
                    className="shrink-0 transition-transform hover:scale-110"
                  >
                    {toggling === item.id ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : item.isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/40 hover:text-primary" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.label}
                    </p>
                    {item.isCompleted && item.completedAt && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        Sent {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {item.description && (
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {expanded === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {expanded === item.id && item.description && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-white/5 px-5 pb-5 pt-3"
                  >
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </PortalLayout>
  );
}
