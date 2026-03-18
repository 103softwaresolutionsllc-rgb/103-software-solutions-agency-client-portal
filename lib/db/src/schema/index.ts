import { pgTable, text, serial, integer, numeric, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: text("company"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  phases: integer("phases").notNull().default(4),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("planning"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  dueDate: timestamp("due_date"),
  clientId: integer("client_id").notNull().references(() => clients.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  packageId: integer("package_id").references(() => packages.id, { onDelete: "set null" }),
  currentPhase: integer("current_phase").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientAccounts = pgTable("client_accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const discoveryFormResponses = pgTable("discovery_form_responses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id),
  responses: jsonb("responses").notNull().default({}),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phase: integer("phase").notNull().default(2),
  label: text("label").notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedbackRounds = pgTable("feedback_rounds", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id),
  roundNumber: integer("round_number").notNull().default(1),
  feedbackText: text("feedback_text").notNull(),
  designArea: varchar("design_area", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("submitted"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id),
  rating: integer("rating").notNull().default(5),
  testimonialText: text("testimonial_text").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  referralName: text("referral_name"),
  referralEmail: varchar("referral_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const phases = pgTable("phases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").notNull().default(false),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => phases.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("todo"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  dueDate: timestamp("due_date"),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  assigneeId: integer("assignee_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  clientId: integer("client_id").notNull().references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id"),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackageSchema = createInsertSchema(packages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientAccountSchema = createInsertSchema(clientAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDiscoveryFormResponseSchema = createInsertSchema(discoveryFormResponses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeedbackRoundSchema = createInsertSchema(feedbackRounds).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPhaseSchema = createInsertSchema(phases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ClientAccount = typeof clientAccounts.$inferSelect;
export type InsertClientAccount = z.infer<typeof insertClientAccountSchema>;
export type DiscoveryFormResponse = typeof discoveryFormResponses.$inferSelect;
export type InsertDiscoveryFormResponse = z.infer<typeof insertDiscoveryFormResponseSchema>;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type FeedbackRound = typeof feedbackRounds.$inferSelect;
export type InsertFeedbackRound = z.infer<typeof insertFeedbackRoundSchema>;
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Phase = typeof phases.$inferSelect;
export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
