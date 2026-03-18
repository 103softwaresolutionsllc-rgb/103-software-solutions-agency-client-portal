import { useState } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Palette, Send, CheckCircle2, MessageSquare, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FeedbackRound } from "./use-portal-data";

const DESIGN_AREAS = [
  "Overall Design",
  "Header / Navigation",
  "Homepage / Hero",
  "About Section",
  "Services / Products",
  "Contact / Forms",
  "Colors & Typography",
  "Mobile Experience",
  "Content / Copy",
  "Other",
];

const FEEDBACK_GUIDE = [
  {
    title: "Be specific",
    desc: "Instead of 'I don't like the colors', try 'Can we make the hero background darker, closer to #1a1a2e?'"
  },
  {
    title: "Reference elements",
    desc: "Tell us what section you're referring to (e.g., 'the top navigation', 'the pricing cards', 'the footer')."
  },
  {
    title: "Use the Round system",
    desc: "Each submission is a Feedback Round. You get up to 2 rounds of revisions included in your package."
  },
  {
    title: "Consolidate feedback",
    desc: "Try to group all feedback for a round into one submission rather than multiple back-and-forth messages."
  },
];

export default function PortalProduction() {
  const { data, isLoading, refresh } = usePortalData();
  const { toast } = useToast();
  const [feedbackText, setFeedbackText] = useState("");
  const [designArea, setDesignArea] = useState(DESIGN_AREAS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const currentPhase = data?.project.currentPhase ?? 1;
  const maxPhase = data?.maxVisiblePhase ?? data?.package?.phases ?? 5;
  const feedbackRounds = data?.feedbackRounds ?? [];

  const MAX_ROUNDS = 2;
  const roundsUsed = feedbackRounds.length;
  const atLimit = roundsUsed >= MAX_ROUNDS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || atLimit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackText, designArea }),
      });
      if (res.status === 429) {
        toast({ title: "Feedback limit reached", description: "You've used all 2 included revision rounds. Contact us to purchase additional rounds.", variant: "destructive" });
        return;
      }
      if (!res.ok) throw new Error("Failed to submit");
      setFeedbackText("");
      toast({ title: "Feedback submitted!", description: "Our team will review and respond within 1-2 business days." });
      refresh();
    } catch {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewed': return 'text-emerald-400 bg-emerald-400/10';
      case 'in-progress': return 'text-primary bg-primary/10';
      default: return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 border border-purple-400/20">
              <Palette className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-purple-400">PHASE 3</p>
              <h1 className="text-3xl font-display font-bold">Design Feedback</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Review your designs and submit feedback. Our team will implement revisions and respond within 1-2 business days.
          </p>
        </div>

        {/* Feedback guide toggle */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              <span className="font-semibold text-foreground">How to Give Effective Feedback</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`} />
          </button>
          {showGuide && (
            <div className="border-t border-white/5 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEEDBACK_GUIDE.map(tip => (
                <div key={tip.title} className="rounded-xl bg-white/3 p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">{tip.title}</p>
                  <p className="text-xs text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit feedback */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              {atLimit ? "Revision Rounds Used" : `Submit Feedback (Round ${roundsUsed + 1} of ${MAX_ROUNDS})`}
            </h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${atLimit ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
              {roundsUsed}/{MAX_ROUNDS} rounds used
            </span>
          </div>
          {atLimit ? (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-5 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">All included revision rounds used</p>
              <p className="text-xs text-muted-foreground">Your package includes {MAX_ROUNDS} feedback rounds. To purchase additional revision rounds, contact us directly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Design Area</label>
                <select
                  value={designArea}
                  onChange={e => setDesignArea(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
                >
                  {DESIGN_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Your Feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Describe your feedback clearly and specifically. Reference specific sections, colors, or elements..."
                  rows={5}
                  required
                  className="w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting || !feedbackText.trim()} className="h-11 px-6 rounded-xl group">
                  {submitting ? "Submitting..." : "Submit Feedback"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Previous rounds */}
        {feedbackRounds.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Previous Feedback Rounds</h2>
            <div className="space-y-4">
              {feedbackRounds.slice().reverse().map((round: FeedbackRound, i) => (
                <motion.div
                  key={round.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">Round {round.roundNumber}</span>
                      {round.designArea && (
                        <span className="text-xs text-muted-foreground border border-white/10 rounded-full px-2 py-0.5">{round.designArea}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getStatusColor(round.status)}`}>
                        {round.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(round.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{round.feedbackText}</p>
                  {round.adminNotes && (
                    <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
                      <p className="text-xs font-bold tracking-wider text-primary mb-2">TEAM RESPONSE</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{round.adminNotes}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {feedbackRounds.length === 0 && !isLoading && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Palette className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No feedback submitted yet. Once you've reviewed the designs, submit your feedback above.</p>
          </div>
        )}
      </motion.div>
    </PortalLayout>
  );
}
