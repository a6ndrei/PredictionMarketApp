import { eq, and, desc, sql } from "drizzle-orm";
import * as crypto from "crypto";
import db from "../db";
import { usersTable, marketsTable, marketOutcomesTable, betsTable } from "../db/schema";
import { hashPassword, verifyPassword, type AuthTokenPayload } from "../lib/auth";
import {
  validateRegistration,
  validateLogin,
  validateMarketCreation,
  validateBet,
} from "../lib/validation";

type JwtSigner = {
  sign: (payload: AuthTokenPayload) => Promise<string>;
};

export async function handleRegister({
  body,
  jwt,
  set,
}: {
  body: { username: string; email: string; password: string };
  jwt: JwtSigner;
  set: any;
}) {
  const { username, email, password } = body;
  const errors = validateRegistration(username, email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const existingUser = await db.query.usersTable.findFirst({
    where: (users, { or, eq }) => or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    set.status = 409;
    return { errors: [{ field: "email", message: "User already exists" }] };
  }

  const passwordHash = await hashPassword(password);

  const [userRow] = await db.insert(usersTable).values({ username, email, passwordHash }).returning();
  if (!userRow) throw new Error("Failed to create user");

  const token = await jwt.sign({ userId: userRow.id });

  set.status = 201;
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    token,
  };
}

export async function handleLogin({
  body,
  jwt,
  set,
}: {
  body: { email: string; password: string };
  jwt: JwtSigner;
  set: any;
}) {
  const { email, password } = body;
  const errors = validateLogin(email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    set.status = 401;
    return { error: "Invalid email or password" };
  }

  const token = await jwt.sign({ userId: user.id });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    token,
  };
}

export async function handleCreateMarket({
  body,
  set,
  user,
}: {
  body: { title: string; description?: string; outcomes: string[] };
  set: any;
  user: typeof usersTable.$inferSelect;
}) {
  const { title, description, outcomes } = body;
  const errors = validateMarketCreation(title, description || "", outcomes);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const [marketRow] = await db
    .insert(marketsTable)
    .values({
      title,
      description: description || null,
      createdBy: user.id,
    })
    .returning();
  if (!marketRow) throw new Error("Failed to create market");

  const outcomeIds = await db
    .insert(marketOutcomesTable)
    .values(
      outcomes.map((title: string, index: number) => ({
        marketId: marketRow.id,
        title,
        position: index,
      })),
    )
    .returning();

  set.status = 201;
  return {
    id: marketRow.id,
    title: marketRow.title,
    description: marketRow.description,
    status: marketRow.status,
    outcomes: outcomeIds,
  };
}

export async function handleListMarkets({ query }: { query: { status?: string, sort?: string, page?: string } }) {
  const statusFilter = query.status || "active";
  const sortBy = query.sort || "date";
  const limit = 20;
  const page = parseInt(query.page || "1");
  const offset = (page - 1) * limit;

  const markets = await db.query.marketsTable.findMany({
    where: eq(marketsTable.status, statusFilter as "active" | "resolved"),
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
      bets: true
    },
    
    orderBy: (markets, { desc }) => desc(markets.createdAt)
  });

  const enrichedMarkets = await Promise.all(
    markets.map(async (market) => {
      const betsPerOutcome = await Promise.all(
        market.outcomes.map(async (outcome) => {
          const totalBets = await db
            .select()
            .from(betsTable)
            .where(eq(betsTable.outcomeId, outcome.id));

          const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
          return { outcomeId: outcome.id, totalBets: totalAmount };
        }),
      );

      const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);

      return {
        id: market.id,
        title: market.title,
        status: market.status,
        createdAt: market.createdAt,
        creator: market.creator?.username,
        participants: new Set(market.bets?.map((b: any) => b.userId) || []).size,
        outcomes: market.outcomes.map((outcome) => {
          const outcomeBets =
            betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
          const odds =
            totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

          return {
            id: outcome.id,
            title: outcome.title,
            odds,
            totalBets: outcomeBets,
          };
        }),
        totalMarketBets,
      };
    }),
  );

  if (sortBy === "totalBets") {
    enrichedMarkets.sort((a: any, b: any) => b.totalMarketBets - a.totalMarketBets);
  } else if (sortBy === "participants") {
    enrichedMarkets.sort((a: any, b: any) => b.participants - a.participants);
  } else {
    enrichedMarkets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const paginatedMarkets = enrichedMarkets.slice(offset, offset + limit);

  return {
    markets: paginatedMarkets,
    totalCount: enrichedMarkets.length,
    totalPages: Math.ceil(enrichedMarkets.length / limit),
    page
  };
}

export async function handleGetMarket({
  params,
  set,
}: {
  params: { id: number };
  set: any;
}) {
  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
    },
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  const betsPerOutcome = await Promise.all(
    market.outcomes.map(async (outcome) => {
      const totalBets = await db
        .select()
        .from(betsTable)
        .where(eq(betsTable.outcomeId, outcome.id));

      const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
      return { outcomeId: outcome.id, totalBets: totalAmount };
    }),
  );

  const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);

  return {
    id: market.id,
    title: market.title,
    description: market.description,
    status: market.status,
    creator: market.creator?.username,
    outcomes: market.outcomes.map((outcome) => {
      const outcomeBets = betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
      const odds =
        totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

      return {
        id: outcome.id,
        title: outcome.title,
        odds,
        totalBets: outcomeBets,
      };
    }),
    totalMarketBets,
  };
}

export async function handlePlaceBet({
  params,
  body,
  set,
  user,
}: {
  params: { id: number };
  body: { outcomeId: number; amount: number };
  set: any;
  user: typeof usersTable.$inferSelect;
}) {
  const marketId = params.id;
  const { outcomeId, amount } = body;
  const errors = validateBet(amount);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  if (user.balance < Number(amount)) {
    set.status = 400;
    return { error: "Insufficient balance." };
  }

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status !== "active") {
    set.status = 400;
    return { error: "Market is not active" };
  }

  const outcome = await db.query.marketOutcomesTable.findFirst({
    where: and(eq(marketOutcomesTable.id, outcomeId), eq(marketOutcomesTable.marketId, marketId)),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  const bet = await db.transaction(async (tx) => {
    await tx.update(usersTable)
      .set({ balance: user.balance - Number(amount) })
      .where(eq(usersTable.id, user.id));

    const newBet = await tx
      .insert(betsTable)
      .values({
        userId: user.id,
        marketId,
        outcomeId,
        amount: Number(amount),
      })
      .returning();

    return newBet[0];
  });

  if (!bet) {
    set.status = 500;
    return { error: "Failed to place bet" };
  }

  set.status = 201;
  return {
    id: bet.id,
    userId: bet.userId,
    marketId: bet.marketId,
    outcomeId: bet.outcomeId,
    amount: bet.amount,
  };
}

export async function handleGenerateApiKey({ user }: { user: typeof usersTable.$inferSelect }) {
  const token = crypto.randomUUID();
  await db.update(usersTable).set({ apiToken: token }).where(eq(usersTable.id, user.id));
  return { apiToken: token };
}

export async function handleGetMe({ user }: { user: typeof usersTable.$inferSelect }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
    totalWinnings: user.totalWinnings,
    apiToken: user.apiToken
  };
}

export async function handleGetLeaderboard() {
  const topUsers = await db.query.usersTable.findMany({
    orderBy: (users, { desc }) => desc(users.totalWinnings),
    limit: 20,
    columns: {
      id: true,
      username: true,
      totalWinnings: true,
      balance: true
    }
  });
  return topUsers;
}

export async function handleResolveMarket({
  params,
  body,
  set,
  user
}: {
  params: { id: number };
  body: { outcomeId: number };
  set: any;
  user: typeof usersTable.$inferSelect;
}) {
  if (user.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden: Admins only" };
  }

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: { bets: true }
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status === "resolved") {
    set.status = 400;
    return { error: "Market is already resolved" };
  }

  const result = await db.transaction(async (tx) => {
    await tx.update(marketsTable)
      .set({ status: "resolved", resolvedOutcomeId: body.outcomeId })
      .where(eq(marketsTable.id, params.id));

    const totalPool = market.bets.reduce((sum: number, b: any) => sum + b.amount, 0);
    const winningBets = market.bets.filter((b: any) => b.outcomeId === body.outcomeId);
    const winningPool = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);

    if (winningPool > 0) {
      for (const bet of winningBets) {
        const userPoolShare = bet.amount / winningPool;
        const payout = totalPool * userPoolShare;

        const bettor = await tx.query.usersTable.findFirst({ where: eq(usersTable.id, bet.userId) });
        if (bettor) {
          await tx.update(usersTable)
            .set({
              balance: bettor.balance + payout,
              totalWinnings: bettor.totalWinnings + payout
            })
            .where(eq(usersTable.id, bet.userId));
        }
      }
    }

    return { success: true, message: "Market resolved and payouts distributed." };
  });

  return result;
}

export async function handleArchiveMarket({
  params,
  set,
  user
}: {
  params: { id: number };
  set: any;
  user: typeof usersTable.$inferSelect;
}) {
  if (user.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden: Admins only" };
  }

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: { bets: true }
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status === "resolved") {
    set.status = 400;
    return { error: "Market already resolved" };
  }

  await db.transaction(async (tx) => {
    await tx.update(marketsTable)
      .set({ status: "resolved", resolvedOutcomeId: null })
      .where(eq(marketsTable.id, params.id));

    for (const bet of market.bets) {
      const bettor = await tx.query.usersTable.findFirst({ where: eq(usersTable.id, bet.userId) });
      if (bettor) {
        await tx.update(usersTable)
          .set({ balance: bettor.balance + bet.amount })
          .where(eq(usersTable.id, bet.userId));
      }
    }
  });

  return { success: true, message: "Market archived and bets refunded." };
}

export async function handleGetUserBets({
  query,
  user
}: {
  query: { status?: string, page?: string };
  user: typeof usersTable.$inferSelect;
}) {
  const statusFilter = query.status || "active";
  const limit = 20;
  const page = parseInt(query.page || "1");
  const offset = (page - 1) * limit;

  const userBets = await db.select({
    bet: betsTable,
    market: marketsTable,
    outcome: marketOutcomesTable,
  })
    .from(betsTable)
    .innerJoin(marketsTable, eq(betsTable.marketId, marketsTable.id))
    .innerJoin(marketOutcomesTable, eq(betsTable.outcomeId, marketOutcomesTable.id))
    .where(and(eq(betsTable.userId, user.id), eq(marketsTable.status, statusFilter as "active" | "resolved")))
    .orderBy(desc(betsTable.createdAt))
    .limit(limit)
    .offset(offset);

  return userBets;
}
