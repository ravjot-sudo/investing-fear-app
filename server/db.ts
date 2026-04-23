import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, portfolios, analyses, payments, fearProfiles, growAccounts, InsertPortfolio, InsertAnalysis, InsertPayment, InsertFearProfile, InsertGrowAccount } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Portfolio queries
export async function getUserPortfolios(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(portfolios).where(eq(portfolios.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get portfolios:", error);
    return [];
  }
}

export async function addPortfolioItem(item: InsertPortfolio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(portfolios).values(item);
  } catch (error) {
    console.error("[Database] Failed to add portfolio item:", error);
    throw error;
  }
}

export async function deletePortfolioItem(itemId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.delete(portfolios).where(and(eq(portfolios.id, itemId), eq(portfolios.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to delete portfolio item:", error);
    throw error;
  }
}

// Analysis queries
export async function saveAnalysis(analysis: InsertAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(analyses).values(analysis);
  } catch (error) {
    console.error("[Database] Failed to save analysis:", error);
    throw error;
  }
}

export async function getUserAnalyses(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(analyses).where(eq(analyses.userId, userId)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get analyses:", error);
    return [];
  }
}

// Payment queries
export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(payments).values(payment);
  } catch (error) {
    console.error("[Database] Failed to create payment:", error);
    throw error;
  }
}

export async function updatePaymentStatus(stripePaymentId: string, status: "pending" | "completed" | "failed" | "refunded") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(payments).set({ status }).where(eq(payments.stripePaymentId, stripePaymentId));
  } catch (error) {
    console.error("[Database] Failed to update payment status:", error);
    throw error;
  }
}

// Fear Profile queries
export async function saveFearProfile(profile: InsertFearProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(fearProfiles).values(profile);
  } catch (error) {
    console.error("[Database] Failed to save fear profile:", error);
    throw error;
  }
}

export async function getUserFearProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(fearProfiles).where(eq(fearProfiles.userId, userId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get fear profile:", error);
    return null;
  }
}

// Grow Account queries
export async function saveGrowAccount(account: InsertGrowAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(growAccounts).values(account).onDuplicateKeyUpdate({
      set: {
        accessToken: account.accessToken,
        userName: account.userName,
        userEmail: account.userEmail,
        isActive: "active",
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to save Grow account:", error);
    throw error;
  }
}

export async function getUserGrowAccount(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(growAccounts).where(eq(growAccounts.userId, userId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get Grow account:", error);
    return null;
  }
}

export async function updateGrowAccountSync(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(growAccounts).set({ lastSyncAt: new Date() }).where(eq(growAccounts.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to update Grow sync:", error);
    throw error;
  }
}

export async function disconnectGrowAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(growAccounts).set({ isActive: "inactive" }).where(eq(growAccounts.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to disconnect Grow account:", error);
    throw error;
  }
}
