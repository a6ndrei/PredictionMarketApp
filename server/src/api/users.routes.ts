import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  handleGetMe,
  handleGetUserBets,
  handleGenerateApiKey,
  handleGetLeaderboard
} from "./handlers";

export const userRoutes = new Elysia({ prefix: "/api/users" })
  .get("/leaderboard", handleGetLeaderboard)
  .use(authMiddleware)
  .guard(
    {
      beforeHandle({ user, set }) {
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
      },
    },
    (app) => app
      .derive(({ user }) => ({ user: user! }))
      .get("/me", handleGetMe)
      .get("/me/bets", handleGetUserBets, {
        query: t.Object({
          status: t.Optional(t.String()),
          page: t.Optional(t.String()),
        }),
      })
      .post("/me/api-key", handleGenerateApiKey)
  );
