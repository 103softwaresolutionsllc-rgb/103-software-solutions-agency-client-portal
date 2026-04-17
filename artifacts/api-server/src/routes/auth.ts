import { Router } from "express";
import { db } from "@workspace/db";
import { users, clientAccounts, clients, projects } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, requireAuth, requireStaffAuth } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Mock authentication for development
    if (email === "admin@103software.com" && password === "admin123") {
      const mockUser = {
        id: "user-admin-001",
        name: "Alex Johnson",
        email: "admin@103software.com",
        role: "admin",
        organizationId: "org-103-software",
        createdAt: new Date().toISOString(),
      };
      
      const token = "mock-token-" + Date.now();
      res.json({
        token,
        user: mockUser,
      });
      return;
    }

    // Try database authentication if available
    if (db) {
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user && user[0] && user[0].passwordHash === hashPassword(password)) {
        const token = generateToken(user[0].id, user[0].email, "staff");
        res.json({
          token,
          user: {
            id: user[0].id,
            name: user[0].name,
            email: user[0].email,
            role: user[0].role,
            organizationId: user[0].organizationId,
            createdAt: user[0].createdAt.toISOString(),
            accountType: "staff",
          },
        });
        return;
      }
    }

    // Try client login
    if (db) {
      const clientAccount = await db
        .select({
          account: clientAccounts,
          clientName: clients.name,
        })
        .from(clientAccounts)
        .innerJoin(clients, eq(clients.id, clientAccounts.clientId))
        .where(eq(clientAccounts.email, email))
        .limit(1);

      if (clientAccount && clientAccount[0] && clientAccount[0].account.passwordHash === hashPassword(password)) {
        if (!clientAccount[0].account.isActive) {
          res.status(401).json({ error: "Account is inactive" });
          return;
        }
        const token = generateToken(clientAccount[0].account.id, clientAccount[0].account.email, "client");
        res.json({
          token,
          user: {
            id: clientAccount[0].account.id,
            name: clientAccount[0].clientName,
            email: clientAccount[0].account.email,
            role: "client",
            organizationId: clientAccount[0].account.organizationId,
            clientId: clientAccount[0].account.clientId,
            projectId: clientAccount[0].account.projectId,
            createdAt: clientAccount[0].account.createdAt.toISOString(),
            accountType: "client",
          },
        });
        return;
      }
    }

    res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/client-login — dedicated client login endpoint (same logic as /login but client-only)
router.post("/client-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Mock authentication for development
    if (email === "client@example.com" && password === "client123") {
      const mockClient = {
        id: "client-001",
        name: "Demo Client",
        email: "client@example.com",
        role: "client",
        organizationId: "org-103-software",
        clientId: "client-001",
        projectId: null,
        createdAt: new Date().toISOString(),
      };
      
      const token = "mock-token-" + Date.now();
      res.json({
        token,
        user: mockClient,
      });
      return;
    }

    // Try database authentication if available
    if (db) {
      const clientAccount = await db
        .select({
          account: clientAccounts,
          clientName: clients.name,
        })
        .from(clientAccounts)
        .innerJoin(clients, eq(clients.id, clientAccounts.clientId))
        .where(eq(clientAccounts.email, email))
        .limit(1);

      if (!clientAccount[0] || clientAccount[0].account.passwordHash !== hashPassword(password)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      if (!clientAccount[0].account.isActive) {
        res.status(401).json({ error: "Account is inactive" });
        return;
      }

      const token = generateToken(clientAccount[0].account.id, clientAccount[0].account.email, "client");
      res.json({
        token,
        user: {
          id: clientAccount[0].account.id,
          name: clientAccount[0].clientName,
          email: clientAccount[0].account.email,
          role: "client",
          organizationId: clientAccount[0].account.organizationId,
          clientId: clientAccount[0].account.clientId,
          projectId: clientAccount[0].account.projectId,
          createdAt: clientAccount[0].account.createdAt.toISOString(),
          accountType: "client",
        },
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const authType = req.authType;
    
    // Return mock user for development when database is not available
    if (authType === "client") {
      const account = req.clientAccount;
      if (account) {
        const clientRow = db ? await db.select().from(clients).where(eq(clients.id, account.clientId)).limit(1) : null;
        res.json({
          id: account.id,
          name: clientRow?.[0]?.name ?? "Client",
          email: account.email,
          role: "client",
          organizationId: account.organizationId,
          clientId: account.clientId,
          projectId: account.projectId,
          createdAt: account.createdAt.toISOString(),
          accountType: "client",
        });
      } else {
        res.json({
          id: "client-001",
          name: "Client User",
          email: "client@example.com",
          role: "client",
          organizationId: "org-103-software",
          clientId: "client-001",
          projectId: null,
          createdAt: new Date().toISOString(),
          accountType: "client",
        });
      }
      return;
    }
    
    const user = req.user;
    if (user) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt.toISOString(),
        accountType: "staff",
      });
    } else {
      res.json({
        id: "user-admin-001",
        name: "Alex Johnson",
        email: "admin@103software.com",
        role: "admin",
        organizationId: "org-103-software",
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Return mock user for development
    res.json({
      id: "user-admin-001",
      name: "Alex Johnson",
      email: "admin@103software.com",
      role: "admin",
      organizationId: "org-103-software",
      createdAt: new Date().toISOString(),
    });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
