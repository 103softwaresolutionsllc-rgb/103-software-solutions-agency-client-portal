import { Router } from "express";
import { db } from "@workspace/db";
import { phases, milestones } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaffAuth } from "../lib/auth.js";

const router = Router();

router.get("/phases", requireStaffAuth, async (req, res) => {
  try {
    if (!db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const where = projectId ? eq(phases.projectId, projectId) : undefined;
    const rows = await db.select().from(phases).where(where).orderBy(phases.order);
    res.json(rows.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/phases", requireStaffAuth, async (req, res) => {
  try {
    if (!db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { name, description, order, status, projectId } = req.body;
    const [phase] = await db.insert(phases).values({
      name, description: description ?? null, order: order ?? 0, status: status ?? "pending",
      projectId: parseInt(projectId),
    }).returning();
    res.status(201).json({ ...phase, createdAt: phase.createdAt.toISOString(), updatedAt: phase.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/milestones", requireStaffAuth, async (req, res) => {
  try {
    if (!db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const where = projectId ? eq(milestones.projectId, projectId) : undefined;
    const rows = await db.select().from(milestones).where(where);
    res.json(rows.map(m => ({ ...m, dueDate: m.dueDate ? m.dueDate.toISOString() : null, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/milestones", requireStaffAuth, async (req, res) => {
  try {
    if (!db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { name, description, dueDate, completed, projectId, phaseId } = req.body;
    const [milestone] = await db.insert(milestones).values({
      name, description: description ?? null, dueDate: dueDate ? new Date(dueDate) : null,
      completed: completed ?? false, projectId: parseInt(projectId),
      phaseId: phaseId ? parseInt(phaseId) : null,
    }).returning();
    res.status(201).json({ ...milestone, dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null, createdAt: milestone.createdAt.toISOString(), updatedAt: milestone.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
