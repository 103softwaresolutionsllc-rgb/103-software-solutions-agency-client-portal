import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import clientsRouter from "./clients.js";
import projectsRouter from "./projects.js";
import tasksRouter from "./tasks.js";
import invoicesRouter from "./invoices.js";
import phasesRouter from "./phases.js";
import activityRouter from "./activity.js";
import dashboardRouter from "./dashboard.js";
import portalRouter from "./portal.js";
import adminPortalRouter from "./admin-portal.js";

const router: IRouter = Router();

// Middleware to check database connection
router.use((req, res, next) => {
  if (req.path === "/healthz") return next();
  if (!db) {
    res.status(503).json({ 
      error: "Database not connected. Please ensure DATABASE_URL is set." 
    });
    return;
  }
  next();
});

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientsRouter);
router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/invoices", invoicesRouter);
router.use(phasesRouter);
router.use("/activity", activityRouter);
router.use("/dashboard", dashboardRouter);

// Portal routes — canonical (/api/portal/*) and alias (/api/client/*)
router.use("/portal", portalRouter);
router.use("/client", portalRouter);

// Admin portal routes — canonical (/api/admin/portal/*)
router.use("/admin/portal", adminPortalRouter);

// /api/admin/projects/:id/* — alias that rewrites to /projects/:id/* and forwards to adminPortalRouter
router.use("/admin/projects/:projectId", (req: Request, res: Response, next: NextFunction) => {
  const projectId = (req.params as { projectId: string }).projectId;
  req.url = `/projects/${projectId}${req.path === "/" ? "" : req.path}`;
  (adminPortalRouter as Router)(req, res, next);
});

export default router;
