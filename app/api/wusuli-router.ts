import { z } from "zod";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  prayerRecords,
  quranBookmarks,
  quranProgress,
  quranDailyLog,
  azkarProgress,
  favoriteAzkar,
  tasbeehState,
  deeds,
  ramadanLogs,
  goals,
  userSettings,
  users,
} from "@db/schema";

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const prayerEnum = z.enum(["fajr", "dhuhr", "asr", "maghrib", "isha"]);

// ---------- Prayer tracker ----------
export const trackerRouter = createRouter({
  getDay: authedQuery.input(z.object({ day: daySchema })).query(async ({ ctx, input }) => {
    const rows = await getDb()
      .select({ prayer: prayerRecords.prayer })
      .from(prayerRecords)
      .where(and(eq(prayerRecords.userId, ctx.user.id), eq(prayerRecords.day, input.day)));
    return rows.map((r) => r.prayer);
  }),

  toggle: authedQuery
    .input(z.object({ day: daySchema, prayer: prayerEnum }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select({ id: prayerRecords.id })
        .from(prayerRecords)
        .where(
          and(
            eq(prayerRecords.userId, ctx.user.id),
            eq(prayerRecords.day, input.day),
            eq(prayerRecords.prayer, input.prayer),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        await db.delete(prayerRecords).where(eq(prayerRecords.id, existing[0].id));
        return { completed: false };
      }
      await db.insert(prayerRecords).values({
        userId: ctx.user.id,
        day: input.day,
        prayer: input.prayer,
      });
      return { completed: true };
    }),

  history: authedQuery
    .input(z.object({ from: daySchema, to: daySchema }))
    .query(async ({ ctx, input }) => {
      const rows = await getDb()
        .select({ day: prayerRecords.day, prayer: prayerRecords.prayer })
        .from(prayerRecords)
        .where(
          and(
            eq(prayerRecords.userId, ctx.user.id),
            gte(prayerRecords.day, input.from),
            lte(prayerRecords.day, input.to),
          ),
        );
      const map: Record<string, string[]> = {};
      for (const r of rows) {
        (map[r.day] ||= []).push(r.prayer);
      }
      return map;
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ day: prayerRecords.day, n: sql<number>`count(*)` })
      .from(prayerRecords)
      .where(eq(prayerRecords.userId, ctx.user.id))
      .groupBy(prayerRecords.day)
      .orderBy(desc(prayerRecords.day))
      .limit(400);

    const fullDays = new Set(rows.filter((r) => Number(r.n) >= 5).map((r) => r.day));
    // streak: consecutive days (ending today or yesterday) with all 5 prayers
    let streak = 0;
    const d = new Date();
    const fmt = (x: Date) =>
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    if (!fullDays.has(fmt(d))) d.setDate(d.getDate() - 1);
    while (fullDays.has(fmt(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    const total = rows.reduce((s, r) => s + Number(r.n), 0);
    return { days: rows.map((r) => ({ day: r.day, count: Number(r.n) })), streak, total };
  }),
});

// ---------- Quran (user data) ----------
export const quranRouter = createRouter({
  bookmarks: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(quranBookmarks)
      .where(eq(quranBookmarks.userId, ctx.user.id))
      .orderBy(desc(quranBookmarks.createdAt))
      .limit(200);
  }),

  toggleBookmark: authedQuery
    .input(z.object({ surah: z.number().int().min(1).max(114), verse: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select({ id: quranBookmarks.id })
        .from(quranBookmarks)
        .where(
          and(
            eq(quranBookmarks.userId, ctx.user.id),
            eq(quranBookmarks.surah, input.surah),
            eq(quranBookmarks.verse, input.verse),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        await db.delete(quranBookmarks).where(eq(quranBookmarks.id, existing[0].id));
        return { bookmarked: false };
      }
      await db
        .insert(quranBookmarks)
        .values({ userId: ctx.user.id, surah: input.surah, verse: input.verse });
      return { bookmarked: true };
    }),

  getProgress: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [p] = await db
      .select()
      .from(quranProgress)
      .where(eq(quranProgress.userId, ctx.user.id))
      .limit(1);
    if (p) return p;
    await db.insert(quranProgress).values({ userId: ctx.user.id });
    const [fresh] = await db
      .select()
      .from(quranProgress)
      .where(eq(quranProgress.userId, ctx.user.id))
      .limit(1);
    return fresh;
  }),

  setPosition: authedQuery
    .input(z.object({ surah: z.number().int().min(1).max(114), verse: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(quranProgress)
        .values({ userId: ctx.user.id, lastSurah: input.surah, lastVerse: input.verse })
        .onDuplicateKeyUpdate({ set: { lastSurah: input.surah, lastVerse: input.verse } });
      return { ok: true };
    }),

  setGoal: authedQuery
    .input(z.object({ dailyGoalVerses: z.number().int().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .insert(quranProgress)
        .values({ userId: ctx.user.id, dailyGoalVerses: input.dailyGoalVerses })
        .onDuplicateKeyUpdate({ set: { dailyGoalVerses: input.dailyGoalVerses } });
      return { ok: true };
    }),

  logReading: authedQuery
    .input(z.object({ day: daySchema, verses: z.number().int().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(quranDailyLog)
        .values({ userId: ctx.user.id, day: input.day, versesRead: input.verses })
        .onDuplicateKeyUpdate({
          set: { versesRead: sql`values(${quranDailyLog.versesRead})` },
        });
      return { ok: true };
    }),

  dailyLog: authedQuery
    .input(z.object({ from: daySchema, to: daySchema }))
    .query(async ({ ctx, input }) => {
      const rows = await getDb()
        .select()
        .from(quranDailyLog)
        .where(
          and(
            eq(quranDailyLog.userId, ctx.user.id),
            gte(quranDailyLog.day, input.from),
            lte(quranDailyLog.day, input.to),
          ),
        );
      return rows;
    }),
});

// ---------- Azkar ----------
export const azkarRouter = createRouter({
  favorites: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb()
      .select({ azkarId: favoriteAzkar.azkarId })
      .from(favoriteAzkar)
      .where(eq(favoriteAzkar.userId, ctx.user.id));
    return rows.map((r) => r.azkarId);
  }),

  toggleFavorite: authedQuery
    .input(z.object({ azkarId: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select({ id: favoriteAzkar.id })
        .from(favoriteAzkar)
        .where(and(eq(favoriteAzkar.userId, ctx.user.id), eq(favoriteAzkar.azkarId, input.azkarId)))
        .limit(1);
      if (existing.length > 0) {
        await db.delete(favoriteAzkar).where(eq(favoriteAzkar.id, existing[0].id));
        return { favorite: false };
      }
      await db.insert(favoriteAzkar).values({ userId: ctx.user.id, azkarId: input.azkarId });
      return { favorite: true };
    }),

  getProgress: authedQuery.input(z.object({ day: daySchema })).query(async ({ ctx, input }) => {
    const rows = await getDb()
      .select()
      .from(azkarProgress)
      .where(and(eq(azkarProgress.userId, ctx.user.id), eq(azkarProgress.day, input.day)));
    const map: Record<string, number> = {};
    for (const r of rows) map[r.azkarId] = r.count;
    return map;
  }),

  setProgress: authedQuery
    .input(z.object({ day: daySchema, azkarId: z.string().min(1).max(120), count: z.number().int().min(0).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .insert(azkarProgress)
        .values({ userId: ctx.user.id, day: input.day, azkarId: input.azkarId, count: input.count })
        .onDuplicateKeyUpdate({ set: { count: input.count } });
      return { ok: true };
    }),

  getTasbeeh: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [t] = await db.select().from(tasbeehState).where(eq(tasbeehState.userId, ctx.user.id)).limit(1);
    if (t) return t;
    await db.insert(tasbeehState).values({ userId: ctx.user.id });
    const [fresh] = await db.select().from(tasbeehState).where(eq(tasbeehState.userId, ctx.user.id)).limit(1);
    return fresh;
  }),

  bumpTasbeeh: authedQuery
    .input(z.object({ delta: z.number().int().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [t] = await db.select().from(tasbeehState).where(eq(tasbeehState.userId, ctx.user.id)).limit(1);
      const count = (t?.count ?? 0) + input.delta;
      const lifetime = (t?.lifetime ?? 0) + input.delta;
      await db
        .insert(tasbeehState)
        .values({ userId: ctx.user.id, count, lifetime })
        .onDuplicateKeyUpdate({ set: { count, lifetime } });
      return { count, lifetime };
    }),

  resetTasbeeh: authedQuery.mutation(async ({ ctx }) => {
    await getDb()
      .insert(tasbeehState)
      .values({ userId: ctx.user.id, count: 0 })
      .onDuplicateKeyUpdate({ set: { count: 0 } });
    return { ok: true };
  }),

  setTasbeehTarget: authedQuery
    .input(z.object({ target: z.number().int().min(1).max(100000) }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .insert(tasbeehState)
        .values({ userId: ctx.user.id, target: input.target })
        .onDuplicateKeyUpdate({ set: { target: input.target } });
      return { ok: true };
    }),
});

// ---------- Deeds ----------
export const deedsRouter = createRouter({
  list: authedQuery
    .input(z.object({ from: daySchema, to: daySchema }))
    .query(async ({ ctx, input }) => {
      return getDb()
        .select()
        .from(deeds)
        .where(and(eq(deeds.userId, ctx.user.id), gte(deeds.day, input.from), lte(deeds.day, input.to)))
        .orderBy(desc(deeds.createdAt))
        .limit(500);
    }),

  add: authedQuery
    .input(
      z.object({
        day: daySchema,
        title: z.string().min(1).max(300),
        category: z.enum(["charity", "kindness", "family", "knowledge", "other"]).default("other"),
        amount: z.string().max(60).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getDb().insert(deeds).values({ userId: ctx.user.id, ...input });
      return { ok: true };
    }),

  remove: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await getDb().delete(deeds).where(and(eq(deeds.id, input.id), eq(deeds.userId, ctx.user.id)));
    return { ok: true };
  }),
});

// ---------- Ramadan ----------
export const ramadanRouter = createRouter({
  getRange: authedQuery
    .input(z.object({ from: daySchema, to: daySchema }))
    .query(async ({ ctx, input }) => {
      const rows = await getDb()
        .select()
        .from(ramadanLogs)
        .where(and(eq(ramadanLogs.userId, ctx.user.id), gte(ramadanLogs.day, input.from), lte(ramadanLogs.day, input.to)));
      const map: Record<string, typeof rows[number]> = {};
      for (const r of rows) map[r.day] = r;
      return map;
    }),

  upsert: authedQuery
    .input(
      z.object({
        day: daySchema,
        fasted: z.boolean().optional(),
        taraweeh: z.boolean().optional(),
        qiyam: z.boolean().optional(),
        charity: z.boolean().optional(),
        quranPages: z.number().int().min(0).max(604).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { day, ...patch } = input;
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      await getDb()
        .insert(ramadanLogs)
        .values({ userId: ctx.user.id, day, ...(clean as Record<string, never>) })
        .onDuplicateKeyUpdate({ set: clean as Record<string, never> });
      return { ok: true };
    }),
});

// ---------- Goals ----------
export const goalsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(goals).where(eq(goals.userId, ctx.user.id)).orderBy(desc(goals.createdAt)).limit(100);
  }),
  add: authedQuery
    .input(z.object({ title: z.string().min(1).max(300), target: z.number().int().min(1).max(100000) }))
    .mutation(async ({ ctx, input }) => {
      await getDb().insert(goals).values({ userId: ctx.user.id, ...input });
      return { ok: true };
    }),
  bump: authedQuery.input(z.object({ id: z.number(), delta: z.number().int() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [g] = await db.select().from(goals).where(and(eq(goals.id, input.id), eq(goals.userId, ctx.user.id))).limit(1);
    if (!g) throw new TRPCError({ code: "NOT_FOUND" });
    const progress = Math.max(0, Math.min(g.target, g.progress + input.delta));
    await db.update(goals).set({ progress, done: progress >= g.target }).where(eq(goals.id, g.id));
    return { ok: true };
  }),
  remove: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await getDb().delete(goals).where(and(eq(goals.id, input.id), eq(goals.userId, ctx.user.id)));
    return { ok: true };
  }),
});

// ---------- Settings ----------
export const settingsRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, ctx.user.id)).limit(1);
    if (s) return s;
    await db.insert(userSettings).values({ userId: ctx.user.id });
    const [fresh] = await db.select().from(userSettings).where(eq(userSettings.userId, ctx.user.id)).limit(1);
    return fresh;
  }),

  update: authedQuery
    .input(
      z.object({
        calcMethod: z.number().int().min(0).max(30).optional(),
        city: z.string().max(120).optional(),
        country: z.string().max(120).optional(),
        lat: z.string().max(40).optional(),
        lng: z.string().max(40).optional(),
        notificationsEnabled: z.boolean().optional(),
        shareStats: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .insert(userSettings)
        .values({ userId: ctx.user.id, ...input })
        .onDuplicateKeyUpdate({ set: input });
      return { ok: true };
    }),
});

// ---------- Account ----------
export const accountRouter = createRouter({
  updateProfile: authedQuery
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(users).set({ name: input.name }).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  deleteAccount: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const id = ctx.user.id;
    await db.delete(prayerRecords).where(eq(prayerRecords.userId, id));
    await db.delete(quranBookmarks).where(eq(quranBookmarks.userId, id));
    await db.delete(quranProgress).where(eq(quranProgress.userId, id));
    await db.delete(quranDailyLog).where(eq(quranDailyLog.userId, id));
    await db.delete(azkarProgress).where(eq(azkarProgress.userId, id));
    await db.delete(favoriteAzkar).where(eq(favoriteAzkar.userId, id));
    await db.delete(tasbeehState).where(eq(tasbeehState.userId, id));
    await db.delete(deeds).where(eq(deeds.userId, id));
    await db.delete(ramadanLogs).where(eq(ramadanLogs.userId, id));
    await db.delete(goals).where(eq(goals.userId, id));
    await db.delete(userSettings).where(eq(userSettings.userId, id));
    await db.delete(users).where(eq(users.id, id));
    return { ok: true };
  }),
});
