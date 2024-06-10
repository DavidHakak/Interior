import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { UserRole } from "@prisma/client";
import bcript from "bcrypt";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      phone?: string;
      id: string;
      name: string;
      lName?: string;
      username?: string;
      email: string;
      image?: string;
      companyId: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      stripeId: string | null;
      defaultShippingAddressId?: string;
      defaultBillingAddressId?: string;
    };
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: async ({ session, token }) => {
      const savedUser = await prisma.user.findFirstOrThrow({
        where: { id: token.sub },
      });

      if (savedUser.isBlocked) {
        throw new Error("User is blocked");
      }
      return {
        ...session,
        user: {
          ...session.user,
          stripeId: savedUser.stripeId,
          name: savedUser.name,
          lName: savedUser.lName,
          phone: savedUser.phone,
          username: savedUser.username,
          email: savedUser.email,
          image: savedUser.image,
          defaultBillingAddressId: savedUser.defaultBillingAddressId,
          defaultShippingAddressId: savedUser.defaultShippingAddressId,
          id: savedUser.id,
          companyId: savedUser.companyId,
          isAdmin: savedUser.role === UserRole.Admin,
          isSuperAdmin: savedUser.role === UserRole.SuperAdmin,
        },
      };
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      id: "credentials",
      type: "credentials",
      authorize: async (credentials) => {
        console.log("credentials", credentials);
        
        if (!credentials) {
          return null;
        }
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            password: { not: null },
          },
        });
        if (!user || !user.password) {
          return null;
        }
        const isMatch = await bcript.compare(
          credentials.password,
          user.password
        );
        if (!isMatch) {
          return null;
        }

        if (user) {
          return {
            email: user.email,
            id: user.id,
            name: user.name,
            image: user.image,
          };
        }
        return null;
      },
      credentials: {
        email: { label: "Email", type: "text", placeholder: "Email" },
        password: { label: "Password", type: "password" },
      },
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),

    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
