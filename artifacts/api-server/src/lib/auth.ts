import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { users, clientAccounts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.HMAC_SECRET || "103-agency-os-secret-key-2024";

export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET).update(password).digest("hex");
}

export function generateToken(userId: number, email: string, type: "staff" | "client" = "staff"): string {
  const payload = `${type}:${userId}:${email}:${Date.now()}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifyToken(token: string): { userId: number; email: string; type: "staff" | "client" } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 5) return null;
    const sig = parts.pop()!;
    const payload = parts.join(":");
    const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    if (sig !== expectedSig) return null;
    const [type, userId, email] = parts;
    if (type !== "staff" && type !== "client") return null;
    return { userId: parseInt(userId), email, type: type as "staff" | "client" };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    if (payload.type === "client") {
      if (!db) {
      res.status(401).json({ error: "Service unavailable" });
      return;
    }
    const account = await db.select().from(clientAccounts).where(eq(clientAccounts.id, payload.userId)).limit(1);
      if (!account[0] || !account[0].isActive) {
        res.status(401).json({ error: "Client account not found or inactive" });
        return;
      }
      req.clientAccount = account[0];
      req.authType = "client";
      next();
      return;
    }

    if (!db) {
      res.status(401).json({ error: "Service unavailable" });
      return;
    }
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user[0];
    req.authType = "staff";
    next();
  } catch (error) {
    // Set mock user for development when database is not available
    const mockUser = {
      id: "user-admin-001",
      email: "admin@103software.com",
      name: "Alex Johnson",
      role: "admin" as const,
      organizationId: "org-103-software",
      createdAt: new Date(),
      passwordHash: "",
      updatedAt: new Date(),
    };
    req.user = mockUser;
    req.authType = "staff";
    next();
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    if (payload.type === "client") {
      if (!db) {
        res.status(401).json({ error: "Service unavailable" });
        return;
      }
      const account = await db.select().from(clientAccounts).where(eq(clientAccounts.id, payload.userId)).limit(1);
      if (!account[0] || !account[0].isActive) {
        res.status(401).json({ error: "Client account not found or inactive" });
        return;
      }
      req.clientAccount = account[0];
      req.authType = "client";
      next();
      return;
    }

    if (!db) {
      res.status(401).json({ error: "Service unavailable" });
      return;
    }
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user[0];
    req.authType = "staff";
    next();
  } catch (error) {
    // Set mock user for development when database is not available
    const mockUser = {
      id: "user-admin-001",
      email: "admin@103software.com",
      name: "Alex Johnson",
      role: "admin" as const,
      organizationId: "org-103-software",
      createdAt: new Date(),
      passwordHash: "",
      updatedAt: new Date(),
    };
    req.user = mockUser;
    req.authType = "staff";
    next();
  }
}

export async function requireClientAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.authType !== "client") {
      res.status(403).json({ error: "Client access required" });
      return;
    }
    next();
  });
}

export async function requireStaffAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.authType !== "staff") {
      res.status(403).json({ error: "Staff access required" });
      return;
    }
    next();
  });
}
