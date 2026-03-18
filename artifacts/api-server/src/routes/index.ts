import { Router, type IRouter } from "express";
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

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientsRouter);
router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/invoices", invoicesRouter);
router.use(phasesRouter);
router.use("/activity", activityRouter);
router.use("/dashboard", dashboardRouter);
router.use("/portal", portalRouter);
router.use("/admin/portal", adminPortalRouter);

export default router;
