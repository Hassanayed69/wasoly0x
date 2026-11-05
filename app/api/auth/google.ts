import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import * as jose from "jose";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { signSessionToken } from "../kimi/session";
import { upsertUser } from "../queries/users";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const STATE_COOKIE = "wusuli_oauth_state";
const STATE_MAX_AGE = 10 * 60; // seconds

const googleJwks = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

type GoogleIdToken = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function requestOrigin(c: Context): string {
  const url = new URL(c.req.url);
  const proto =
    c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() ??
    url.protocol.replace(":", "");
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() ??
    c.req.header("host") ??
    url.host;
  return `${proto}://${host}`;
}

function redirectUri(c: Context): string {
  return `${requestOrigin(c)}/api/auth/google/callback`;
}

/** Step 1 — send the browser to Google with a short-lived state cookie. */
export function createGoogleAuthStartHandler() {
  return async (c: Context) => {
    if (!env.googleClientId || !env.googleClientSecret) {
      return c.redirect("/login?error=google_unconfigured", 302);
    }

    const state = crypto.randomUUID();
    const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
    setCookie(c, STATE_COOKIE, state, {
      ...cookieOpts,
      httpOnly: true,
      maxAge: STATE_MAX_AGE,
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", env.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri(c));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");

    return c.redirect(url.toString(), 302);
  };
}

/** Step 2 — verify state, exchange the code, and issue our own session cookie. */
export function createGoogleCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const oauthError = c.req.query("error");
    const expectedState = getCookie(c, STATE_COOKIE);

    deleteCookie(c, STATE_COOKIE, { path: "/" });

    if (oauthError === "access_denied") {
      return c.redirect("/login", 302);
    }
    if (oauthError) {
      console.warn("[google-auth] consent screen returned an error", oauthError);
      return c.redirect("/login?error=oauth_failed", 302);
    }
    if (!code || !state || !expectedState || state !== expectedState) {
      return c.redirect("/login?error=state_mismatch", 302);
    }
    if (!env.googleClientId || !env.googleClientSecret) {
      return c.redirect("/login?error=google_unconfigured", 302);
    }

    try {
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: redirectUri(c),
        }).toString(),
      });

      if (!tokenResp.ok) {
        const text = await tokenResp.text();
        throw new Error(`token exchange failed (${tokenResp.status}): ${text}`);
      }

      const tokens = (await tokenResp.json()) as { id_token?: string };
      if (!tokens.id_token) throw new Error("missing id_token");

      const { payload } = await jose.jwtVerify(tokens.id_token, googleJwks, {
        audience: env.googleClientId,
      });
      const profile = payload as unknown as GoogleIdToken;

      if (!profile.sub) throw new Error("missing sub claim");
      if (profile.email_verified === false) throw new Error("email not verified");

      const unionId = `google:${profile.sub}`;

      await upsertUser({
        unionId,
        name: profile.name ?? profile.email?.split("@")[0] ?? "مستخدم",
        email: profile.email ?? null,
        avatar: profile.picture ?? null,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({ unionId, clientId: "google" });
      setCookie(c, Session.cookieName, token, {
        ...getSessionCookieOptions(c.req.raw.headers),
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/", 302);
    } catch (error) {
      console.error("[google-auth] callback failed", error);
      return c.redirect("/login?error=oauth_failed", 302);
    }
  };
}
