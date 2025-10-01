import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import createMemoryStore from "memorystore";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Allow sessions for unauthenticated users
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Check if we need to force a fresh login (e.g., after logout)
    const forceLogin = req.query.force === 'true';
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: forceLogin ? "login" : "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
      // Add max_age=0 to force fresh authentication when needed
      ...(forceLogin && { max_age: 0 })
    })(req, res, next);
  });

  app.get("/api/callback", (req: any, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err) {
        console.log(`[AUTH CALLBACK] Authentication error:`, err);
        return next(err);
      }
      if (!user) {
        console.log(`[AUTH CALLBACK] No user returned from auth`);
        return res.redirect("/api/login");
      }
      
      console.log(`[AUTH CALLBACK] User authenticated, logging in`);
      req.logIn(user, (err: any) => {
        if (err) {
          console.log(`[AUTH CALLBACK] Login error:`, err);
          return next(err);
        }
        
        // Check if there's a returnTo URL in the session
        console.log(`[AUTH CALLBACK] Session ID: ${req.sessionID}`);
        console.log(`[AUTH CALLBACK] Session object:`, req.session);
        const returnTo = req.session?.returnTo;
        console.log(`[AUTH CALLBACK] Session returnTo: ${returnTo}`);
        
        if (returnTo && returnTo !== '/') {
          delete req.session.returnTo;
          console.log(`[AUTH CALLBACK] Redirecting to: ${returnTo}`);
          return res.redirect(returnTo);
        }
        console.log(`[AUTH CALLBACK] No valid returnTo found, redirecting to home`);
        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    // Clear the session completely
    req.session.destroy((err) => {
      if (err) {
        console.log('Session destruction error:', err);
      }
    });
    
    // Clear session cookie
    res.clearCookie('connect.sid');
    
    req.logout(() => {
      // Build logout URL with additional parameters to force clean logout
      const logoutUrl = client.buildEndSessionUrl(config, {
        client_id: process.env.REPL_ID!,
        post_logout_redirect_uri: `${req.protocol}://${req.hostname}?logged_out=true`,
        // Add hint to logout all sessions
        logout_hint: 'force_logout'
      });
      
      console.log('[LOGOUT] Redirecting to logout URL:', logoutUrl.href);
      res.redirect(logoutUrl.href);
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
