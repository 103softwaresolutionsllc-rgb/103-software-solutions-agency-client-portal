import { Router } from "express";
import { db } from "@workspace/db";
import { projects, clients, invoices, tasks, activityLogs, users, clientAccounts } from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/metrics", async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;

    const [
      revenueResult,
      activeProjectsResult,
      totalClientsResult,
      overdueResult,
      pendingTasksResult,
      revenueByMonthResult,
      recentActivityResult,
      clientsByPhaseResult,
    ] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(${invoices.amount}::numeric), 0)`.mapWith(Number) })
        .from(invoices)
        .where(and(eq(invoices.organizationId, orgId), eq(invoices.status, "paid"))),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(projects)
        .where(and(eq(projects.organizationId, orgId), eq(projects.status, "active"))),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(clients)
        .where(eq(clients.organizationId, orgId)),
      db.select({
        count: sql<number>`count(*)`.mapWith(Number),
        amount: sql<number>`coalesce(sum(${invoices.amount}::numeric), 0)`.mapWith(Number),
      })
        .from(invoices)
        .where(and(eq(invoices.organizationId, orgId), eq(invoices.status, "overdue"))),
      db.select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(tasks)
        .where(and(eq(tasks.organizationId, orgId), sql`${tasks.status} != 'done'`)),
      db.execute(sql`
        SELECT to_char(date_trunc('month', paid_date), 'Mon YYYY') as month,
               coalesce(sum(amount::numeric), 0) as revenue
        FROM invoices
        WHERE organization_id = ${orgId} AND status = 'paid' AND paid_date IS NOT NULL
        GROUP BY date_trunc('month', paid_date)
        ORDER BY date_trunc('month', paid_date) DESC
        LIMIT 12
      `),
      db
        .select({
          id: activityLogs.id, action: activityLogs.action, entityType: activityLogs.entityType,
          entityId: activityLogs.entityId, description: activityLogs.description,
          userId: activityLogs.userId, userName: users.name,
          organizationId: activityLogs.organizationId, createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .leftJoin(users, eq(users.id, activityLogs.userId))
        .where(eq(activityLogs.organizationId, orgId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(10),
      // Count client portal accounts grouped by the project's current phase
      db.execute(sql`
        SELECT p.current_phase as phase, count(*) as count
        FROM client_accounts ca
        INNER JOIN projects p ON p.id = ca.project_id
        WHERE ca.organization_id = ${orgId} AND ca.is_active = true
        GROUP BY p.current_phase
        ORDER BY p.current_phase
      `),
    ]);

    const revenueByMonth = (revenueByMonthResult.rows as any[]).reverse().map((r: any) => ({
      month: r.month,
      revenue: parseFloat(r.revenue),
    }));

    const clientsByPhase = (clientsByPhaseResult.rows as any[]).map((r: any) => ({
      phase: parseInt(r.phase),
      count: parseInt(r.count),
    }));

    res.json({
      totalRevenue: revenueResult[0]?.total ?? 0,
      activeProjects: activeProjectsResult[0]?.count ?? 0,
      totalClients: totalClientsResult[0]?.count ?? 0,
      overdueInvoices: overdueResult[0]?.count ?? 0,
      overdueAmount: overdueResult[0]?.amount ?? 0,
      pendingTasks: pendingTasksResult[0]?.count ?? 0,
      revenueByMonth,
      recentActivity: recentActivityResult.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
      clientsByPhase,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
