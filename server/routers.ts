import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import axios from "axios";

const GROW_API_BASE = "https://api.groww.in/v1/";
const GROW_API_HEADERS = (accessToken: string) => ({
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

async function fetchGrowPortfolio(accessToken: string) {
  try {
    const response = await axios.get(`${GROW_API_BASE}portfolio`, {
      headers: GROW_API_HEADERS(accessToken),
    });
    return response.data;
  } catch (error) {
    console.error("[Grow API] Failed to fetch portfolio:", error);
    throw error;
  }
}

async function fetchGrowPositions(accessToken: string) {
  try {
    const response = await axios.get(`${GROW_API_BASE}positions`, {
      headers: GROW_API_HEADERS(accessToken),
    });
    return response.data;
  } catch (error) {
    console.error("[Grow API] Failed to fetch positions:", error);
    throw error;
  }
}

async function fetchGrowOrderHistory(accessToken: string, limit = 50) {
  try {
    const response = await axios.get(`${GROW_API_BASE}order/list?page_size=${limit}`, {
      headers: GROW_API_HEADERS(accessToken),
    });
    return response.data;
  } catch (error) {
    console.error("[Grow API] Failed to fetch order history:", error);
    throw error;
  }
}

async function fetchGrowPnL(accessToken: string) {
  try {
    const response = await axios.get(`${GROW_API_BASE}portfolio/pnl`, {
      headers: GROW_API_HEADERS(accessToken),
    });
    return response.data;
  } catch (error) {
    console.error("[Grow API] Failed to fetch P&L:", error);
    throw error;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Portfolio management
  portfolio: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getUserPortfolios(ctx.user.id)
    ),
    add: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        quantity: z.number(),
        buyPrice: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addPortfolioItem({
          userId: ctx.user.id,
          symbol: input.symbol,
          quantity: input.quantity,
          buyPrice: Math.round(input.buyPrice * 100),
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePortfolioItem(input.itemId, ctx.user.id);
        return { success: true };
      }),
  }),

  // AI Analysis history
  analysis: router({
    history: protectedProcedure.query(({ ctx }) =>
      db.getUserAnalyses(ctx.user.id)
    ),
    save: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        fearScore: z.number().min(1).max(10),
        analysis: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.saveAnalysis({
          userId: ctx.user.id,
          symbol: input.symbol,
          fearScore: input.fearScore,
          analysis: input.analysis,
        });
        return { success: true };
      }),
  }),

  // Fear Profile
  fearProfile: router({
    get: protectedProcedure.query(({ ctx }) =>
      db.getUserFearProfile(ctx.user.id)
    ),
    save: protectedProcedure
      .input(z.object({
        riskTolerance: z.number().min(1).max(10),
        investmentStyle: z.string(),
        fearLevel: z.number().min(1).max(10),
        profileData: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.saveFearProfile({
          userId: ctx.user.id,
          riskTolerance: input.riskTolerance,
          investmentStyle: input.investmentStyle,
          fearLevel: input.fearLevel,
          profileData: input.profileData,
        });
        return { success: true };
      }),
  }),

  // Payment management
  payment: router({
    createCheckout: protectedProcedure
      .input(z.object({
        planType: z.string(),
        amount: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stripePaymentId = `pi_${Date.now()}_${ctx.user.id}`;
        await db.createPayment({
          userId: ctx.user.id,
          stripePaymentId,
          amount: Math.round(input.amount * 100),
          currency: "USD",
          planType: input.planType,
          status: "pending",
        });
        return { paymentId: stripePaymentId, success: true };
      }),
  }),

  // Grow API integration
  grow: router({
    // Check if user has linked Grow account
    status: protectedProcedure.query(async ({ ctx }) => {
      const account = await db.getUserGrowAccount(ctx.user.id);
      if (!account || account.isActive !== "active") {
        return { connected: false };
      }
      return {
        connected: true,
        userName: account.userName,
        lastSyncAt: account.lastSyncAt?.toISOString(),
      };
    }),

    // Link Grow account
    connect: protectedProcedure
      .input(z.object({
        accessToken: z.string(),
        userName: z.string().optional(),
        userEmail: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Validate token by fetching profile
          await fetchGrowPortfolio(input.accessToken);
          await db.saveGrowAccount({
            userId: ctx.user.id,
            accessToken: input.accessToken,
            userName: input.userName || null,
            userEmail: input.userEmail || null,
          });
          return { success: true };
        } catch (error) {
          console.error("[Grow] Failed to connect:", error);
          throw new Error("Invalid access token");
        }
      }),

    // Disconnect Grow account
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await db.disconnectGrowAccount(ctx.user.id);
      return { success: true };
    }),

    // Get portfolio from Grow
    getPortfolio: protectedProcedure.query(async ({ ctx }) => {
      const account = await db.getUserGrowAccount(ctx.user.id);
      if (!account || account.isActive !== "active") {
        throw new Error("Grow account not connected");
      }
      const portfolio = await fetchGrowPortfolio(account.accessToken);
      await db.updateGrowAccountSync(ctx.user.id);
      return portfolio;
    }),

    // Get positions from Grow
    getPositions: protectedProcedure.query(async ({ ctx }) => {
      const account = await db.getUserGrowAccount(ctx.user.id);
      if (!account || account.isActive !== "active") {
        throw new Error("Grow account not connected");
      }
      const positions = await fetchGrowPositions(account.accessToken);
      await db.updateGrowAccountSync(ctx.user.id);
      return positions;
    }),

    // Get order history from Grow
    getOrders: protectedProcedure.query(async ({ ctx }) => {
      const account = await db.getUserGrowAccount(ctx.user.id);
      if (!account || account.isActive !== "active") {
        throw new Error("Grow account not connected");
      }
      const orders = await fetchGrowOrderHistory(account.accessToken);
      await db.updateGrowAccountSync(ctx.user.id);
      return orders;
    }),

    // Get P&L from Grow
    getPnL: protectedProcedure.query(async ({ ctx }) => {
      const account = await db.getUserGrowAccount(ctx.user.id);
      if (!account || account.isActive !== "active") {
        throw new Error("Grow account not connected");
      }
      const pnl = await fetchGrowPnL(account.accessToken);
      await db.updateGrowAccountSync(ctx.user.id);
      return pnl;
    }),
  }),
});

export type AppRouter = typeof appRouter;
