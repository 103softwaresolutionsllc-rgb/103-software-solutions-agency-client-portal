import { Router } from "express";
import { db } from "@workspace/db";
import {
  projects, clients, packages, clientAccounts, checklistItems,
  discoveryFormResponses, feedbackRounds, testimonials, invoices, phases
} from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireClientAuth } from "../lib/auth.js";

const router = Router();

router.use(requireClientAuth);

// Helper to get the current client's project data
async function getClientProject(accountId: number, projectId: number) {
  const rows = await db
    .select({
      project: projects,
      client: clients,
      pkg: packages,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(packages, eq(packages.id, projects.packageId))
    .where(eq(projects.id, projectId))
    .limit(1);
  return rows[0] ?? null;
}

// GET /api/portal/project — get full project overview for client
router.get("/project", async (req, res) => {
  try {
    const account = req.clientAccount;
    const data = await getClientProject(account.id, account.projectId);
    if (!data) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const { project, client, pkg } = data;

    // Get checklist items
    const checklist = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.projectId, project.id))
      .orderBy(asc(checklistItems.phase), asc(checklistItems.sortOrder));

    // Get discovery form response
    const discoveryRows = await db
      .select()
      .from(discoveryFormResponses)
      .where(eq(discoveryFormResponses.projectId, project.id))
      .limit(1);

    // Get feedback rounds
    const feedback = await db
      .select()
      .from(feedbackRounds)
      .where(and(eq(feedbackRounds.projectId, project.id), eq(feedbackRounds.clientAccountId, account.id)))
      .orderBy(asc(feedbackRounds.roundNumber));

    // Get testimonial
    const testimonialRows = await db
      .select()
      .from(testimonials)
      .where(and(eq(testimonials.projectId, project.id), eq(testimonials.clientAccountId, account.id)))
      .limit(1);

    // Get invoices for this project
    const projectInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, project.id))
      .orderBy(asc(invoices.createdAt));

    // Get per-project phase rows from DB (all phases, including pending future ones)
    const projectPhases = await db
      .select()
      .from(phases)
      .where(eq(phases.projectId, project.id))
      .orderBy(asc(phases.order));

    // maxVisiblePhase = total phases the client is entitled to see per their package.
    // This is the count of phase rows in DB (or pkg.phases as fallback), NOT the current active phase.
    // The client sees the full roadmap including pending future phases — only out-of-package phases are hidden.
    const maxVisiblePhase = projectPhases.length > 0 ? projectPhases.length : (pkg?.phases ?? 5);

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        budget: project.budget ? parseFloat(project.budget) : null,
        dueDate: project.dueDate ? project.dueDate.toISOString() : null,
        currentPhase: project.currentPhase,
        createdAt: project.createdAt.toISOString(),
      },
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
      },
      package: pkg ? {
        id: pkg.id,
        name: pkg.name,
        slug: pkg.slug,
        price: parseFloat(pkg.price),
        description: pkg.description,
        phases: pkg.phases,
      } : null,
      checklist: checklist.map(c => ({
        id: c.id,
        label: c.label,
        description: c.description,
        phase: c.phase,
        isCompleted: c.isCompleted,
        completedAt: c.completedAt ? c.completedAt.toISOString() : null,
        sortOrder: c.sortOrder,
      })),
      discoveryResponse: discoveryRows[0] ? {
        id: discoveryRows[0].id,
        responses: discoveryRows[0].responses,
        submittedAt: discoveryRows[0].submittedAt ? discoveryRows[0].submittedAt.toISOString() : null,
      } : null,
      feedbackRounds: feedback.map(f => ({
        id: f.id,
        roundNumber: f.roundNumber,
        feedbackText: f.feedbackText,
        designArea: f.designArea,
        status: f.status,
        adminNotes: f.adminNotes,
        createdAt: f.createdAt.toISOString(),
      })),
      testimonial: testimonialRows[0] ? {
        id: testimonialRows[0].id,
        rating: testimonialRows[0].rating,
        testimonialText: testimonialRows[0].testimonialText,
        referralName: testimonialRows[0].referralName,
        referralEmail: testimonialRows[0].referralEmail,
        createdAt: testimonialRows[0].createdAt.toISOString(),
      } : null,
      invoices: projectInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        amount: parseFloat(inv.amount),
        dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
        paidDate: inv.paidDate ? inv.paidDate.toISOString() : null,
      })),
      maxVisiblePhase,
      activePhases: projectPhases.map(p => ({
        id: p.id,
        name: p.name,
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

// POST /api/portal/discovery — submit discovery form
router.post("/discovery", async (req, res) => {
  try {
    const account = req.clientAccount;
    const { responses } = req.body;
    if (!responses || typeof responses !== "object") {
      res.status(400).json({ error: "responses object is required" });
      return;
    }

    // Upsert discovery response
    const existing = await db
      .select()
      .from(discoveryFormResponses)
      .where(eq(discoveryFormResponses.projectId, account.projectId))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(discoveryFormResponses)
        .set({ responses, submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(discoveryFormResponses.id, existing[0].id))
        .returning();
      res.json({ success: true, id: updated.id, submittedAt: updated.submittedAt?.toISOString() });
    } else {
      const [created] = await db
        .insert(discoveryFormResponses)
        .values({
          projectId: account.projectId,
          clientAccountId: account.id,
          responses,
          submittedAt: new Date(),
        })
        .returning();
      res.status(201).json({ success: true, id: created.id, submittedAt: created.submittedAt?.toISOString() });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/portal/checklist/:id — toggle checklist item
// Phase 4 (Launch) checklist items are agency-controlled and read-only for clients
router.patch("/checklist/:id", async (req, res) => {
  try {
    const account = req.clientAccount;
    const id = parseInt(req.params.id);
    const { isCompleted } = req.body;

    // Verify item belongs to client's project
    const item = await db
      .select()
      .from(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.projectId, account.projectId)))
      .limit(1);

    if (!item[0]) {
      res.status(404).json({ error: "Checklist item not found" });
      return;
    }

    // Phase 4 (Launch) items are agency-controlled — read-only for clients
    if (item[0].phase === 4) {
      res.status(403).json({ error: "Launch phase checklist items are completed by the agency, not the client." });
      return;
    }

    const [updated] = await db
      .update(checklistItems)
      .set({
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(checklistItems.id, id))
      .returning();

    res.json({
      id: updated.id,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/portal/feedback — submit a feedback round (max 2)
router.post("/feedback", async (req, res) => {
  try {
    const account = req.clientAccount;
    const { feedbackText, designArea } = req.body;
    if (!feedbackText) {
      res.status(400).json({ error: "feedbackText is required" });
      return;
    }

    // Count existing rounds — cap at 2
    const existing = await db
      .select()
      .from(feedbackRounds)
      .where(and(eq(feedbackRounds.projectId, account.projectId), eq(feedbackRounds.clientAccountId, account.id)));

    if (existing.length >= 2) {
      res.status(429).json({ error: "Maximum of 2 feedback rounds included in your package. Contact us to purchase additional rounds." });
      return;
    }

    const roundNumber = existing.length + 1;

    const [created] = await db
      .insert(feedbackRounds)
      .values({
        projectId: account.projectId,
        clientAccountId: account.id,
        roundNumber,
        feedbackText,
        designArea: designArea ?? null,
        status: "submitted",
      })
      .returning();

    res.status(201).json({
      id: created.id,
      roundNumber: created.roundNumber,
      feedbackText: created.feedbackText,
      designArea: created.designArea,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/portal/testimonial — submit testimonial + referral
router.post("/testimonial", async (req, res) => {
  try {
    const account = req.clientAccount;
    const { rating, testimonialText, referralName, referralEmail } = req.body;
    if (!testimonialText) {
      res.status(400).json({ error: "testimonialText is required" });
      return;
    }

    const existing = await db
      .select()
      .from(testimonials)
      .where(and(eq(testimonials.projectId, account.projectId), eq(testimonials.clientAccountId, account.id)))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(testimonials)
        .set({
          rating: rating ?? 5,
          testimonialText,
          referralName: referralName ?? null,
          referralEmail: referralEmail ?? null,
          updatedAt: new Date(),
        })
        .where(eq(testimonials.id, existing[0].id))
        .returning();
      res.json({
        id: updated.id,
        rating: updated.rating,
        testimonialText: updated.testimonialText,
        referralName: updated.referralName,
        referralEmail: updated.referralEmail,
        createdAt: updated.createdAt.toISOString(),
      });
    } else {
      const [created] = await db
        .insert(testimonials)
        .values({
          projectId: account.projectId,
          clientAccountId: account.id,
          rating: rating ?? 5,
          testimonialText,
          referralName: referralName ?? null,
          referralEmail: referralEmail ?? null,
        })
        .returning();
      res.status(201).json({
        id: created.id,
        rating: created.rating,
        testimonialText: created.testimonialText,
        referralName: created.referralName,
        referralEmail: created.referralEmail,
        createdAt: created.createdAt.toISOString(),
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
