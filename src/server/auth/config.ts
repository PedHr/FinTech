import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/server/database/client";
import { sendEmail } from "@/server/email/service";
import { env } from "@/shared/lib/env";
import { hashPassword, verifyPassword } from "./password";
import { getTrustedAuthOrigins } from "./trusted-origins";
import { consumeRateLimit } from "@/server/security/rate-limit";

const config = env();

export const auth = betterAuth({
  appName: "FinControl",
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.APP_URL,
  trustedOrigins: getTrustedAuthOrigins(config.APP_URL),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    modelName: "user",
    additionalFields: {
      defaultCurrency: { type: "string", input: false, defaultValue: "BRL" },
      timezone: { type: "string", input: false, defaultValue: "America/Sao_Paulo" },
      theme: { type: "string", input: false, defaultValue: "SYSTEM" },
      onboardingCompletedAt: { type: "date", input: false, required: false },
      consentedAt: { type: "date", input: false, required: false },
    },
  },
  session: {
    modelName: "session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "authAccount" },
  verification: { modelName: "verification", storeIdentifier: "hashed" },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    password: { hash: hashPassword, verify: verifyPassword },
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Redefina sua senha do FinControl",
        text: `Use este link em até 30 minutos: ${url}`,
        html: `<p>Use o link abaixo em até 30 minutos:</p><p><a href="${url}">Redefinir senha</a></p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirme seu e-mail no FinControl",
        text: `Confirme seu e-mail: ${url}`,
        html: `<p>Confirme seu e-mail para começar:</p><p><a href="${url}">Verificar e-mail</a></p>`,
      });
    },
  },
  rateLimit: {
    enabled: config.NODE_ENV === "production",
    customStorage: { consume: (key, rule) => consumeRateLimit(`auth:${key}`, rule.max, rule.window) },
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60 * 15, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 3 },
      "/request-password-reset": { window: 60 * 60, max: 3 },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    useSecureCookies: config.NODE_ENV === "production",
    cookiePrefix: "fincontrol",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.NODE_ENV === "production",
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
