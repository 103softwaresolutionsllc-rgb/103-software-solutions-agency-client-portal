import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, requireAuth } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user[0] || user[0].passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = generateToken(user[0].id, user[0].email);
    res.json({
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        role: user[0].role,
        organizationId: user[0].organizationId,
        createdAt: user[0].createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
