import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft, Package, Layers, Users, ChevronRight, Eye, UserPlus,
  CheckCircle2, Circle, FileText, MessageSquare, Star, Clipboard
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

const PHASE_LABELS: Record<number, string> = {
  1: "Discovery", 2: "Onboarding", 3: "Production", 4: "Launch", 5: "Post-Launch"
};

interface ChecklistItem {
  id: number;
  label: string;
  phase: number;
  isCompleted: boolean;
}

interface FeedbackRound {
  id: number;
  roundNumber: number;
  designArea: string | null;
  feedbackText: string;
  status: string;
  adminNotes: string | null;
}

interface Testimonial {
  id: number;
  rating: number;
  testimonialText: string;
  isPublic: boolean;
}

interface DiscoveryFormResponse {
  id: number;
  projectId: number;
  responses: Record<string, string>;
  submittedAt: string | null;
}

interface AdminClientData {
  discoveryResponse: DiscoveryFormResponse | null;
  checklist: ChecklistItem[];
  feedbackRounds: FeedbackRound[];
  testimonial: Testimonial | null;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function useProjectDetail(id: number) {
  return useQuery({
    queryKey: [`/api/projects/${id}`],
    queryFn: () => apiFetch(`/api/projects/${id}`),
    enabled: !!id,
  });
}

function useClientData(projectId: number) {
  return useQuery<AdminClientData>({
    queryKey: [`/api/admin/portal/project/${projectId}/client-data`],
    queryFn: () => apiFetch(`/api/admin/portal/project/${projectId}/client-data`),
    enabled: !!projectId,
  });
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "client-view">("overview");
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ email: "", password: "" });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  function generatePassword(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  function openClientModal() {
    const pwd = generatePassword();
    setGeneratedPassword(pwd);
    setClientForm({ email: "", password: pwd });
    setCopiedCredentials(false);
    setShowClientModal(true);
  }

  async function copyCredentials() {
    await navigator.clipboard.writeText(`Email: ${clientForm.email}\nPassword: ${clientForm.password}`);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2000);
  }

  const { data: project, isLoading } = useProjectDetail(projectId);
  const { data: clientData } = useClientData(projectId);

  const { data: phaseData } = useQuery({
    queryKey: [`/api/admin/portal/projects/${projectId}/phases`],
    queryFn: () => apiFetch(`/api/admin/portal/projects/${projectId}/phases`),
    enabled: !!projectId,
  });

  const advancePhaseMutation = useMutation({
    mutationFn: (newPhase: number) =>
      apiFetch(`/api/admin/portal/project/${projectId}/phase`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects`] });
      toast({ title: "Phase advanced successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error advancing phase", description: err.message, variant: "destructive" });
    },
  });

  const togglePhaseMutation = useMutation({
    mutationFn: ({ phaseId, active }: { phaseId: number; active: boolean }) =>
      apiFetch(`/api/admin/portal/projects/${projectId}/phases/${phaseId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }),
    onSuccess: (_data, { active }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/portal/projects/${projectId}/phases`] });
      toast({ title: active ? "Phase activated" : "Phase deactivated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error toggling phase", description: err.message, variant: "destructive" });
    },
  });

  const createClientAccountMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/portal/client-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clientForm.email,
          password: clientForm.password,
          clientId: project?.clientId,
          projectId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setShowClientModal(false);
      setClientForm({ email: "", password: "" });
      toast({ title: "Client portal account created", description: `${clientForm.email} can now log in to the portal.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error creating account", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !project) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const currentPhase: number = project.currentPhase ?? 1;
  const maxPhase: number = project.packageName === "Launchpad" ? 4 : 5;
  const hasClientAccount = !!project.clientAccount;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3 text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </button>
            <h1 className="text-4xl font-display font-bold">{project.name}</h1>
            <p className="mt-1 text-muted-foreground">{project.clientName}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {!hasClientAccount && (
              <Button onClick={openClientModal} className="shrink-0">
                <UserPlus className="mr-2 h-4 w-4" /> Create Client Login
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant={project.status === "active" ? "success" : "secondary"} className="text-sm">
              {project.status.toUpperCase()}
            </Badge>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Package</p>
            <p className="font-bold text-foreground">{project.packageName ?? "No package"}</p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Layers className="h-3 w-3" /> Current Phase</p>
            <p className="font-bold text-foreground">Phase {currentPhase}: {PHASE_LABELS[currentPhase]}</p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="font-bold text-foreground">{project.budget ? formatCurrency(project.budget) : "TBD"}</p>
          </div>
        </div>

        {/* Phase management */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">Phase Journey</h2>
            <span className="text-xs text-muted-foreground">Current: Phase {currentPhase} — {PHASE_LABELS[currentPhase]}</span>
          </div>
          <div className="space-y-3 mb-6">
            {[1, 2, 3, 4, 5].slice(0, maxPhase).map(phaseNum => {
              const isComplete = phaseNum < currentPhase;
              const isActive = phaseNum === currentPhase;
              const dbPhase = phaseData?.phases?.find((p: { order: number; id: number; name: string; status: string; isActive: boolean }) => p.order === phaseNum);
              const phaseEnabled = dbPhase?.isActive ?? (phaseNum <= currentPhase);
              return (
                <div
                  key={phaseNum}
                  className={`flex items-center gap-4 rounded-xl p-4 border transition-all ${
                    isActive ? "border-primary/50 bg-primary/10" :
                    isComplete ? "border-emerald-500/30 bg-emerald-500/5" :
                    "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">Phase {phaseNum}: {PHASE_LABELS[phaseNum]}</span>
                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        isActive ? "bg-primary/20 text-primary" :
                        isComplete ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-white/5 text-muted-foreground"
                      }`}>
                        {isComplete ? "DONE" : isActive ? "ACTIVE" : "UPCOMING"}
                      </span>
                    </div>
                  </div>
                  {dbPhase && (
                    <button
                      onClick={() => togglePhaseMutation.mutate({ phaseId: dbPhase.id, active: !phaseEnabled })}
                      disabled={togglePhaseMutation.isPending}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        phaseEnabled ? "bg-primary" : "bg-white/10"
                      }`}
                      title={phaseEnabled ? "Deactivate phase" : "Activate phase"}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        phaseEnabled ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {currentPhase < maxPhase && (
            <div className="flex items-center gap-4 pt-3 border-t border-white/5">
              <p className="text-sm text-muted-foreground flex-1">
                Ready to advance? Moving to Phase {currentPhase + 1} ({PHASE_LABELS[currentPhase + 1]}) will update the client portal.
              </p>
              <Button
                onClick={() => advancePhaseMutation.mutate(currentPhase + 1)}
                disabled={advancePhaseMutation.isPending}
                className="shrink-0"
              >
                {advancePhaseMutation.isPending ? "Advancing..." : `Advance to Phase ${currentPhase + 1}`}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          {currentPhase === maxPhase && (
            <p className="text-sm text-emerald-400 font-medium pt-3 border-t border-white/5">All phases complete for this package.</p>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "overview" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("client-view")}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === "client-view" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Eye className="h-4 w-4" /> Client Submissions
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client portal access */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">Client Portal Access</h3>
              </div>
              {hasClientAccount ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Login email</span>
                    <span className="text-sm font-mono text-foreground">{project.clientAccount.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account status</span>
                    <Badge variant={project.clientAccount.isActive ? "success" : "secondary"}>
                      {project.clientAccount.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <UserPlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No client portal account yet.</p>
                  <Button size="sm" onClick={() => setShowClientModal(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Create Portal Login
                  </Button>
                </div>
              )}
            </div>

            {/* Tasks summary */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-foreground mb-4">Task Progress</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {project.completedTaskCount} of {project.taskCount} tasks complete
                  </p>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "client-view" && (
          <div className="space-y-6">
            {!clientData ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Discovery Form Responses */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-foreground text-lg">Phase 1 — Discovery Form</h3>
                  </div>
                  {clientData.discoveryResponse ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(clientData.discoveryResponse.responses).map(([key, value]) => (
                        <div key={key} className="rounded-xl bg-white/3 p-4">
                          <p className="text-xs font-bold tracking-wider text-primary/70 mb-2">
                            {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>Client has not submitted the discovery form yet.</p>
                    </div>
                  )}
                </div>

                {/* Checklist */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <Clipboard className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-foreground text-lg">Phase 2 & 4 — Checklists</h3>
                  </div>
                  {clientData.checklist?.length > 0 ? (
                    <div className="space-y-2">
                      {[2, 4].map(phase => {
                        const items = clientData.checklist.filter(i => i.phase === phase);
                        const done = items.filter(i => i.isCompleted).length;
                        return items.length > 0 ? (
                          <div key={phase} className="mb-4">
                            <p className="text-xs font-bold tracking-wider text-muted-foreground mb-3">
                              PHASE {phase} — {done}/{items.length} COMPLETE
                            </p>
                            <div className="space-y-1.5">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/2">
                                  {item.isCompleted
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    : <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                                  }
                                  <span className={`text-sm ${item.isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                                    {item.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">No checklist items found.</p>
                  )}
                </div>

                {/* Feedback Rounds */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-foreground text-lg">Phase 3 — Design Feedback</h3>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {clientData.feedbackRounds?.length ?? 0}/2 rounds used
                    </span>
                  </div>
                  {clientData.feedbackRounds?.length > 0 ? (
                    <div className="space-y-4">
                      {clientData.feedbackRounds.map((round) => (
                        <div key={round.id} className="rounded-xl bg-white/3 p-5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-foreground">Round {round.roundNumber} — {round.designArea}</span>
                            <Badge variant={round.status === "reviewed" ? "success" : "warning"}>
                              {round.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{round.feedbackText}</p>
                          {round.adminNotes && (
                            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                              <p className="text-xs font-bold tracking-wider text-primary mb-2">YOUR RESPONSE</p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{round.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No design feedback submitted yet.</p>
                    </div>
                  )}
                </div>

                {/* Testimonial */}
                {clientData.testimonial && (
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <Star className="h-5 w-5 text-yellow-400" />
                      <h3 className="font-bold text-foreground text-lg">Phase 5 — Testimonial</h3>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-5 w-5 ${s <= clientData.testimonial!.rating ? "text-yellow-400 fill-yellow-400" : "text-white/10"}`} />
                      ))}
                    </div>
                    <p className="text-foreground italic">&ldquo;{clientData.testimonial.testimonialText}&rdquo;</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Client Account Modal */}
      <Dialog isOpen={showClientModal} onClose={() => setShowClientModal(false)} title="Create Client Portal Login">
        <form
          onSubmit={e => { e.preventDefault(); createClientAccountMutation.mutate(); }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            Create a portal login for <strong className="text-foreground">{project.clientName}</strong>. A secure password has been auto-generated — copy the credentials to share with the client.
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Email Address</label>
            <Input
              required
              type="email"
              value={clientForm.email}
              onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
              placeholder="client@theirbusiness.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Generated Password</label>
            <div className="flex gap-2">
              <Input
                readOnly
                type="text"
                value={generatedPassword}
                className="font-mono text-sm bg-white/5"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { const pwd = generatePassword(); setGeneratedPassword(pwd); setClientForm(f => ({ ...f, password: pwd })); }}
              >
                Regenerate
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Password is auto-generated. Click "Copy Credentials" to copy both email and password to share securely.</p>
          </div>
          {clientForm.email && (
            <button
              type="button"
              onClick={copyCredentials}
              className="w-full rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium py-2.5 hover:bg-primary/10 transition-colors"
            >
              {copiedCredentials ? "Copied!" : "Copy Credentials to Clipboard"}
            </button>
          )}
          <div className="pt-2 flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => setShowClientModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createClientAccountMutation.isPending}>
              {createClientAccountMutation.isPending ? "Creating..." : "Create Login"}
            </Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
