import { db } from "@workspace/db";
import {
  organizations, users, clients, packages, projects, clientAccounts,
  phases, milestones, tasks, invoices, activityLogs, checklistItems,
  discoveryFormResponses, feedbackRounds, testimonials
} from "@workspace/db/schema";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";

const SECRET = process.env.HMAC_SECRET || "103-agency-os-secret-key-2024";

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET).update(password).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  const [org] = await db.insert(organizations).values({ name: "103 Software Solutions LLC" }).returning();
  console.log("Created organization:", org.name);

  const [admin] = await db.insert(users).values({
    name: "Alex Johnson", email: "admin@103software.com",
    passwordHash: hashPassword("admin123"), role: "admin", organizationId: org.id,
  }).returning();
  const [member] = await db.insert(users).values({
    name: "Sarah Chen", email: "sarah@103software.com",
    passwordHash: hashPassword("member123"), role: "member", organizationId: org.id,
  }).returning();
  console.log("Created staff users:", admin.name, member.name);

  const [launchpad] = await db.insert(packages).values({
    name: "Launchpad", slug: "launchpad", price: "2500",
    description: "Perfect for businesses ready to launch their first professional web presence.",
    phases: 4, organizationId: org.id,
  }).returning();
  const [growth] = await db.insert(packages).values({
    name: "Growth", slug: "growth", price: "5000",
    description: "Comprehensive package including all 5 phases with post-launch support.",
    phases: 5, organizationId: org.id,
  }).returning();
  const [elite] = await db.insert(packages).values({
    name: "Elite", slug: "elite", price: "10000",
    description: "White-glove service with priority support and all 5 phases.",
    phases: 5, organizationId: org.id,
  }).returning();
  console.log("Created packages");

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
  await db.insert(clients).values({
    name: "Vertex Consulting", email: "team@vertexconsulting.com",
    phone: "+1 (555) 567-8901", company: "Vertex Consulting Group", status: "inactive", organizationId: org.id,
  });
  console.log("Created clients");

  const [mobileApp] = await db.insert(projects).values({
    name: "Mobile App Development", description: "Native iOS and Android app for Apex Innovations",
    status: "active", budget: "60000", dueDate: new Date("2025-06-30"),
    clientId: apex.id, organizationId: org.id, packageId: elite.id, currentPhase: 3,
  }).returning();
  const [crm] = await db.insert(projects).values({
    name: "CRM Integration Suite", description: "Complete CRM integration for Nexus Digital Group",
    status: "active", budget: "32000", dueDate: new Date("2025-04-15"),
    clientId: nexus.id, organizationId: org.id, packageId: growth.id, currentPhase: 2,
  }).returning();
  const [ecommerce] = await db.insert(projects).values({
    name: "E-Commerce Platform Redesign", description: "Full platform redesign for Summit Analytics",
    status: "planning", budget: "45000", dueDate: new Date("2025-08-31"),
    clientId: summit.id, organizationId: org.id, packageId: launchpad.id, currentPhase: 1,
  }).returning();
  console.log("Created projects");

  await db.insert(clientAccounts).values([
    { email: "client@apexinnovations.com", passwordHash: hashPassword("client123"), clientId: apex.id, projectId: mobileApp.id, organizationId: org.id, isActive: true },
    { email: "client@nexusdigital.com", passwordHash: hashPassword("client123"), clientId: nexus.id, projectId: crm.id, organizationId: org.id, isActive: true },
    { email: "client@summitanalytics.io", passwordHash: hashPassword("client123"), clientId: summit.id, projectId: ecommerce.id, organizationId: org.id, isActive: true },
  ]);
  console.log("Created client accounts");

  const phase2Items = [
    { label: "Business logo files (SVG, PNG, AI)", description: "All logo variations: primary, white, dark, icon only", sortOrder: 1 },
    { label: "Brand color palette", description: "Hex codes for all brand colors (primary, secondary, accents)", sortOrder: 2 },
    { label: "Brand fonts", description: "Font files or Google Font names used in your brand", sortOrder: 3 },
    { label: "Website copy / written content", description: "All page text: headings, body copy, CTAs, bio, services descriptions", sortOrder: 4 },
    { label: "Professional photos", description: "Headshots, team photos, product/service imagery (high resolution)", sortOrder: 5 },
    { label: "Testimonials & social proof", description: "Client reviews, case studies, or star ratings to feature", sortOrder: 6 },
    { label: "Social media profile URLs", description: "Links to all active social profiles (Instagram, LinkedIn, Facebook, etc.)", sortOrder: 7 },
    { label: "Domain name & hosting access", description: "Domain login credentials or transfer authorization code", sortOrder: 8 },
    { label: "Examples / inspiration websites", description: "3-5 websites you like the look or feel of (optional but helpful)", sortOrder: 9 },
    { label: "Business email address", description: "The email address(es) to set up on your domain", sortOrder: 10 },
  ];

  const phase4Items = [
    { label: "Final design approved", description: "Client has signed off on all pages and elements", sortOrder: 1 },
    { label: "All content proofread", description: "Spelling, grammar, and accuracy reviewed", sortOrder: 2 },
    { label: "Mobile responsiveness tested", description: "Site looks and works correctly on phone and tablet", sortOrder: 3 },
    { label: "Domain connected and SSL live", description: "Custom domain pointing to new site with HTTPS enabled", sortOrder: 4 },
    { label: "Google Analytics / tracking installed", description: "Analytics code verified and tracking active", sortOrder: 5 },
    { label: "Contact forms tested", description: "All forms submitting and email notifications confirmed", sortOrder: 6 },
  ];

  for (const projectRow of [mobileApp, crm, ecommerce]) {
    const allItems = [
      ...phase2Items.map(i => ({ ...i, phase: 2, projectId: projectRow.id, isCompleted: false })),
      ...phase4Items.map(i => ({ ...i, phase: 4, projectId: projectRow.id, isCompleted: false })),
    ];
    await db.insert(checklistItems).values(allItems);
  }

  // Mark all phase-2 checklist items as complete for mobileApp (they're in phase 3)
  const apexPhase2 = await db.select().from(checklistItems)
    .where(and(eq(checklistItems.projectId, mobileApp.id), eq(checklistItems.phase, 2)));
  for (const item of apexPhase2) {
    await db.update(checklistItems)
      .set({ isCompleted: true, completedAt: new Date("2025-01-15") })
      .where(eq(checklistItems.id, item.id));
  }

  // Mark some phase-2 items complete for crm (they're in phase 2, partway done)
  const crmPhase2 = await db.select().from(checklistItems)
    .where(and(eq(checklistItems.projectId, crm.id), eq(checklistItems.phase, 2)));
  for (const item of crmPhase2.slice(0, 5)) {
    await db.update(checklistItems)
      .set({ isCompleted: true, completedAt: new Date("2025-02-01") })
      .where(eq(checklistItems.id, item.id));
  }
  console.log("Created checklist items");

  await db.insert(phases).values([
    { name: "Discovery & Planning", order: 1, status: "completed", projectId: mobileApp.id },
    { name: "Design & Prototyping", order: 2, status: "completed", projectId: mobileApp.id },
    { name: "Development", order: 3, status: "in-progress", projectId: mobileApp.id },
    { name: "Testing & QA", order: 4, status: "pending", projectId: mobileApp.id },
    { name: "Requirements Gathering", order: 1, status: "completed", projectId: crm.id },
    { name: "Integration Development", order: 2, status: "in-progress", projectId: crm.id },
  ]);

  await db.insert(milestones).values([
    { name: "Project Kickoff", completed: true, dueDate: new Date("2024-11-01"), projectId: mobileApp.id },
    { name: "Design Approval", completed: true, dueDate: new Date("2024-12-15"), projectId: mobileApp.id },
    { name: "Alpha Release", completed: false, dueDate: new Date("2025-03-30"), projectId: mobileApp.id },
    { name: "Beta Launch", completed: false, dueDate: new Date("2025-05-31"), projectId: mobileApp.id },
    { name: "CRM Mapping Complete", completed: true, dueDate: new Date("2025-01-15"), projectId: crm.id },
    { name: "First Integration Live", completed: false, dueDate: new Date("2025-03-01"), projectId: crm.id },
  ]);

  await db.insert(tasks).values([
    { title: "Set up CI/CD pipeline", status: "done", priority: "high", dueDate: new Date("2025-01-20"), projectId: mobileApp.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Design onboarding screens", status: "done", priority: "medium", dueDate: new Date("2025-01-25"), projectId: mobileApp.id, assigneeId: member.id, organizationId: org.id },
    { title: "Implement push notifications", status: "in-progress", priority: "high", dueDate: new Date("2025-02-15"), projectId: mobileApp.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Build user authentication", status: "in-progress", priority: "urgent", dueDate: new Date("2025-02-10"), projectId: mobileApp.id, assigneeId: member.id, organizationId: org.id },
    { title: "Create API documentation", status: "todo", priority: "low", dueDate: new Date("2025-03-01"), projectId: mobileApp.id, assigneeId: null, organizationId: org.id },
    { title: "Map Salesforce fields", status: "done", priority: "high", dueDate: new Date("2025-01-18"), projectId: crm.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Build webhook handlers", status: "in-progress", priority: "high", dueDate: new Date("2025-02-20"), projectId: crm.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Test data sync pipeline", status: "review", priority: "urgent", dueDate: new Date("2025-02-25"), projectId: crm.id, assigneeId: member.id, organizationId: org.id },
    { title: "Conduct user research", status: "todo", priority: "medium", dueDate: new Date("2025-03-15"), projectId: ecommerce.id, assigneeId: member.id, organizationId: org.id },
    { title: "Define tech stack", status: "todo", priority: "high", dueDate: new Date("2025-03-20"), projectId: ecommerce.id, assigneeId: admin.id, organizationId: org.id },
    { title: "Create brand guidelines", status: "review", priority: "medium", dueDate: new Date("2025-03-10"), projectId: ecommerce.id, assigneeId: member.id, organizationId: org.id },
  ]);

  await db.insert(invoices).values([
    { invoiceNumber: "INV-2025-001", status: "paid", amount: "15000", dueDate: new Date("2025-01-31"), paidDate: new Date("2025-01-28"), clientId: apex.id, projectId: mobileApp.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-002", status: "paid", amount: "8000", dueDate: new Date("2025-01-15"), paidDate: new Date("2025-01-14"), clientId: nexus.id, projectId: crm.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-003", status: "sent", amount: "12000", dueDate: new Date("2025-03-15"), paidDate: null, clientId: apex.id, projectId: mobileApp.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-004", status: "overdue", amount: "9500", dueDate: new Date("2025-01-30"), paidDate: null, clientId: nexus.id, projectId: crm.id, organizationId: org.id },
    { invoiceNumber: "INV-2025-005", status: "draft", amount: "11250", dueDate: new Date("2025-04-01"), paidDate: null, clientId: summit.id, projectId: ecommerce.id, organizationId: org.id },
  ]);

  // Seed discovery form response for Apex (Phase 3) — they completed Phase 1
  const [apexClientAccount] = await db.select().from(clientAccounts).where(eq(clientAccounts.projectId, mobileApp.id)).limit(1);
  await db.insert(discoveryFormResponses).values({
    projectId: mobileApp.id,
    clientAccountId: apexClientAccount.id,
    organizationId: org.id,
    responses: {
      businessName: "Apex Innovations Inc.",
      websiteGoal: "Launch a new mobile app to allow our enterprise clients to manage their workflows on the go. We need iOS and Android apps with real-time sync.",
      targetAudience: "Enterprise mid-market businesses with 50-500 employees, primarily decision-makers aged 35-55 who are tech-savvy but not technical.",
      competitors: "Salesforce Mobile, Monday.com, and Asana. We want to be cleaner and faster than all of them.",
      designPreference: "Modern, dark theme preferred. Clean and minimalist. We like the look of Linear.app and Vercel's design language.",
      existingBranding: "Yes, we have a full brand guide. Colors: Electric Blue (#0066FF) and Near-Black (#0A0A0F). Font: Inter for UI, Sora for display.",
      timeline: "Hard deadline of Q3 2025 for initial App Store submission. We have a product launch event on July 15th.",
      budget: "We've approved $60,000 for Phase 1 through Phase 3. Post-launch support is an add-on we'll discuss.",
      additionalNotes: "Our CTO will be the main point of contact for technical decisions. Please CC Jordan at jordan@apexinnovations.com on all technical updates.",
    },
  });

  // Seed one feedback round for Apex (they've submitted Round 1 and it's been reviewed)
  await db.insert(feedbackRounds).values({
    projectId: mobileApp.id,
    clientAccountId: apexClientAccount.id,
    organizationId: org.id,
    roundNumber: 1,
    designArea: "Overall Design",
    feedbackText: "The overall direction looks great! A few things we'd like to adjust:\n\n1. The dashboard cards feel a bit too spacious on desktop — can we tighten the padding so more content is visible above the fold?\n\n2. The blue in the navigation is slightly off — it should match our brand blue exactly (#0066FF), the current one looks slightly purple.\n\n3. We love the dark theme but our CEO wants to see a light mode option explored — can you show a quick mockup?\n\n4. The chart on the analytics page needs to be interactive — we should be able to hover for exact values.",
    status: "reviewed",
    adminNotes: "Thanks for the detailed feedback! Here's our response to each point:\n\n1. Dashboard card padding — adjusted in the latest build. Preview link: [figma.com/link]\n2. Navigation blue — corrected to exact #0066FF match, updated across all screens\n3. Light mode mockup — we've added 3 light mode variations in the Figma file for you to review\n4. Interactive charts — all charts now have hover tooltips with exact values. We also added a date range picker.\n\nPlease review the updated Figma file and let us know if Round 2 feedback is needed!",
  });
  console.log("Created discovery form response and feedback round for Apex");

  await db.insert(activityLogs).values([
    { action: "create", entityType: "project", entityId: mobileApp.id, description: `Created project: ${mobileApp.name}`, userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "project", entityId: crm.id, description: `Created project: ${crm.name}`, userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "project", entityId: ecommerce.id, description: `Created project: ${ecommerce.name}`, userId: member.id, organizationId: org.id },
    { action: "update", entityType: "task", description: "Marked 'Set up CI/CD pipeline' as done", userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "invoice", entityId: 1, description: "Created invoice INV-2025-003 for Apex Innovations ($12,000)", userId: admin.id, organizationId: org.id },
    { action: "update", entityType: "invoice", description: "Invoice INV-2025-001 marked as Paid", userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "client_account", description: "Created portal login for Apex Innovations", userId: admin.id, organizationId: org.id },
    { action: "create", entityType: "client_account", description: "Created portal login for Nexus Digital Group", userId: admin.id, organizationId: org.id },
    { action: "update", entityType: "project", entityId: mobileApp.id, description: "Advanced project to Phase 3", userId: admin.id, organizationId: org.id },
  ]);
  console.log("Created all data");

  console.log("\n=== Seed complete! ===");
  console.log("Staff logins:");
  console.log("  Admin:  admin@103software.com / admin123");
  console.log("  Member: sarah@103software.com / member123");
  console.log("\nClient portal logins:");
  console.log("  Apex (Phase 3):    client@apexinnovations.com / client123");
  console.log("  Nexus (Phase 2):   client@nexusdigital.com / client123");
  console.log("  Summit (Phase 1):  client@summitanalytics.io / client123");
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
