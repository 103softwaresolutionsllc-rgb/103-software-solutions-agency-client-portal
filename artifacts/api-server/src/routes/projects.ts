import { Router } from "express";
import { db } from "@workspace/db";
import { projects, clients, tasks, phases, milestones, users, packages, clientAccounts } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireStaffAuth } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

router.use(requireStaffAuth);

function formatProject(p: any, clientName: string, taskCount: number, completedTaskCount: number, packageName?: string | null) {
  return {
    id: p.id, name: p.name, description: p.description, status: p.status,
    budget: p.budget ? parseFloat(p.budget) : null,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    clientId: p.clientId, clientName,
    organizationId: p.organizationId, taskCount, completedTaskCount,
    packageId: p.packageId ?? null,
    packageName: packageName ?? null,
    currentPhase: p.currentPhase ?? 1,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select({
        id: projects.id, name: projects.name, description: projects.description,
        status: projects.status, budget: projects.budget, dueDate: projects.dueDate,
        clientId: projects.clientId, clientName: clients.name,
        organizationId: projects.organizationId, createdAt: projects.createdAt, updatedAt: projects.updatedAt,
        packageId: projects.packageId, currentPhase: projects.currentPhase,
        packageName: packages.name,
        taskCount: sql<number>`count(${tasks.id})`.mapWith(Number),
        completedTaskCount: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`.mapWith(Number),
      })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .leftJoin(tasks, eq(tasks.projectId, projects.id))
      .leftJoin(packages, eq(packages.id, projects.packageId))
      .where(eq(projects.organizationId, user.organizationId))
      .groupBy(projects.id, clients.name, packages.name)
      .orderBy(projects.createdAt);

    res.json(rows.map(r => formatProject(r, r.clientName, r.taskCount, r.completedTaskCount, r.packageName)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, status, budget, dueDate, clientId } = req.body;
    if (!name || !clientId) {
      res.status(400).json({ error: "Name and clientId are required" });
      return;
    }
    const [project] = await db.insert(projects).values({
      name, description: description ?? null, status: status ?? "planning",
      budget: budget ? String(budget) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      clientId: parseInt(clientId), organizationId: user.organizationId,
    }).returning();
    const client = await db.select().from(clients).where(eq(clients.id, project.clientId)).limit(1);
    await logActivity({ action: "create", entityType: "project", entityId: project.id, description: `Created project ${name}`, userId: user.id, organizationId: user.organizationId });
    res.status(201).json(formatProject(project, client[0]?.name ?? "", 0, 0));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        id: projects.id, name: projects.name, description: projects.description,
        status: projects.status, budget: projects.budget, dueDate: projects.dueDate,
        clientId: projects.clientId, clientName: clients.name,
        organizationId: projects.organizationId, createdAt: projects.createdAt, updatedAt: projects.updatedAt,
        packageId: projects.packageId, currentPhase: projects.currentPhase,
        packageName: packages.name,
        taskCount: sql<number>`count(${tasks.id})`.mapWith(Number),
        completedTaskCount: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`.mapWith(Number),
      })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .leftJoin(tasks, eq(tasks.projectId, projects.id))
      .leftJoin(packages, eq(packages.id, projects.packageId))
      .where(and(eq(projects.id, id), eq(projects.organizationId, user.organizationId)))
      .groupBy(projects.id, clients.name, packages.name)
      .limit(1);

    const project = rows[0];
    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Fetch client account (if any) for this project
    const clientAccount = await db
      .select({ id: clientAccounts.id, email: clientAccounts.email, isActive: clientAccounts.isActive })
      .from(clientAccounts)
      .where(and(eq(clientAccounts.projectId, id), eq(clientAccounts.organizationId, user.organizationId)))
      .limit(1);

    const [phasesData, milestonesData, tasksData] = await Promise.all([
      db.select().from(phases).where(eq(phases.projectId, id)).orderBy(phases.order),
      db.select().from(milestones).where(eq(milestones.projectId, id)),
      db.select({
        id: tasks.id, title: tasks.title, description: tasks.description, status: tasks.status,
        priority: tasks.priority, dueDate: tasks.dueDate, projectId: tasks.projectId,
        assigneeId: tasks.assigneeId, organizationId: tasks.organizationId,
        createdAt: tasks.createdAt, updatedAt: tasks.updatedAt, assigneeName: users.name,
      }).from(tasks).leftJoin(users, eq(users.id, tasks.assigneeId)).where(eq(tasks.projectId, id)),
    ]);

    res.json({
      ...formatProject(project, project.clientName, project.taskCount, project.completedTaskCount, project.packageName),
      clientAccount: clientAccount[0] ?? null,
      phases: phasesData.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
      milestones: milestonesData.map(m => ({ ...m, dueDate: m.dueDate ? m.dueDate.toISOString() : null, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })),
      tasks: tasksData.map(t => ({
        ...t, projectName: project.name,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { name, description, status, budget, dueDate, clientId } = req.body;
    const [updated] = await db.update(projects)
      .set({ name, description: description ?? null, status, budget: budget ? String(budget) : null, dueDate: dueDate ? new Date(dueDate) : null, clientId: parseInt(clientId), updatedAt: new Date() })
      .where(eq(projects.id, id)).returning();
    const client = await db.select().from(clients).where(eq(clients.id, updated.clientId)).limit(1);
    const counts = await db.select({ total: sql<number>`count(*)`.mapWith(Number), done: sql<number>`sum(case when status = 'done' then 1 else 0 end)`.mapWith(Number) }).from(tasks).where(eq(tasks.projectId, id));
    const pkg = updated.packageId ? await db.select({ name: packages.name }).from(packages).where(eq(packages.id, updated.packageId)).limit(1) : [];
    await logActivity({ action: "update", entityType: "project", entityId: id, description: `Updated project ${name}`, userId: user.id, organizationId: user.organizationId });
    res.json(formatProject(updated, client[0]?.name ?? "", counts[0]?.total ?? 0, counts[0]?.done ?? 0, pkg[0]?.name ?? null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(projects).where(eq(projects.id, id));
    await logActivity({ action: "delete", entityType: "project", entityId: id, description: `Deleted project ${existing[0].name}`, userId: user.id, organizationId: user.organizationId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
