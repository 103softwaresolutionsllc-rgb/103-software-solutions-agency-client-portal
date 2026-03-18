import { useState } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Star, Heart, Send, CheckCircle2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-125"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              n <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PortalPostLaunch() {
  const { data, isLoading, refresh } = usePortalData();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [testimonialText, setTestimonialText] = useState("");
  const [referralName, setReferralName] = useState("");
  const [referralEmail, setReferralEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPhase = data?.project.currentPhase ?? 1;
  const maxPhase = data?.maxVisiblePhase ?? data?.package?.phases ?? 5;
  const existing = data?.testimonial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/testimonial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          testimonialText,
          referralName: referralName || null,
          referralEmail: referralEmail || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      toast({ title: "Thank you!", description: "Your testimonial has been submitted. We appreciate your support!" });
      refresh();
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 border border-orange-400/20">
              <Star className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-orange-400">PHASE 5</p>
              <h1 className="text-3xl font-display font-bold">Post-Launch</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Congratulations on your launch! We'd love to hear how it went, and we'd be grateful for a testimonial and any referrals you might have.
          </p>
        </div>

        {/* Already submitted */}
        {existing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 border border-emerald-400/20 bg-emerald-400/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-foreground">Testimonial submitted — thank you!</p>
                <p className="text-sm text-muted-foreground">Submitted {new Date(existing.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`h-5 w-5 ${n <= existing.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic">"{existing.testimonialText}"</p>
            {existing.referralName && (
              <p className="mt-3 text-sm text-primary">Referral: {existing.referralName} — {existing.referralEmail}</p>
            )}
          </motion.div>
        )}

        {/* Testimonial form */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-bold text-foreground">{existing ? "Update Your Testimonial" : "Share Your Experience"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-3">How would you rate your experience?</label>
              <StarRating value={existing?.rating ?? rating} onChange={setRating} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Your Testimonial</label>
              <textarea
                value={existing ? existing.testimonialText : testimonialText}
                onChange={e => setTestimonialText(e.target.value)}
                placeholder="Tell us about your experience working with 103 Software Solutions. What was the process like? What results have you seen? Would you recommend us?"
                rows={5}
                required={!existing}
                readOnly={!!existing}
                className="w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none disabled:opacity-60"
              />
            </div>
            {!existing && (
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting || !testimonialText.trim()} className="h-11 px-6 rounded-xl group">
                  {submitting ? "Submitting..." : "Submit Testimonial"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Referral */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-foreground">Know Someone Who Needs a Website?</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Refer a friend or colleague and receive a <span className="text-primary font-semibold">$250 credit</span> toward future work once they sign on.
          </p>

          {existing?.referralName ? (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">Referral submitted:</span> {existing.referralName} ({existing.referralEmail})
              </p>
              <p className="text-xs text-muted-foreground mt-1">We'll be in touch with them soon. Thank you!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Their Name</label>
                  <Input
                    value={referralName}
                    onChange={e => setReferralName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Their Email</label>
                  <Input
                    type="email"
                    value={referralEmail}
                    onChange={e => setReferralEmail(e.target.value)}
                    placeholder="jane@company.com"
                  />
                </div>
              </div>
              {(referralName || referralEmail) && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!referralName && !referralEmail) return;
                      setSubmitting(true);
                      try {
                        const res = await fetch('/api/portal/testimonial', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            rating: existing?.rating ?? 5,
                            testimonialText: existing?.testimonialText ?? "Great experience!",
                            referralName: referralName || null,
                            referralEmail: referralEmail || null,
                          }),
                        });
                        if (!res.ok) throw new Error("Failed");
                        toast({ title: "Referral submitted! Thank you!" });
                        refresh();
                      } catch {
                        toast({ title: "Failed to submit referral", variant: "destructive" });
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    variant="outline"
                    className="h-11 px-6 rounded-xl"
                  >
                    {submitting ? "Submitting..." : "Submit Referral"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thank you */}
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-6 text-center">
          <p className="text-2xl font-display font-bold text-foreground mb-2">Thank you for choosing 103!</p>
          <p className="text-sm text-muted-foreground">
            It's been an honor working with you. We're here whenever you need updates, new features, or your next project.
          </p>
          <p className="mt-3 text-sm font-medium text-orange-400">support@103software.com</p>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
