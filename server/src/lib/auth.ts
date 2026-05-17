import { usersTable } from "../db/schema";
import db from "../db";
import { eq } from "drizzle-orm";

export interface AuthTokenPayload {
  userId: number;
}


export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}


export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}


export async function getUserById(userId: number): Promise<typeof usersTable.$inferSelect | null> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  return user ?? null;
}


export async function getUserByApiToken(token: string): Promise<typeof usersTable.$inferSelect | null> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.apiToken, token) });
  return user ?? null;
}
