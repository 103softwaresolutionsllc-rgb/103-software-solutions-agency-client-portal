import { db } from "@workspace/db";
import { activityLogs } from "@workspace/db/schema";

export async function logActivity(params: {
  action: string;
  entityType: string;
  entityId?: number;
  description: string;
  userId?: number;
  organizationId: number;
}) {
  try {
    await db.insert(activityLogs).values({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      description: params.description,
      userId: params.userId ?? null,
      organizationId: params.organizationId,
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
