import { Router } from "express";
import { db } from "@workspace/db";
import {
  clientAccounts, projects, clients, packages, checklistItems,
  discoveryFormResponses, feedbackRounds, testimonials, phases
} from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { hashPassword } from "../lib/auth.js";
import { requireStaffAuth } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

router.use(requireStaffAuth);

// GET /api/admin/portal/packages — list packages for this org
router.get("/packages", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select().from(packages).where(eq(packages.organizationId, user.organizationId));
    res.json(rows.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: parseFloat(p.price),
      description: p.description,
      phases: p.phases,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/portal/client-accounts — list all client accounts
router.get("/client-accounts", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db
      .select({
        account: clientAccounts,
        clientName: clients.name,
        projectName: projects.name,
      })
      .from(clientAccounts)
      .innerJoin(clients, eq(clients.id, clientAccounts.clientId))
      .innerJoin(projects, eq(projects.id, clientAccounts.projectId))
      .where(eq(clientAccounts.organizationId, user.organizationId));

    res.json(rows.map(r => ({
      id: r.account.id,
      email: r.account.email,
      clientId: r.account.clientId,
      clientName: r.clientName,
      projectId: r.account.projectId,
      projectName: r.projectName,
      isActive: r.account.isActive,
      createdAt: r.account.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/portal/client-accounts — create a client portal account
router.post("/client-accounts", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { email, password, clientId, projectId } = req.body;
    if (!email || !password || !clientId || !projectId) {
      res.status(400).json({ error: "email, password, clientId, and projectId are required" });
      return;
    }

    // Verify project belongs to this org
    const project = await db.select().from(projects).where(and(eq(projects.id, parseInt(projectId)), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Verify client belongs to this org AND to this project
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const client = await db.select().from(clients).where(and(eq(clients.id, parseInt(clientId)), eq(clients.organizationId, user.organizationId))).limit(1);
    if (!client[0]) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    if (project[0].clientId !== parseInt(clientId)) {
      res.status(400).json({ error: "Client does not belong to the specified project" });
      return;
    }

    const [account] = await db.insert(clientAccounts).values({
      email,
      passwordHash: hashPassword(password),
      clientId: parseInt(clientId),
      projectId: parseInt(projectId),
      organizationId: user.organizationId,
      isActive: true,
    }).returning();

    // Auto-seed onboarding checklist items for this project if not already seeded
    if (!db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const existing = await db.select().from(checklistItems).where(eq(checklistItems.projectId, account.projectId)).limit(1);
    if (!existing[0]) {
      await seedChecklistItems(account.projectId);
    }

    await logActivity({ action: "create", entityType: "client_account", entityId: account.id, description: `Created client portal login: ${email}`, userId: user.id, organizationId: user.organizationId });

    res.status(201).json({
      id: account.id,
      email: account.email,
      clientId: account.clientId,
      projectId: account.projectId,
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "23505") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/portal/client-accounts/:id — update client account (reset password, toggle active)
router.patch("/client-accounts/:id", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);
    const { password, isActive } = req.body;

    const existing = await db.select().from(clientAccounts).where(and(eq(clientAccounts.id, id), eq(clientAccounts.organizationId, user.organizationId))).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const updates: Partial<{ passwordHash: string; isActive: boolean; updatedAt: Date }> = { updatedAt: new Date() };
    if (password) updates.passwordHash = hashPassword(password);
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const [updated] = await db.update(clientAccounts).set(updates).where(eq(clientAccounts.id, id)).returning();
    res.json({ id: updated.id, email: updated.email, isActive: updated.isActive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/portal/projects/:id/phase — advance or set project phase
router.patch("/projects/:id/phase", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);
    const { phase } = req.body;
    if (typeof phase !== "number" || phase < 1 || phase > 5) {
      res.status(400).json({ error: "phase must be a number between 1 and 5" });
      return;
    }

    const existing = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [updated] = await db.update(projects).set({ currentPhase: phase, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    await logActivity({ action: "update", entityType: "project", entityId: id, description: `Advanced project to Phase ${phase}`, userId: user.id, organizationId: user.organizationId });
    res.json({ id: updated.id, currentPhase: updated.currentPhase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/portal/projects/:id/package — assign package to project
router.patch("/projects/:id/package", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);
    const { packageId } = req.body;

    const existing = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [updated] = await db.update(projects).set({ packageId: packageId ? parseInt(packageId) : null, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    res.json({ id: updated.id, packageId: updated.packageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/portal/projects/:id/portal-data — view full client portal data for a project
router.get("/projects/:id/portal-data", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);

    const project = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [checklist, discovery, feedback, testi] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.projectId, id)),
      db.select().from(discoveryFormResponses).where(eq(discoveryFormResponses.projectId, id)).limit(1),
      db.select().from(feedbackRounds).where(eq(feedbackRounds.projectId, id)),
      db.select().from(testimonials).where(eq(testimonials.projectId, id)).limit(1),
    ]);

    res.json({
      checklist,
      discoveryResponse: discovery[0] ?? null,
      feedbackRounds: feedback,
      testimonial: testi[0] ?? null,
      currentPhase: project[0].currentPhase,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/portal/projects/:id/client-data — required path (plural projects)
router.get("/projects/:id/client-data", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);

    const project = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [checklist, discovery, feedback, testi] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.projectId, id)),
      db.select().from(discoveryFormResponses).where(eq(discoveryFormResponses.projectId, id)).limit(1),
      db.select().from(feedbackRounds).where(eq(feedbackRounds.projectId, id)),
      db.select().from(testimonials).where(eq(testimonials.projectId, id)).limit(1),
    ]);

    res.json({
      checklist,
      discoveryResponse: discovery[0] ?? null,
      feedbackRounds: feedback,
      testimonial: testi[0] ?? null,
      currentPhase: project[0].currentPhase,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/portal/projects/:id/phase — required path (plural projects)
router.put("/projects/:id/phase", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const { phase } = req.body;
    if (typeof phase !== "number" || phase < 1 || phase > 5) {
      res.status(400).json({ error: "phase must be a number between 1 and 5" });
      return;
    }

    const existing = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [updated] = await db.update(projects).set({ currentPhase: phase, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    await logActivity({ action: "update", entityType: "project", entityId: id, description: `Advanced project to Phase ${phase}`, userId: user.id, organizationId: user.organizationId });
    res.json({ id: updated.id, currentPhase: updated.currentPhase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/portal/projects/:id/client-account — create client portal account for a project
router.post("/projects/:id/client-account", async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.id);
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const project = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [account] = await db.insert(clientAccounts).values({
      email,
      passwordHash: hashPassword(password),
      clientId: project[0].clientId,
      projectId,
      organizationId: user.organizationId,
      isActive: true,
    }).returning();

    const existing = await db.select().from(checklistItems).where(eq(checklistItems.projectId, projectId)).limit(1);
    if (!existing[0]) {
      await seedChecklistItems(projectId);
    }

    await logActivity({ action: "create", entityType: "client_account", entityId: account.id, description: `Created client portal login: ${email}`, userId: user.id, organizationId: user.organizationId });

    res.status(201).json({
      id: account.id,
      email: account.email,
      clientId: account.clientId,
      projectId: account.projectId,
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "23505") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/portal/project/:id/client-data — alias for /projects/:id/portal-data (used by project detail page)
router.get("/project/:id/client-data", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);

    const project = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [checklist, discovery, feedback, testi] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.projectId, id)),
      db.select().from(discoveryFormResponses).where(eq(discoveryFormResponses.projectId, id)).limit(1),
      db.select().from(feedbackRounds).where(eq(feedbackRounds.projectId, id)),
      db.select().from(testimonials).where(eq(testimonials.projectId, id)).limit(1),
    ]);

    res.json({
      checklist,
      discoveryResponse: discovery[0] ?? null,
      feedbackRounds: feedback,
      testimonial: testi[0] ?? null,
      currentPhase: project[0].currentPhase,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/portal/project/:id/phase — alias for PATCH /projects/:id/phase (used by project detail page)
router.put("/project/:id/phase", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const { phase } = req.body;
    if (typeof phase !== "number" || phase < 1 || phase > 5) {
      res.status(400).json({ error: "phase must be a number between 1 and 5" });
      return;
    }

    const existing = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [updated] = await db.update(projects).set({ currentPhase: phase, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    await logActivity({ action: "update", entityType: "project", entityId: id, description: `Advanced project to Phase ${phase}`, userId: user.id, organizationId: user.organizationId });
    res.json({ id: updated.id, currentPhase: updated.currentPhase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/portal/projects/:id/phases — list all phases for a project with activation status
router.get("/projects/:id/phases", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);

    const project = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const phaseRows = await db
      .select()
      .from(phases)
      .where(eq(phases.projectId, id))
      .orderBy(asc(phases.order));

    res.json({
      projectId: id,
      currentPhase: project[0].currentPhase,
      phases: phaseRows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        order: p.order,
        status: p.status,
        isActive: p.status === "active" || p.status === "completed" || p.status === "in-progress",
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/portal/projects/:id/phases/:phaseId/toggle — enable or disable a specific phase
router.patch("/projects/:id/phases/:phaseId/toggle", async (req, res) => {
  try {
    const user = req.user;
    const projectId = parseInt(req.params.id);
    const phaseId = parseInt(req.params.phaseId);
    const { active } = req.body;
    if (typeof active !== "boolean") {
      res.status(400).json({ error: "active (boolean) is required" });
      return;
    }

    const project = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.organizationId, user.organizationId))).limit(1);
    if (!project[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const phase = await db.select().from(phases).where(and(eq(phases.id, phaseId), eq(phases.projectId, projectId))).limit(1);
    if (!phase[0]) {
      res.status(404).json({ error: "Phase not found" });
      return;
    }

    const newStatus = active ? "active" : "pending";
    const [updated] = await db.update(phases)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(phases.id, phaseId))
      .returning();

    await logActivity({
      action: "update",
      entityType: "project",
      entityId: projectId,
      description: `${active ? "Activated" : "Deactivated"} phase "${updated.name}"`,
      userId: user.id,
      organizationId: user.organizationId,
    });

    res.json({ id: updated.id, name: updated.name, status: updated.status, isActive: active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/portal/feedback/:id — admin responds to feedback (with org ownership check)
router.patch("/feedback/:id", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const { adminNotes, status } = req.body;

    // Verify the feedback belongs to a project in this org
    const feedbackRow = await db
      .select({ feedback: feedbackRounds, orgId: projects.organizationId })
      .from(feedbackRounds)
      .innerJoin(projects, eq(projects.id, feedbackRounds.projectId))
      .where(eq(feedbackRounds.id, id))
      .limit(1);

    if (!feedbackRow[0] || feedbackRow[0].orgId !== user.organizationId) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    const [updated] = await db.update(feedbackRounds)
      .set({ adminNotes: adminNotes ?? null, status: status ?? "reviewed", updatedAt: new Date() })
      .where(eq(feedbackRounds.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }
    res.json({ id: updated.id, adminNotes: updated.adminNotes, status: updated.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function seedChecklistItems(projectId: number) {
  const items = [
    // Phase 2 — Onboarding/Content Collection
    { phase: 2, label: "Business logo files (SVG, PNG, AI)", description: "All logo variations: primary, white, dark, icon only", sortOrder: 1 },
    { phase: 2, label: "Brand color palette", description: "Hex codes for all brand colors (primary, secondary, accents)", sortOrder: 2 },
    { phase: 2, label: "Brand fonts", description: "Font files or Google Font names used in your brand", sortOrder: 3 },
    { phase: 2, label: "Website copy / written content", description: "All page text: headings, body copy, CTAs, bio, services descriptions", sortOrder: 4 },
    { phase: 2, label: "Professional photos", description: "Headshots, team photos, product/service imagery (high resolution)", sortOrder: 5 },
    { phase: 2, label: "Testimonials & social proof", description: "Client reviews, case studies, or star ratings to feature", sortOrder: 6 },
    { phase: 2, label: "Social media profile URLs", description: "Links to all active social profiles (Instagram, LinkedIn, Facebook, etc.)", sortOrder: 7 },
    { phase: 2, label: "Domain name & hosting access", description: "Domain login credentials or transfer authorization code", sortOrder: 8 },
    { phase: 2, label: "Examples / inspiration websites", description: "3-5 websites you like the look or feel of (optional but helpful)", sortOrder: 9 },
    { phase: 2, label: "Business email address", description: "The email address(es) to set up on your domain", sortOrder: 10 },

    // Phase 4 — Launch checklist (admin-facing, client tracks)
    { phase: 4, label: "Final design approved by client", description: "Client has signed off on all pages and elements", sortOrder: 1 },
    { phase: 4, label: "All content proofread", description: "Spelling, grammar, and accuracy reviewed", sortOrder: 2 },
    { phase: 4, label: "Mobile responsiveness tested", description: "Site looks and works correctly on phone and tablet", sortOrder: 3 },
    { phase: 4, label: "Domain connected and SSL live", description: "Custom domain is pointing to the new site with HTTPS enabled", sortOrder: 4 },
    { phase: 4, label: "Google Analytics / tracking installed", description: "Analytics code verified and tracking active", sortOrder: 5 },
    { phase: 4, label: "Contact forms tested", description: "All forms submitting successfully and email notifications confirmed", sortOrder: 6 },
  ];

  await db.insert(checklistItems).values(items.map(item => ({ ...item, projectId })));
}

export default router;
