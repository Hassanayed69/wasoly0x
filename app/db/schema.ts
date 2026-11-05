import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  date,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

const userId = () => bigint("userId", { mode: "number", unsigned: true }).notNull();

// ---------- Prayer tracker ----------
export const prayerRecords = mysqlTable(
  "prayer_records",
  {
    id: serial("id").primaryKey(),
    userId: userId().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(), // YYYY-MM-DD (user local)
    prayer: mysqlEnum("prayer", ["fajr", "dhuhr", "asr", "maghrib", "isha"]).notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("prayer_user_day").on(t.userId, t.day, t.prayer)],
);

export type PrayerRecord = typeof prayerRecords.$inferSelect;

// ---------- Quran ----------
export const quranBookmarks = mysqlTable(
  "quran_bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: userId().references(() => users.id, { onDelete: "cascade" }),
    surah: int("surah").notNull(),
    verse: int("verse").notNull(),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("bm_user_verse").on(t.userId, t.surah, t.verse)],
);

export const quranProgress = mysqlTable("quran_progress", {
  id: serial("id").primaryKey(),
  userId: userId().references(() => users.id, { onDelete: "cascade" }).unique(),
  lastSurah: int("lastSurah").notNull().default(1),
  lastVerse: int("lastVerse").notNull().default(1),
  dailyGoalVerses: int("dailyGoalVerses").notNull().default(10),
  totalVersesRead: int("totalVersesRead").notNull().default(0),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const quranDailyLog = mysqlTable(
  "quran_daily_log",
  {
    id: serial("id").primaryKey(),
    userId: userId().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    versesRead: int("versesRead").notNull().default(0),
  },
  (t) => [uniqueIndex("qdl_user_day").on(t.userId, t.day)],
);

// ---------- Azkar ----------
export const azkarProgress = mysqlTable(
  "azkar_progress",
  {
    id: serial("id").primaryKey(),
    userId: userId().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    azkarId: varchar("azkarId", { length: 120 }).notNull(),
    count: int("count").notNull().default(0),
  },
  (t) => [uniqueIndex("azp_user_day_dhikr").on(t.userId, t.day, t.azkarId)],
);

export const favoriteAzkar = mysqlTable(
  "favorite_azkar",
  {
    id: serial("id").primaryKey(),
    userId: userId().references(() => users.id, { onDelete: "cascade" }),
    azkarId: varchar("azkarId", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("fav_user_dhikr").on(t.userId, t.azkarId)],
);

export const tasbeehState = mysqlTable("tasbeeh_state", {
  id: serial("id").primaryKey(),
  userId: userId().references(() => users.id, { onDelete: "cascade" }).unique(),
  count: int("count").notNull().default(0),
  lifetime: int("lifetime").notNull().default(0),
  target: int("target").notNull().default(100),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ---------- Deeds / charity ----------
export const deeds = mysqlTable("deeds", {
  id: serial("id").primaryKey(),
  userId: userId().references(() => users.id, { onDelete: "cascade" }),
  day: date("day", { mode: "string" }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  category: mysqlEnum("category", ["charity", "kindness", "family", "knowledge", "other"])
    .default("other")
    .notNull(),
  amount: varchar("amount", { length: 60 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Deed = typeof deeds.$inferSelect;

// ---------- Ramadan ----------
export const ramadanLogs = mysqlTable(
  "ramadan_logs",
  {
    id: serial("id").primaryKey(),
    userId: userId().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    fasted: boolean("fasted").notNull().default(false),
    taraweeh: boolean("taraweeh").notNull().default(false),
    qiyam: boolean("qiyam").notNull().default(false),
    charity: boolean("charity").notNull().default(false),
    quranPages: int("quranPages").notNull().default(0),
  },
  (t) => [uniqueIndex("rl_user_day").on(t.userId, t.day)],
);

export type RamadanLog = typeof ramadanLogs.$inferSelect;

// ---------- Personal goals ----------
export const goals = mysqlTable("goals", {
  id: serial("id").primaryKey(),
  userId: userId().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 300 }).notNull(),
  target: int("target").notNull().default(1),
  progress: int("progress").notNull().default(0),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;

// ---------- Settings ----------
export const userSettings = mysqlTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: userId().references(() => users.id, { onDelete: "cascade" }).unique(),
  calcMethod: int("calcMethod").notNull().default(4), // Umm al-Qura
  city: varchar("city", { length: 120 }),
  country: varchar("country", { length: 120 }),
  lat: varchar("lat", { length: 40 }),
  lng: varchar("lng", { length: 40 }),
  notificationsEnabled: boolean("notificationsEnabled").notNull().default(false),
  shareStats: boolean("shareStats").notNull().default(false),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
