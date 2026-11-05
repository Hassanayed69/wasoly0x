import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import {
  trackerRouter,
  quranRouter,
  azkarRouter,
  deedsRouter,
  ramadanRouter,
  goalsRouter,
  settingsRouter,
  accountRouter,
} from "./wusuli-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  tracker: trackerRouter,
  quran: quranRouter,
  azkar: azkarRouter,
  deeds: deedsRouter,
  ramadan: ramadanRouter,
  goals: goalsRouter,
  settings: settingsRouter,
  account: accountRouter,
});

export type AppRouter = typeof appRouter;
