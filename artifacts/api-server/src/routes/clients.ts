import { Router } from "express";
import { db } from "@workspace/db";
import { clients, projects } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireStaffAuth } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

router.use(requireStaffAuth);

router.get("/", async (req, res) => {
  try {
    const user = req.user;
    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        company: clients.company,
        status: clients.status,
        organizationId: clients.organizationId,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        projectCount: sql<number>`count(${projects.id})`.mapWith(Number),
        portalPhase: sql<number | null>`max(${projects.currentPhase})`,
      })
      .from(clients)
      .leftJoin(projects, eq(projects.clientId, clients.id))
      .where(eq(clients.organizationId, user.organizationId))
      .groupBy(clients.id)
      .orderBy(clients.name);

    res.json(rows.map(r => ({
      ...r,
      portalPhase: r.portalPhase ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = req.user;
    const { name, email, phone, company, status } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }
    const [client] = await db.insert(clients).values({
      name, email, phone: phone ?? null, company: company ?? null,
      status: status ?? "active",
      organizationId: user.organizationId,
    }).returning();
    await logActivity({ action: "create", entityType: "client", entityId: client.id, description: `Created client ${name}`, userId: user.id, organizationId: user.organizationId });
    const projectCount = 0;
    res.status(201).json({ ...client, projectCount, createdAt: client.createdAt.toISOString(), updatedAt: client.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        id: clients.id, name: clients.name, email: clients.email,
        phone: clients.phone, company: clients.company, status: clients.status,
        organizationId: clients.organizationId, createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        projectCount: sql<number>`count(${projects.id})`.mapWith(Number),
      })
      .from(clients)
      .leftJoin(projects, eq(projects.clientId, clients.id))
      .where(eq(clients.id, id))
      .groupBy(clients.id)
      .limit(1);
    const client = rows[0];
    if (!client || client.organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...client, createdAt: client.createdAt.toISOString(), updatedAt: client.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const existing = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { name, email, phone, company, status } = req.body;
    const [updated] = await db.update(clients)
      .set({ name, email, phone: phone ?? null, company: company ?? null, status, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    await logActivity({ action: "update", entityType: "client", entityId: id, description: `Updated client ${name}`, userId: user.id, organizationId: user.organizationId });
    const count = await db.select({ c: sql<number>`count(*)`.mapWith(Number) }).from(projects).where(eq(projects.clientId, id));
    res.json({ ...updated, projectCount: count[0]?.c ?? 0, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const existing = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(clients).where(eq(clients.id, id));
    await logActivity({ action: "delete", entityType: "client", entityId: id, description: `Deleted client ${existing[0].name}`, userId: user.id, organizationId: user.organizationId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
