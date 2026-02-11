import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { decryptSecret } from "@/lib/secret-crypto";
import { verifyTotpCode } from "@/lib/auth/totp";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      twoFactorCode: { label: "2FA Code", type: "text" },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const email = (credentials.email as string).toLowerCase().trim();
        const clientIp = getClientIpFromHeaders(request.headers);
        const rateLimit = await checkRateLimit(`login:${email}:${clientIp}`, {
          limit: 10,
          windowMs: 15 * 60 * 1000,
          scope: "auth_login",
        });
        if (!rateLimit.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        if (user.twoFactorEnabled) {
          const providedCode =
            typeof credentials.twoFactorCode === "string"
              ? credentials.twoFactorCode.trim()
              : "";
          const decryptedSecret = decryptSecret(user.twoFactorSecret)?.trim() ?? "";

          if (
            !decryptedSecret ||
            !verifyTotpCode({ secret: decryptedSecret, code: providedCode })
          ) {
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          hasOnboarded: user.hasOnboarded,
        };
      } catch (err) {
        console.error("Credentials authorize error:", err);
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
    error: "/auth-error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.picture = user.image ?? token.picture;
        if (typeof user.hasOnboarded === "boolean") {
          token.hasOnboarded = user.hasOnboarded;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { hasOnboarded: true },
          });
          token.hasOnboarded = dbUser?.hasOnboarded ?? false;
        }
      }
      // Handle session update from client
      if (trigger === "update" && session) {
        const update = session as {
          hasOnboarded?: boolean;
          name?: string | null;
          image?: string | null;
        };
        if (update.hasOnboarded !== undefined) {
          token.hasOnboarded = update.hasOnboarded;
        }
        if (update.name !== undefined) {
          token.name = update.name ?? undefined;
        }
        if (update.image !== undefined) {
          token.picture = update.image ?? undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
        session.user.hasOnboarded = Boolean(token.hasOnboarded);
      }
      return session;
    },
  },
});
