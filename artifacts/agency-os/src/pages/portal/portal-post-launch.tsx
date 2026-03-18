import { useState } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalData } from "./use-portal-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Star, Heart, Send, CheckCircle2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarRating({ value, onChange, readOnly }: { value: number; onChange: (n: number) => void; readOnly?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => !readOnly && onChange(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={readOnly ? "cursor-default" : "transition-transform hover:scale-125"}
          disabled={readOnly}
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
  const [biggestResult, setBiggestResult] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState("");
  const [referralName, setReferralName] = useState("");
  const [referralEmail, setReferralEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPhase = data?.project.currentPhase ?? 1;
  const maxPhase = data?.maxVisiblePhase ?? data?.package?.phases ?? 5;
  const activePhases = data?.activePhases ?? [];
  const existing = data?.testimonial;

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialText.trim() || !biggestResult.trim() || !wouldRecommend.trim()) return;
    setSubmitting(true);
    try {
      const combinedText = `${testimonialText.trim()}\n\nBiggest result: ${biggestResult.trim()}\n\nWould recommend: ${wouldRecommend.trim()}`;
      const res = await fetch('/api/portal/testimonial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          testimonialText: combinedText,
          referralName: referralName || null,
          referralEmail: referralEmail || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      toast({ title: "Thank you!", description: "Your testimonial has been submitted. We truly appreciate your support!" });
      refresh();
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralName && !referralEmail) return;
    if (!existing) {
      toast({ title: "Please submit your testimonial first before adding a referral.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/testimonial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: existing.rating,
          testimonialText: existing.testimonialText,
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
  };

  if (isLoading) {
    return (
      <PortalLayout currentPhase={1} maxPhase={5}>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout currentPhase={currentPhase} maxPhase={maxPhase} activePhases={activePhases}>
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
            <p className="text-sm text-muted-foreground italic whitespace-pre-line">"{existing.testimonialText}"</p>
            {existing.referralName && (
              <p className="mt-3 text-sm text-primary">Referral: {existing.referralName} — {existing.referralEmail}</p>
            )}
          </motion.div>
        )}

        {/* 3-question Testimonial form */}
        {!existing && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-bold text-foreground">Share Your Experience</h2>
            </div>

            <form onSubmit={handleTestimonialSubmit} className="space-y-6">
              {/* Q1: Star rating */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  How would you rate your overall experience? <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-3">1 = Poor, 5 = Exceptional</p>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Q2: Testimonial / experience */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  In a few sentences, describe your experience working with 103 Software Solutions. <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">What was the process like? How was communication? What stood out?</p>
                <textarea
                  value={testimonialText}
                  onChange={e => setTestimonialText(e.target.value)}
                  placeholder="Working with 103 was a seamless experience from start to finish. The team was responsive, professional, and delivered exactly what they promised..."
                  rows={4}
                  required
                  className="w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none"
                />
              </div>

              {/* Q3: Biggest result */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  What was the biggest result or win you achieved? <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">Specific numbers or outcomes make great testimonials.</p>
                <textarea
                  value={biggestResult}
                  onChange={e => setBiggestResult(e.target.value)}
                  placeholder="Since launching our new site, leads are up 40% and we've closed 3 new enterprise clients who found us through Google..."
                  rows={3}
                  required
                  className="w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none"
                />
              </div>

              {/* Q4 (bonus): Would you recommend */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Would you recommend 103 Software Solutions to others? <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">Why or why not?</p>
                <textarea
                  value={wouldRecommend}
                  onChange={e => setWouldRecommend(e.target.value)}
                  placeholder="Absolutely — I've already referred two colleagues. If you need a reliable tech partner who actually delivers, 103 is your team..."
                  rows={3}
                  required
                  className="w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting || !testimonialText.trim() || !biggestResult.trim() || !wouldRecommend.trim()}
                  className="h-11 px-6 rounded-xl group"
                >
                  {submitting ? "Submitting..." : "Submit Testimonial"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Referral section */}
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
              {!existing && (
                <p className="text-xs text-muted-foreground rounded-lg bg-white/5 px-4 py-2 border border-white/5">
                  Submit your testimonial above first, then you can add a referral here.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Their Name</label>
                  <Input
                    value={referralName}
                    onChange={e => setReferralName(e.target.value)}
                    placeholder="Jane Smith"
                    disabled={!existing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Their Email</label>
                  <Input
                    type="email"
                    value={referralEmail}
                    onChange={e => setReferralEmail(e.target.value)}
                    placeholder="jane@company.com"
                    disabled={!existing}
                  />
                </div>
              </div>
              {existing && (referralName || referralEmail) && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleReferralSubmit}
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
          <p className="mt-3 text-sm font-medium text-orange-400">info@103softwaresolutions.com</p>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
