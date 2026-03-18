import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogs, users } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireStaffAuth } from "../lib/auth.js";

const router = Router();

router.use(requireStaffAuth);

router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: activityLogs.id, action: activityLogs.action, entityType: activityLogs.entityType,
          entityId: activityLogs.entityId, description: activityLogs.description,
          userId: activityLogs.userId, userName: users.name,
          organizationId: activityLogs.organizationId, createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .leftJoin(users, eq(users.id, activityLogs.userId))
        .where(eq(activityLogs.organizationId, user.organizationId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(activityLogs)
        .where(eq(activityLogs.organizationId, user.organizationId)),
    ]);

    res.json({
      data: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total: totalRows[0]?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
