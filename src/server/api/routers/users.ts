import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
  publicProcedure,
  superAdminProcedure,
} from "~/server/api/trpc";
import bcript from "bcrypt";
import { Campaign, Company, Transaction, UserRole } from "@prisma/client";
import Stripe from "stripe";
import { env } from "~/env.mjs";
import moment from "moment";
import { randomUUID } from "crypto";

const stripe = new Stripe(env.STRIPE_SECRET_API_KEY, {
  apiVersion: "2022-11-15",
});

export const usersRouter = createTRPCRouter({
  createUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
        phone: z.string().optional(),
        name: z.string(),
        lName: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const hashedPass = await bcript.hash(input.password, 10);

        const user = await ctx.prisma.user.create({
          data: {
            email: input.email,
            password: hashedPass,
            name: input.name,
            lName: input.lName,
            image: input.image,
            phone: input.phone,
          },
          select: { id: true, email: true },
        });

        return user;
      } catch (error) {
        console.log({ error });
      }
    }),

  getAll: adminProcedure
    .input(
      z.object({
        pagination: z
          .object({
            take: z.number().optional(),
            skip: z.number().optional(),
          })
          .default({}),
        filters: z
          .object({
            role: z.enum(["User", "Admin", "SuperAdmin"]).optional(),
            companyId: z.string().optional(),
          })
          .default({}),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const users = await ctx.prisma.user.findMany({
          skip: input.pagination.skip,
          take: input.pagination.take,
          where: {
            role: input.filters.role,
            companyId: input.filters.companyId,
          },
        });

        return users;
      } catch (error) {
        console.log({ error });
      }
    }),

  getUserCredits: protectedProcedure
    .input(
      z.object({
        campaign: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { campaign } = input;

        const oldCreditsCount = await ctx.prisma.userCredits.count({
          where: {
            campaignId: campaign,
            userId: ctx.session.user.id,
          },
        });
        if (oldCreditsCount > 1) {
          const oldCredits = await ctx.prisma.userCredits.aggregate({
            where: {
              campaignId: campaign,
              userId: ctx.session.user.id,
            },
            _sum: {
              amount: true,
            },
          });
          await ctx.prisma.userCredits.deleteMany({
            where: {
              campaignId: campaign,
              userId: ctx.session.user.id,
            },
          });
          if (oldCredits?._sum?.amount !== null)
            await ctx.prisma.userCredits.create({
              data: {
                campaignId: campaign,
                userId: ctx.session.user.id,
                amount: oldCredits._sum.amount,
              },
            });
        }
        const credits = await ctx.prisma.userCredits.findFirst({
          where: {
            campaignId: campaign,
            userId: ctx.session.user.id,
          },
        });
        credits?.amount;
        return credits;
      } catch (error) {
        console.log({ error });
      }
    }),

  getUserTransactions: protectedProcedure.query(({ ctx }) => {
    try {
      return ctx.prisma.transaction.findMany({
        where: {
          userId: ctx?.session.user?.id,
        },
        include: {
          campaign: true,
          user: true,
        },
      });
    } catch (error) {
      console.log({ error });
    }
  }),

  getTransactionsByCompany: protectedProcedure
    .input(
      z.object({
        pagination: z
          .object({
            take: z.number().optional(),
            skip: z.number().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      console.log({ input });

      try {
        const transactions: (Transaction & {
          campaign:
            | (Campaign & {
                company: Company;
              })
            | null;
          intent?: Stripe.PaymentIntent & {
            method?: Stripe.PaymentMethod;
          };
        })[] = await ctx.prisma.transaction.findMany({
          where: {
            companyId: ctx.session.user?.isAdmin
              ? ctx.session.user?.companyId
              : undefined,
          },
          include: {
            campaign: {
              include: {
                company: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: input.pagination?.skip,
          take: input.pagination?.take,
        });

        //slower

        // for (const transaction of transactions) {
        //   if (transaction.stripeIntentId) {
        //     transaction.intent = await stripe.paymentIntents.retrieve(
        //       transaction.stripeIntentId,
        //       { expand: ["payment_method"] }
        //     );
        //   }
        // }

        return transactions;
      } catch (error) {
        console.log({ error });
      }
    }),

  getUser: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: { company: true, addresses: true },
      });
    }),

  updateUserData: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string().nullable(),
        phone: z.string().nullable(),
        username: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log({ input });

        return ctx.prisma.user.update({
          where: {
            id: ctx?.session.user?.id,
          },
          data: {
            name: input.firstName,
            lName: input.lastName,
            phone: input.phone,
            username: input.username,
          },
        });
      } catch (error) {
        console.log({ error });
      }
    }),

  removeImg: protectedProcedure.mutation(({ ctx }) => {
    return ctx.prisma.user.update({
      where: {
        id: ctx?.session.user?.id,
      },
      data: {
        image: null,
      },
    });
  }),

  updateImage: protectedProcedure
    .input(
      z.object({
        image: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.prisma.user.update({
        where: {
          id: ctx?.session.user?.id,
        },
        data: {
          image: input.image || null,
        },
      });

      return { success: true };
    }),

  getAdminDahboardData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const live_campaigns_count = await ctx.prisma.campaign.count({
        where: {
          companyId: ctx.session.user?.isAdmin
            ? ctx.session.user?.companyId
            : undefined,
          status: "Active",
        },
      });

      const transactions_count = await ctx.prisma.transaction.count({
        where: {
          companyId: ctx.session.user?.isAdmin
            ? ctx.session.user?.companyId
            : undefined,
        },
      });

      const completedAuctions_count = await ctx.prisma.auction.count({
        where: {
          companyId: ctx.session.user?.isAdmin
            ? ctx.session.user?.companyId
            : undefined,
          closedAt: { not: null },
        },
      });

      return {
        boxes: [
          {
            title: "Live Campaigns",
            key: "live_campaigns",
            value: live_campaigns_count,
          },
          {
            title: "Donations",
            key: "transactions",
            value: transactions_count,
          },
          {
            title: "Completed Auctions",
            key: "completedAuctions",
            value: completedAuctions_count,
          },
        ],
      };
    } catch (error) {
      console.log({ error });
    }
  }),
  blockUser: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { isBlocked: true },
      });
    }),
  adminUnblockUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { isBlocked: false },
      });
    }),
  assignAdminRole: superAdminProcedure
    .input(z.object({ id: z.string(), companyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { role: UserRole.Admin, companyId: input.companyId },
      });
    }),
  removeAdminRole: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { role: UserRole.User, companyId: null },
      });
    }),
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          email: input.email,
          NOT: {
            OR: [{ isBlocked: true }, { password: null }],
          },
        },
      });
      if (!user) {
        return;
      }
      const expires = moment().add(30, "minutes").toDate();
      const oldToken = await ctx.prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
      });
      if (oldToken) {
        await ctx.prisma.passwordResetToken.delete({
          where: { token: oldToken.token },
        });
      }
      const uniqueToken = randomUUID();
      const token = await ctx.prisma.passwordResetToken.create({
        data: { expires, userId: user.id, token: uniqueToken },
      });

      const url = `${env.NEXTAUTH_URL}?rp-token=${token.token}&popup=login`;
      console.log("url", url);

      // return url;
    }),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.prisma.passwordResetToken.findUnique({
        where: { token: input.token },
      });
      if (!token) {
        throw new Error("Invalid token");
      }

      if (token.expires.getTime() < Date.now()) {
        throw new Error("Token expired");
      }
      const hashedPass = await bcript.hash(input.password, 10);

      const user = await ctx.prisma.user.update({
        where: { id: token.userId },
        data: { password: hashedPass },
      });
    }),
  getResetTokenData: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const token = await ctx.prisma.passwordResetToken.findUnique({
        where: { token: input.token },
        select: { expires: true, token: true },
      });
      if (!token) {
        throw new Error("Invalid token");
      }

      return token;
    }),
});
