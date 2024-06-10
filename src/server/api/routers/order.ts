import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { Stripe } from "stripe";
import { env } from "~/env.mjs";
import { OrderStatus } from "@prisma/client";
// const stripe = require("stripe")(
//   "sk_test_51NCn9UL2mnucdfv3vIh15fB3IMBPF26MsFzvc5UIKVHYfLhMoAGijI2f3RILlCXESpwqaRIg3VnRfQVx9daIZ2ky00Ih9v9VmQ"
// );

const stripe = new Stripe(env.STRIPE_SECRET_API_KEY, {
  apiVersion: "2022-11-15",
});

export const orderRouter = createTRPCRouter({
  getAll: adminProcedure
    .input(
      z.object({
        filters: z.object({
          price: z.number().optional(),
        }),
        pagination: z.object({
          skip: z.number().optional(),
          take: z.number().optional(),
        }),
      })
    )
    .query(({ ctx, input }) => {
      const { filters, pagination } = input;
      const { skip, take } = pagination;
      const { price } = filters;

      return ctx.prisma.order.findMany({
        include: { user: true, auction: true },
        where: {
          price,
          companyId: ctx.session.user.companyId,
        },
        skip,
        take,
      });
    }),
  getPrizeOrder: protectedProcedure
    .input(z.object({ prizeId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!input.prizeId) return;
      return ctx.prisma.order.findFirst({
        where: { prizeId: input.prizeId },
      });
    }),

  getForUser: protectedProcedure
    .input(z.object({ dir: z.enum(["asc", "desc"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.order.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        orderBy: {
          createdAt: input?.dir || "desc",
        },

        select: {
          id: true,
          price: true,
          status: true,
          createdAt: true,


          prize: {
            select: {
              name: true,
              description: true,
              images: true,
              campaign: {
                select: {
                  name: true,
                  id: true,
                  company: {
                    select: {
                      companyName: true,
                    },
                  },
                },
              },
              auction: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        price: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      // return ctx.prisma.order.create({
      //   data: {
      //     price: input.price,
      //     status: "DELIVERED",
      //     auction: { connect: { id: "clhwhdq7l0006vvhsy4dswf3y" } }, // Connect auctionId to the Auction model
      //     user: { connect: { id: "clhwfan3m000gvvooiwjpydcy" } },
      //   },
      // });
      // to fix
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      console.log({ input });
      return ctx.prisma.order.delete({
        where: {
          id: input.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(OrderStatus).optional(),
        addressId: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.order.update({
        where: { id: input.id },
        data: { status: input.status, addressId: input.addressId },
      });
    }),

  buyCredit: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        token: z.string(),
        campaignId: z.string(),
        teamId: z.string().nullable().default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("buyCredit", input);

      let status, error;
      const { amount, token, campaignId: campaignId, teamId } = input;

      const pastCredits = await ctx.prisma.userCredits.findFirst({
        where: {
          userId: ctx.session.user.id,
          campaignId: campaignId,
        },
      });
      let stripeId = ctx.session.user.stripeId;

      if (!stripeId) {
        const stripeCustomer = await stripe.customers.create();
        stripeId = stripeCustomer.id;
        await ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { stripeId },
        });
      }

      await stripe.customers.update(stripeId, {
        source: token,
        invoice_settings: {
          default_payment_method: token,
        },
      });

      try {
        const stripeIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // convert to cents
          currency: "usd",
          customer: stripeId,
          metadata: { campaignId, teamId },
          confirm: true,
        });

        const campaign = await ctx.prisma.campaign.findFirst({
          where: {
            id: campaignId,
          },
        });

        if (!campaign?.companyId)
          throw new Error("No campaign?.companyId found");

        await ctx.prisma.transaction.create({
          data: {
            companyId: campaign.companyId,
            userId: ctx.session.user.id,
            userName: ctx.session.user.name + (ctx.session.user.lName || ""),
            userImage: ctx.session.user.image || "",
            campaignId,
            amount,
            status: "ok",
            teamId: teamId,
            stripeIntentId: stripeIntent.id,
          },
        });

        await ctx.prisma.campaign.update({
          where: { id: campaignId },
          data: { amount: { increment: amount } },
        });

        if (pastCredits)
          await ctx.prisma.userCredits.update({
            where: { id: pastCredits?.id },
            data: { amount: { increment: amount } },
          });
        else
          await ctx.prisma.userCredits.create({
            data: {
              userId: ctx.session.user.id,
              campaignId: campaignId,
              amount,
            },
          });

        status = "success";
      } catch (error) {
        console.log(error);
        status = "error";
      }

      return { error, status };
    }),

  reBuyCredit: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        campaignId: z.string(),
        teamId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { amount, campaignId, teamId } = input;

      const userId = ctx.session.user.id;

      try {
        const pastCredits = await ctx.prisma.userCredits.findFirst({
          where: { userId, campaignId },
        });

        if (!ctx.session.user.stripeId)
          throw new Error("No past purchase found");

        const stripeCustomer = await stripe.customers.retrieve(
          ctx.session.user.stripeId
        );

        const intent = await stripe.paymentIntents.create({
          amount: amount * 100, // convert to cents
          currency: "usd",
          customer: stripeCustomer.id,
          metadata: { campaignId, teamId: teamId || null },
          confirm: true,
        });

        console.log("stripeCharge", intent);

        await ctx.prisma.transaction.create({
          data: {
            companyId: campaignId,
            userName: ctx.session.user.name + (ctx.session.user.lName || ""),
            userImage: ctx.session.user.image || "",
            userId: userId,
            campaignId: campaignId,
            amount: amount,
            teamId: teamId,
            stripeIntentId: intent.id,
            status: "ok",
          },
        });

        await ctx.prisma.campaign.update({
          where: {
            id: campaignId,
          },
          data: {
            amount: { increment: amount },
            // target: { decrement: amount },
          },
        });

        await ctx.prisma.userCredits.update({
          where: {
            id: pastCredits?.id,
          },
          data: {
            userId: userId,
            campaignId: campaignId,
            amount: { increment: amount },
          },
        });

        return { status: "success" };
      } catch (error) {
        console.log(error);
        return { error: "error" };
      }
    }),
});
