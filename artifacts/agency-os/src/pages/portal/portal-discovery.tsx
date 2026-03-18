import { useState } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QUESTIONS = [
  {
    id: "business_name",
    label: "What is your business name?",
    placeholder: "e.g. Apex Innovations Inc.",
    type: "text",
  },
  {
    id: "business_description",
    label: "Describe your business in 2-3 sentences.",
    placeholder: "What do you do, who do you serve, and what makes you different?",
    type: "textarea",
  },
  {
    id: "target_audience",
    label: "Who is your target audience / ideal customer?",
    placeholder: "e.g. Small business owners aged 30-50 in the healthcare industry...",
    type: "textarea",
  },
  {
    id: "primary_goal",
    label: "What is the primary goal of this project?",
    placeholder: "e.g. Generate leads, sell products online, build brand awareness...",
    type: "text",
  },
  {
    id: "top_competitors",
    label: "List 2-3 top competitors (or similar businesses you admire).",
    placeholder: "e.g. CompanyA.com, CompanyB.io...",
    type: "text",
  },
  {
    id: "design_vibe",
    label: "How would you describe your desired brand vibe / feel?",
    placeholder: "e.g. Professional & clean, bold & energetic, warm & approachable...",
    type: "text",
  },
  {
    id: "must_haves",
    label: "Are there any must-have features or pages?",
    placeholder: "e.g. Online booking, e-commerce store, portfolio gallery, blog...",
    type: "textarea",
  },
  {
    id: "magic_wand",
    label: "If you could wave a magic wand, what would the perfect outcome look like?",
    placeholder: "Dream big — describe your ideal end result, the feeling, the impact...",
    type: "textarea",
  },
  {
    id: "timeline",
    label: "Is there a hard deadline or key date we should know about?",
    placeholder: "e.g. We're launching at a trade show on March 15...",
    type: "text",
  },
  {
    id: "additional_notes",
    label: "Anything else you'd like us to know?",
    placeholder: "Any additional context, concerns, or requests...",
    type: "textarea",
  },
];

export default function PortalDiscovery() {
  const { data, isLoading, refresh } = usePortalData();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const existingResponses = data?.discoveryResponse?.responses as Record<string, string> | undefined;
  const isAlreadySubmitted = !!data?.discoveryResponse?.submittedAt;

  const getValue = (id: string) => {
    if (form[id] !== undefined) return form[id];
    return existingResponses?.[id] ?? "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const responses: Record<string, string> = {};
      QUESTIONS.forEach(q => {
        responses[q.id] = getValue(q.id);
      });

      const res = await fetch('/api/portal/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      toast({ title: "Discovery form submitted!", description: "Our team will review your responses and be in touch." });
      refresh();
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const currentPhase = data?.project.currentPhase ?? 1;
  const maxPhase = data?.maxVisiblePhase ?? data?.package?.phases ?? 5;

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 border border-blue-400/20">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-blue-400">PHASE 1</p>
              <h1 className="text-3xl font-display font-bold">Discovery Form</h1>
            </div>
          </div>
          <p className="text-muted-foreground ml-13">
            Help us understand your business, goals, and vision so we can build exactly what you need.
            This typically takes 10-15 minutes.
          </p>
        </div>

        {(isAlreadySubmitted || submitted) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 border border-emerald-400/20 bg-emerald-400/5"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-foreground">Discovery form submitted!</p>
                <p className="text-sm text-muted-foreground">
                  Submitted {data?.discoveryResponse?.submittedAt ? new Date(data.discoveryResponse.submittedAt).toLocaleDateString() : 'recently'}.
                  You can still update your responses below.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {QUESTIONS.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-6"
              >
                <label className="block text-sm font-semibold text-foreground mb-3">
                  {i + 1}. {q.label}
                </label>
                {q.type === "textarea" ? (
                  <textarea
                    value={getValue(q.id)}
                    onChange={e => setForm(f => ({ ...f, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none"
                  />
                ) : (
                  <Input
                    value={getValue(q.id)}
                    onChange={e => setForm(f => ({ ...f, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                  />
                )}
              </motion.div>
            ))}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="h-12 px-8 rounded-xl text-sm group">
                {submitting ? "Submitting..." : isAlreadySubmitted ? "Update Responses" : "Submit Discovery Form"}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </PortalLayout>
  );
}
