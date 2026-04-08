import { Elysia } from "elysia";
import { getUserById, getUserByApiToken } from "../lib/auth";

import { jwtPlugin } from "../plugins/jwt";

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(jwtPlugin)
  .derive(async ({ headers, jwt }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authHeader.substring(7);

    
    const payload = await jwt.verify(token) as { userId?: number };
    if (payload && payload.userId) {
      const user = await getUserById(payload.userId);
      return { user };
    }

  
    const apiUser = await getUserByApiToken(token);
    if (apiUser) {
      return { user: apiUser };
    }

    return { user: null };
  })
  .as("global");
