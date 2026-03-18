import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.HMAC_SECRET || "103-agency-os-secret-key-2024";

export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET).update(password).digest("hex");
}

export function generateToken(userId: number, email: string): string {
  const payload = `${userId}:${email}:${Date.now()}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 4) return null;
    const sig = parts.pop()!;
    const payload = parts.join(":");
    const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    if (sig !== expectedSig) return null;
    const [userId, email] = parts;
    return { userId: parseInt(userId), email };
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
  const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user[0]) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  (req as any).user = user[0];
  next();
}
