import type { User, ClientAccount } from "@workspace/db/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      clientAccount?: ClientAccount;
      authType?: "staff" | "client";
    }
  }
}

export {};
