import { db } from "@workspace/db";
import {
  organizations, users, clients, projects, phases, milestones, tasks, invoices, activityLogs
} from "@workspace/db/schema";
import crypto from "crypto";

const SECRET = process.env.HMAC_SECRET || "103-agency-os-secret-key-2024";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET).update(password).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // Organization
  const [org] = await db.insert(organizations).values({
    name: "103 Software Solutions LLC",
  }).returning();
  console.log("Created organization:", org.name);

  // Users
  const [admin] = await db.insert(users).values({
    name: "Alex Johnson", email: "admin@103software.com",
    passwordHash: hashPassword("admin123"), role: "admin", organizationId: org.id,
  }).returning();
  const [member] = await db.insert(users).values({
    name: "Sarah Chen", email: "sarah@103software.com",
    passwordHash: hashPassword("member123"), role: "member", organizationId: org.id,
  }).returning();
  console.log("Created users:", admin.name, member.name);

  // Clients
  const [apex] = await db.insert(clients).values({
    name: "Apex Innovations", email: "contact@apexinnovations.com",
    phone: "+1 (555) 234-5678", company: "Apex Innovations Inc.", status: "active", organizationId: org.id,
  }).returning();
  const [nexus] = await db.insert(clients).values({
    name: "Nexus Digital Group", email: "hello@nexusdigital.com",
    phone: "+1 (555) 345-6789", company: "Nexus Digital Group LLC", status: "active", organizationId: org.id,
  }).returning();
  const [summit] = await db.insert(clients).values({
    name: "Summit Analytics", email: "info@summitanalytics.io",
    phone: "+1 (555) 456-7890", company: "Summit Analytics Co.", status: "active", organizationId: org.id,
  }).returning();
  const [vertex] = await db.insert(clients).values({
    name: "Vertex Consulting", email: "team@vertexconsulting.com",
    phone: "+1 (555) 567-8901", company: "Vertex Consulting Group", status: "inactive", organizationId: org.id,
  }).returning();
  console.log("Created clients:", apex.name, nexus.name, summit.name, vertex.name);

  // Projects
  const [mobileApp] = await db.insert(projects).values({
    name: "Mobile App Development", description: "Native iOS and Android app for Apex Innovations",
    status: "active", budget: "60000", dueDate: new Date("2025-06-30"),
    clientId: apex.id, organizationId: org.id,
  }).returning();
  const [crm] = await db.insert(projects).values({
    name: "CRM Integration Suite", description: "Complete CRM integration for Nexus Digital Group",
    status: "active", budget: "32000", dueDate: new Date("2025-04-15"),
    clientId: nexus.id, organizationId: org.id,
  }).returning();
  const [ecommerce] = await db.insert(projects).values({
    name: "E-Commerce Platform Redesign", description: "Full platform redesign for Summit Analytics",
    status: "planning", budget: "45000", dueDate: new Date("2025-08-31"),
    clientId: summit.id, organizationId: org.id,
  }).returning();
  console.log("Created projects");

  // Phases
  await db.insert(phases).values([
    { name: "Discovery & Planning", order: 1, status: "completed", projectId: mobileApp.id },
    { name: "Design & Prototyping", order: 2, status: "completed", projectId: mobileApp.id },
    { name: "Development", order: 3, status: "in-progress", projectId: mobileApp.id },
    { name: "Testing & QA", order: 4, status: "pending", projectId: mobileApp.id },
    { name: "Requirements Gathering", order: 1, status: "completed", projectId: crm.id },
    { name: "Integration Development", order: 2, status: "in-progress", projectId: crm.id },
  ]);
  console.log("Created phases");

  // Milestones
  await db.insert(milestones).values([
    { name: "Project Kickoff", completed: true, dueDate: new Date("2024-11-01"), projectId: mobileApp.id },
    { name: "Design Approval", completed: true, dueDate: new Date("2024-12-15"), projectId: mobileApp.id },
    { name: "Alpha Release", completed: false, dueDate: new Date("2025-03-30"), projectId: mobileApp.id },
    { name: "Beta Launch", completed: false, dueDate: new Date("2025-05-31"), projectId: mobileApp.id },
    { name: "CRM Mapping Complete", completed: true, dueDate: new Date("2025-01-15"), projectId: crm.id },
    { name: "First Integration Live", completed: false, dueDate: new Date("2025-03-01"), projectId: crm.id },
  ]);
  console.log("Created milestones");

  // Tasks
  await db.insert(tasks).values([
    { title: "Set up CI/CD pipeline", description: "Configure GitHub Actions for automated testing and deployment", status: "done", priority: "high", dueDate: new Date("2025-01-20"), projectId: mobileApp.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Design onboarding screens", description: "Create wireframes and high-fidelity designs for user onboarding", status: "done", priority: "medium", dueDate: new Date("2025-01-25"), projectId: mobileApp.id, assigneeId: member.id, organizationId: org.id },
    { title: "Implement push notifications", description: "Set up Firebase Cloud Messaging for iOS and Android", status: "in-progress", priority: "high", dueDate: new Date("2025-02-15"), projectId: mobileApp.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Build user authentication", description: "Implement OAuth2 login with Apple, Google, and email", status: "in-progress", priority: "urgent", dueDate: new Date("2025-02-10"), projectId: mobileApp.id, assigneeId: member.id, organizationId: org.id },
    { title: "Create API documentation", description: "Write comprehensive docs for all REST endpoints", status: "todo", priority: "low", dueDate: new Date("2025-03-01"), projectId: mobileApp.id, assigneeId: null, organizationId: org.id },
    { title: "Map Salesforce fields", description: "Document and map all Salesforce CRM fields to internal schema", status: "done", priority: "high", dueDate: new Date("2025-01-18"), projectId: crm.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Build webhook handlers", description: "Implement real-time event handlers for Salesforce webhooks", status: "in-progress", priority: "high", dueDate: new Date("2025-02-20"), projectId: crm.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Test data sync pipeline", description: "End-to-end testing of bidirectional data sync", status: "review", priority: "urgent", dueDate: new Date("2025-02-25"), projectId: crm.id, assigneeId: member.id, organizationId: org.id },
    { title: "Conduct user research", description: "Interview 10 existing customers for UX requirements", status: "todo", priority: "medium", dueDate: new Date("2025-03-15"), projectId: ecommerce.id, assigneeId: member.id, organizationId: org.id },
    { title: "Define tech stack", description: "Evaluate and select frontend framework and hosting", status: "todo", priority: "high", dueDate: new Date("2025-03-20"), projectId: ecommerce.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Create brand guidelines", description: "Document color palette, typography, and component guidelines", status: "review", priority: "medium", dueDate: new Date("2025-03-10"), projectId: ecommerce.id, assigneeId: member.id, organizationId: org.id },
  ]);
  console.log("Created tasks");

  // Invoices
  const now = new Date();
  const pastMonth = new Date(now);
  pastMonth.setMonth(pastMonth.getMonth() - 1);
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  await db.insert(invoices).values([
    { invoiceNumber: "INV-2025-001", status: "paid", amount: "15000", dueDate: new Date("2025-01-31"), paidDate: new Date("2025-01-28"), clientId: apex.id, projectId: mobileApp.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-002", status: "paid", amount: "8000", dueDate: new Date("2025-01-15"), paidDate: new Date("2025-01-14"), clientId: nexus.id, projectId: crm.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-003", status: "sent", amount: "12000", dueDate: new Date("2025-03-15"), paidDate: null, clientId: apex.id, projectId: mobileApp.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-004", status: "overdue", amount: "9500", dueDate: new Date("2025-01-30"), paidDate: null, clientId: nexus.id, projectId: crm.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-005", status: "draft", amount: "11250", dueDate: new Date("2025-04-01"), paidDate: null, clientId: summit.id, projectId: ecommerce.id, organizationId: org.id },
  ]);
  console.log("Created invoices");

  // Activity logs
  await db.insert(activityLogs).values([
    { action: "create", entityType: "project", entityId: mobileApp.id, description: `Created project: ${mobileApp.name}`, userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "project", entityId: crm.id, description: `Created project: ${crm.name}`, userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "project", entityId: ecommerce.id, description: `Created project: ${ecommerce.name}`, userId: member.id, organizationId: org.id },
    { action: "update", entityType: "task", description: "Marked 'Set up CI/CD pipeline' as done", userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "invoice", entityId: 1, description: "Created invoice INV-2025-003 for Apex Innovations ($12,000)", userId: admin.id, organizationId: org.id },
    { action: "update", entityType: "invoice", description: "Invoice INV-2025-001 marked as Paid", userId: admin.id, organizationId: org.id },
    { action: "update", entityType: "task", description: "Started work on 'Build webhook handlers'", userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "client", entityId: summit.id, description: `Added new client: ${summit.name}`, userId: member.id, organizationId: org.id },
  ]);
  console.log("Created activity logs");

  console.log("\nSeed complete!");
  console.log("Demo login: admin@103software.com / admin123");
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
