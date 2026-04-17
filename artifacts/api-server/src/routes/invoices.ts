import { Router } from "express";
import { db } from "@workspace/db";
import { invoices, clients, projects } from "@workspace/db/schema";
import type { Invoice } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireStaffAuth } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

router.use(requireStaffAuth);

interface InvoiceRow extends Invoice {
  clientName: string;
  projectName?: string | null;
}

function formatInvoice(i: InvoiceRow) {
  return {
    id: i.id, invoiceNumber: i.invoiceNumber, status: i.status,
    amount: parseFloat(String(i.amount)),
    dueDate: i.dueDate ? i.dueDate.toISOString() : null,
    paidDate: i.paidDate ? i.paidDate.toISOString() : null,
    clientId: i.clientId, clientName: i.clientName,
    projectId: i.projectId, projectName: i.projectName ?? null,
    organizationId: i.organizationId,
    createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const user = req.user;
    if (!user || !db) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db
      .select({
        id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status,
        amount: invoices.amount, dueDate: invoices.dueDate, paidDate: invoices.paidDate,
        clientId: invoices.clientId, clientName: clients.name,
        projectId: invoices.projectId, projectName: projects.name,
        organizationId: invoices.organizationId, createdAt: invoices.createdAt, updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .where(eq(invoices.organizationId, user.organizationId))
      .orderBy(invoices.createdAt);

    res.json(rows.map(r => formatInvoice(r as InvoiceRow)));
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
    const { invoiceNumber, status, amount, dueDate, clientId, projectId } = req.body;
    if (!invoiceNumber || amount === undefined || !clientId) {
      res.status(400).json({ error: "invoiceNumber, amount, and clientId are required" });
      return;
    }
    const [invoice] = await db.insert(invoices).values({
      invoiceNumber, status: status ?? "draft", amount: String(amount),
      dueDate: dueDate ? new Date(dueDate) : null, paidDate: null,
      clientId: parseInt(clientId), projectId: projectId ? parseInt(projectId) : null,
      organizationId: user.organizationId,
    }).returning();
    const client = await db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1);
    const project = invoice.projectId ? await db.select().from(projects).where(eq(projects.id, invoice.projectId)).limit(1) : [];
    await logActivity({ action: "create", entityType: "invoice", entityId: invoice.id, description: `Created invoice ${invoiceNumber}`, userId: user.id, organizationId: user.organizationId });
    res.status(201).json(formatInvoice({ ...invoice, clientName: client[0]?.name ?? "", projectName: project[0]?.name ?? null }));
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
    const existing = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== user.organizationId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { status, amount, dueDate, paidDate } = req.body;
    const [updated] = await db.update(invoices)
      .set({
        ...(status && { status }),
        ...(amount !== undefined && { amount: String(amount) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(paidDate && { paidDate: new Date(paidDate) }),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    await logActivity({ action: "update", entityType: "invoice", entityId: id, description: `Updated invoice ${updated.invoiceNumber}`, userId: user.id, organizationId: user.organizationId });
    res.json(formatInvoice({ ...updated, clientName: "" }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
