import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, projects, users } from "@workspace/db/schema";
import type { Task } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireStaffAuth } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

router.use(requireStaffAuth);

interface TaskRow extends Task {
  projectName: string;
  assigneeName?: string | null;
}

function formatTask(t: TaskRow) {
  return {
    id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId, projectName: t.projectName,
    assigneeId: t.assigneeId, assigneeName: t.assigneeName ?? null,
    organizationId: t.organizationId,
    createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const status = req.query.status as string | undefined;

    const conditions = [eq(tasks.organizationId, user.organizationId)];
    if (projectId) conditions.push(eq(tasks.projectId, projectId));
    if (status) conditions.push(eq(tasks.status, status));

    const rows = await db
      .select({
        id: tasks.id, title: tasks.title, description: tasks.description, status: tasks.status,
        priority: tasks.priority, dueDate: tasks.dueDate, projectId: tasks.projectId,
        assigneeId: tasks.assigneeId, organizationId: tasks.organizationId,
        createdAt: tasks.createdAt, updatedAt: tasks.updatedAt,
        projectName: projects.name, assigneeName: users.name,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(and(...conditions))
      .orderBy(tasks.createdAt);

    res.json(rows.map(r => formatTask(r as TaskRow)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;
    if (!title || !projectId) {
      res.status(400).json({ error: "Title and projectId are required" });
      return;
    }
    const [task] = await db.insert(tasks).values({
      title, description: description ?? null, status: status ?? "todo",
      priority: priority ?? "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: parseInt(projectId), assigneeId: assigneeId ? parseInt(assigneeId) : null,
      organizationId: user.organizationId,
    }).returning();
    const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
    const assignee = task.assigneeId ? await db.select().from(users).where(eq(users.id, task.assigneeId)).limit(1) : [];
    await logActivity({ action: "create", entityType: "task", entityId: task.id, description: `Created task: ${title}`, userId: user.id, organizationId: user.organizationId });
    res.status(201).json(formatTask({ ...task, projectName: project[0]?.name ?? "", assigneeName: assignee[0]?.name ?? null }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);
    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    const [updated] = await db.update(tasks)
      .set({
        ...(title && { title }), ...(description !== undefined && { description }),
        ...(status && { status }), ...(priority && { priority }),
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId !== undefined ? (assigneeId ? parseInt(assigneeId) : null) : existing[0].assigneeId,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id)).returning();
    const project = await db.select().from(projects).where(eq(projects.id, updated.projectId)).limit(1);
    const assignee = updated.assigneeId ? await db.select().from(users).where(eq(users.id, updated.assigneeId)).limit(1) : [];
    await logActivity({ action: "update", entityType: "task", entityId: id, description: `Updated task: ${updated.title}`, userId: user.id, organizationId: user.organizationId });
    res.json(formatTask({ ...updated, projectName: project[0]?.name ?? "", assigneeName: assignee[0]?.name ?? null }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = parseInt(req.params.id);
    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(tasks).where(eq(tasks.id, id));
    await logActivity({ action: "delete", entityType: "task", entityId: id, description: `Deleted task: ${existing[0].title}`, userId: user.id, organizationId: user.organizationId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
