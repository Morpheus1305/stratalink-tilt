import type {
  DashboardData,
  TimeSeriesData,
  TrendsData,
  LiveMetric,
  LiquidityScore,
  StressSignal,
  KeyMetric,
  ExchangeData,
  CexDexDistribution,
  TickerItem,
  TimeSeriesPoint,
  PortfolioData,
  AlertsData,
  ScorecardData,
  User,
  CommentaryDelta,
} from "@shared/schema";
import { users, otpCodes, loginAttempts } from "@shared/schema";

export type CommentarySnapshot = {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  snapshotDate: string; // YYYY-MM-DD
  executionRiskScore: number;
  maxSize25bps: number;
  maxSize50bps: number;
  slippageRegime: string;
  dominantFactor: string;
  marketStructureRegime: string;
  executionSummaryBullets: string[];
  bestVenue: string;
  generatedAt: number;
};

import { db } from "./db";
import { eq } from "drizzle-orm";
import { web3DataService } from "./apiClients";

type UserRole = User["role"];

function normalizeUserRole(role: unknown): UserRole {
  if (role === "viewer" || role === "admin" || role === "analyst") return role;
  return "viewer";
}

function normalizeTwoFactorMethod(m: unknown): "email" | "totp" | null {
  if (m === "email" || m === "totp") return m;
  return null;
}

export interface IStorage {
  getDashboardData(asset?: string): Promise<DashboardData>;
  getTimeSeriesData(timeframe: string, asset?: string): Promise<TimeSeriesData>;
  getTrendsData(
    timeframe: "1D" | "7D" | "1M" | "3M" | "1Y",
    asset?: string,
  ): Promise<TrendsData>;
  getPortfolioData(asset?: string): Promise<PortfolioData>;
  getAlertsData(asset?: string): Promise<AlertsData>;
  getScorecardData(
    metricType: "tokenomics" | "liquidity",
    asset?: string,
  ): Promise<ScorecardData>;

  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: Omit<User, "id" | "createdAt">): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  storeOTP(userId: string, otp: string, expiresAt: Date): Promise<void>;
  verifyOTP(userId: string, otp: string): Promise<boolean>;
  clearOTP(userId: string): Promise<void>;
  incrementLoginAttempts(userId: string): Promise<number>;
  resetLoginAttempts(userId: string): Promise<void>;
  isUserLocked(userId: string): Promise<boolean>;

  saveCommentarySnapshot(
    snapshot: Omit<CommentarySnapshot, "id">,
  ): Promise<CommentarySnapshot>;
  getLatestSnapshot(
    symbol: string,
    side: "buy" | "sell",
  ): Promise<CommentarySnapshot | null>;
  getPriorSnapshot(
    symbol: string,
    side: "buy" | "sell",
    beforeDate: string,
  ): Promise<CommentarySnapshot | null>;
}

export class MemStorage implements IStorage {
  private useLiveData: boolean = true;

  private commentarySnapshots: CommentarySnapshot[] = [];
  private snapshotIdCounter: number = 1;

  // -------------------- (everything above your auth methods unchanged) --------------------
  // NOTE: I’m not re-commenting each section; this is your file + minimal patches only.

  private async fetchLiveMetrics(asset: string = "BTC"): Promise<LiveMetric[] | null> {
    if (!this.useLiveData) return null;

    try {
      const [priceData, orderBook] = await Promise.all([
        web3DataService.getCryptoPrice(asset),
        web3DataService.getOrderBookDepth(asset),
      ]);

      const volatility = Math.abs(priceData.change24h);
      const cexDexRatio = 68;

      const poliScore = web3DataService.calculatePoLiScore({
        depth: orderBook.depthUSD,
        spread: orderBook.spread,
        volatility: volatility,
        cexDexRatio: cexDexRatio,
      });

      return [
        {
          label: "POLI SCORE",
          value: `${poliScore}/100`,
          change: poliScore >= 72 ? 1.7 : -1.2,
          changePercent: poliScore >= 72 ? 2.4 : -1.8,
          trend: poliScore >= 72 ? "up" : "down",
        },
        {
          label: "MARKET DEPTH",
          value: `$${orderBook.depthUSD.toFixed(1)}M`,
          change: 3.5,
          changePercent: 8.2,
          trend: "up",
        },
        {
          label: "BID-ASK SPREAD",
          value: `${orderBook.spread.toFixed(2)}%`,
          change: -0.002,
          changePercent: -2.1,
          trend: "down",
        },
        {
          label: "VOLATILITY 24H",
          value: `${volatility.toFixed(1)}%`,
          change: volatility >= 12 ? 1.9 : -1.3,
          changePercent: volatility >= 12 ? 15.3 : -8.5,
          trend: volatility >= 12 ? "up" : "down",
        },
        {
          label: "CEX/DEX RATIO",
          value: `${cexDexRatio}:${100 - cexDexRatio}`,
          change: -2.2,
          changePercent: -3.2,
          trend: "down",
        },
        {
          label: "TOTAL VOL 24H",
          value: `$${(priceData.volume24h / 1e9).toFixed(1)}B`,
          change: 154,
          changePercent: 12.9,
          trend: "up",
        },
      ];
    } catch (error) {
      console.error("Error fetching live metrics, falling back to mock data:", error);
      return null;
    }
  }

  // -------------------- your generators unchanged (omitted here for brevity) --------------------
  // KEEP ALL YOUR EXISTING generator methods exactly as you pasted them.
  // (No need to rewrite them; only auth methods below are patched.)

  // ========================================
  // Authentication Methods (PATCHED)
  // ========================================

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) return null;

    return {
      ...user,
      role: normalizeUserRole(user.role),
      twoFactorMethod: normalizeTwoFactorMethod(user.twoFactorMethod),
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) return null;

    return {
      ...user,
      role: normalizeUserRole(user.role),
      twoFactorMethod: normalizeTwoFactorMethod(user.twoFactorMethod),
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    };
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: normalizeUserRole(user.role),
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        totpSecret: user.totpSecret,
        backupCodes: user.backupCodes,
      })
      .returning();

    return {
      ...newUser,
      role: normalizeUserRole(newUser.role),
      twoFactorMethod: normalizeTwoFactorMethod(newUser.twoFactorMethod),
      createdAt: newUser.createdAt.toISOString(),
      lastLogin: newUser.lastLogin ? newUser.lastLogin.toISOString() : null,
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const updateData: any = {};

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = normalizeUserRole(updates.role);
    if (updates.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = updates.twoFactorEnabled;
    if (updates.twoFactorMethod !== undefined) updateData.twoFactorMethod = updates.twoFactorMethod;
    if (updates.totpSecret !== undefined) updateData.totpSecret = updates.totpSecret;
    if (updates.backupCodes !== undefined) updateData.backupCodes = updates.backupCodes;

    // ✅ PATCH: null-safe lastLogin
    if (updates.lastLogin !== undefined) {
      updateData.lastLogin = updates.lastLogin ? new Date(updates.lastLogin) : null;
    }

    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

    if (!updatedUser) throw new Error("User not found");

    return {
      ...updatedUser,
      role: normalizeUserRole(updatedUser.role),
      twoFactorMethod: normalizeTwoFactorMethod(updatedUser.twoFactorMethod),
      createdAt: updatedUser.createdAt.toISOString(),
      lastLogin: updatedUser.lastLogin ? updatedUser.lastLogin.toISOString() : null,
    };
  }

  // -------------------- OTP + login attempts unchanged --------------------
  // KEEP your existing implementations as-is below this point.

  async storeOTP(userId: string, otp: string, expiresAt: Date): Promise<void> {
    await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
    await db.insert(otpCodes).values({ userId, otp, expiresAt });
  }

  async verifyOTP(userId: string, otp: string): Promise<boolean> {
    const [stored] = await db.select().from(otpCodes).where(eq(otpCodes.userId, userId)).limit(1);
    if (!stored) return false;

    if (new Date() > stored.expiresAt) {
      await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
      return false;
    }

    return stored.otp === otp;
  }

  async clearOTP(userId: string): Promise<void> {
    await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
  }

  async incrementLoginAttempts(userId: string): Promise<number> {
    const [existing] = await db.select().from(loginAttempts).where(eq(loginAttempts.userId, userId)).limit(1);

    let newCount = 1;
    let lockedUntil = null;

    if (existing) {
      newCount = parseInt(existing.count) + 1;
      if (newCount >= 5) lockedUntil = new Date(Date.now() + 10 * 60 * 1000);

      await db
        .update(loginAttempts)
        .set({ count: newCount.toString(), lockedUntil, updatedAt: new Date() })
        .where(eq(loginAttempts.userId, userId));
    } else {
      await db.insert(loginAttempts).values({ userId, count: newCount.toString(), lockedUntil: null });
    }

    return newCount;
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await db.delete(loginAttempts).where(eq(loginAttempts.userId, userId));
  }

  async isUserLocked(userId: string): Promise<boolean> {
    const [attempt] = await db.select().from(loginAttempts).where(eq(loginAttempts.userId, userId)).limit(1);
    if (!attempt || !attempt.lockedUntil) return false;

    if (new Date() > attempt.lockedUntil) {
      await db.delete(loginAttempts).where(eq(loginAttempts.userId, userId));
      return false;
    }
    return true;
  }

  // Commentary snapshot methods (unchanged)
  async saveCommentarySnapshot(snapshot: Omit<CommentarySnapshot, "id">): Promise<CommentarySnapshot> {
    const newSnapshot: CommentarySnapshot = { ...snapshot, id: this.snapshotIdCounter++ };

    const existingIdx = this.commentarySnapshots.findIndex(
      (s) => s.symbol === snapshot.symbol && s.side === snapshot.side && s.snapshotDate === snapshot.snapshotDate,
    );

    if (existingIdx >= 0) {
      this.commentarySnapshots[existingIdx] = { ...newSnapshot, id: this.commentarySnapshots[existingIdx].id };
      return this.commentarySnapshots[existingIdx];
    }

    this.commentarySnapshots.push(newSnapshot);
    return newSnapshot;
  }

  async getLatestSnapshot(symbol: string, side: "buy" | "sell"): Promise<CommentarySnapshot | null> {
    const matching = this.commentarySnapshots
      .filter((s) => s.symbol === symbol && s.side === side)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate));
    return matching[0] || null;
  }

  async getPriorSnapshot(symbol: string, side: "buy" | "sell", beforeDate: string): Promise<CommentarySnapshot | null> {
    const matching = this.commentarySnapshots
      .filter((s) => s.symbol === symbol && s.side === side && s.snapshotDate < beforeDate)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate));
    return matching[0] || null;
  }
}

export const storage = new MemStorage();