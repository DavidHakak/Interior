import Stripe from "stripe";
import { z } from "zod";
import { env } from "~/env.mjs";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  superAdminProcedure,
} from "~/server/api/trpc";
import { Campaign, Transaction, User, campaignCategory } from "@prisma/client";

const stripe = new Stripe(env.STRIPE_SECRET_API_KEY, {
  apiVersion: "2022-11-15",
});

const categoryValues = Object.values(campaignCategory);
const campaignCategoryEnum = z.enum(["all", ...categoryValues]);

export const payRouter = createTRPCRouter({
  methods: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.stripeId) return [];
    const methodslist = await stripe.paymentMethods.list({
      customer: ctx.session.user.stripeId,
    });

    const stripeCustomer = await stripe.customers.retrieve(
      ctx.session.user.stripeId
    );

    if (stripeCustomer.deleted) return [];

    const defaultCardId =
      stripeCustomer.invoice_settings.default_payment_method;

    return methodslist.data.map((method) => {
      return {
        ...method,
        isDefault: method.id === defaultCardId,
      };
    });
  }),
  addMethod: protectedProcedure

    .input(
      z.object({
        token: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.stripeId) return;
      const attached = await stripe.paymentMethods.attach(input.token, {
        customer: ctx.session.user.stripeId,
      });
      const method = await stripe.paymentMethods.update(attached.id, {
        billing_details: { name: input.name },
      });

      return await stripe.paymentMethods.attach(method.id, {
        customer: ctx.session.user.stripeId,
      });
    }),
  removeMethod: protectedProcedure
    .input(z.object({ methodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.stripeId) return;
      await stripe.paymentMethods.detach(input.methodId);
    }),
  transactions: adminProcedure
    .input(
      z.object({
        campaignId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          companyId: ctx.session.user.isSuperAdmin
            ? undefined
            : ctx.session.user.companyId,
          campaignId: input.campaignId,
        },
        include: { user: true, campaign: true, team: true },
      });
      return transactions;
    }),
  donations: protectedProcedure
    .input(
      z
        .object({
          sort: z
            .enum(["amount,asc", "amount,desc", "date,asc", "date,desc"])
            .optional(),
          order: z.enum(["asc", "desc"]).optional(),
          category: campaignCategoryEnum.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.stripeId) return [];
      const charges = await stripe.charges.list({
        customer: ctx.session.user.stripeId,
        limit: 100,
      });
      if (input?.sort) {
        const sort = input.sort.split(",");
        charges.data.sort((a, b) => {
          if (sort[0] === "amount") {
            return sort[1] === "asc"
              ? a.amount - b.amount
              : b.amount - a.amount;
          }
          if (sort[0] === "date") {
            return sort[1] === "asc"
              ? a.created - b.created
              : b.created - a.created;
          }
          return 0;
        });
      }

      // return charges.data;
      const chargesWithCampaigns = charges.data.map(async (charge) => {
        const team = charge.metadata.teamId
          ? await ctx.prisma.campaignTeam.findFirst({
              where: { id: charge.metadata.teamId },
            })
          : null;

        const category =
          input?.category === "all" ? undefined : input?.category;
        const campaign = charge.metadata.campaignId
          ? await ctx.prisma.campaign.findFirst({
              where: { id: charge.metadata.campaignId, category },
            })
          : null;

        return {
          ...charge,
          campaign,
          team,
        };
      });

      return await Promise.all(chargesWithCampaigns);
    }),
  userDonations: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input?.userId) return [];
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.userId },
      });
      if (!user || !user.stripeId) return [];
      const charges = await stripe.charges.list({
        customer: user.stripeId,
        limit: input.limit || 5,
      });
      const chargesWithCampaigns = charges.data.map(async (charge) => {
        const team = charge.metadata.teamId
          ? await ctx.prisma.campaignTeam.findFirst({
              where: { id: charge.metadata.teamId },
            })
          : null;
        const campaign = charge.metadata.campaignId
          ? await ctx.prisma.campaign.findFirst({
              where: { id: charge.metadata.campaignId },
            })
          : null;

        const transaction = charge.payment_intent
          ? await ctx.prisma.transaction.findFirst({
              where: { stripeIntentId: charge.payment_intent as string },
            })
          : null;
        return {
          charge,
          campaign,
          team,
          transaction,
        };
      });

      return await Promise.all(chargesWithCampaigns);
    }),
  changeDefaultMethod: protectedProcedure
    .input(z.object({ methodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id || !ctx.session.user.stripeId) return;
      const method = await stripe.paymentMethods.retrieve(input.methodId);
      console.log("method", method);

      return stripe.customers.update(ctx.session.user.stripeId, {
        invoice_settings: { default_payment_method: input.methodId },
      });
    }),
  createIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        teamId: z.string().optional(),
        campaignId: z.string().nullable().default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.stripeId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email,
        });

        await ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { stripeId: customer.id },
        });
        const intent = await stripe.paymentIntents.create({
          amount: input.amount,
          currency: "usd",
          customer: customer.id,
          metadata: {
            campaignId: input.campaignId,
            teamId: input.teamId || null,
          },
        });

        return intent;
      }
      const stripeCustomer = await stripe.customers.retrieve(
        ctx.session.user.stripeId
      );

      if (stripeCustomer.deleted) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email,
        });

        await ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { stripeId: customer.id },
        });
        const intent = await stripe.paymentIntents.create({
          amount: input.amount,
          currency: "usd",
          customer: customer.id,
          metadata: {
            campaignId: input.campaignId,
            teamId: input.teamId || null,
          },
        });

        return intent;
      }

      let stripeMethodId =
        stripeCustomer.invoice_settings.default_payment_method;

      if (!stripeMethodId) {
        const methods = await stripe.paymentMethods.list({
          customer: ctx.session.user.stripeId,
          limit: 1,
        });

        if (methods.data[0]?.id) {
          stripeMethodId = methods.data[0]?.id;
        }
      }

      if (typeof stripeMethodId !== "string" && stripeMethodId !== null) {
        stripeMethodId = stripeMethodId.id;
      }

      const intent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: "usd",
        customer: ctx.session.user.stripeId,
        metadata: {
          campaignId: input.campaignId,
          teamId: input.teamId || null,
        },
        payment_method: stripeMethodId || undefined,
      });

      return intent;
    }),

  updateIntent: protectedProcedure
    .input(z.object({ intentId: z.string(), amount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.stripeId) return;
      console.log("stripe customer", ctx.session.user.stripeId);

      const intent = await stripe.paymentIntents.update(input.intentId, {
        amount: input.amount,
      });
      console.log("intent customer", intent.customer);

      if (intent.status === "requires_payment_method") {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: ctx.session.user.stripeId,
          limit: 1,
        });

        const paymentMethod = paymentMethods.data[0];
        if (!paymentMethod) {
          return intent;
        }
        if (paymentMethod.customer !== intent.customer) {
          return await stripe.paymentIntents.create({
            amount: input.amount,
            currency: "usd",
            customer: ctx.session.user.stripeId,
            metadata: {
              campaignId: intent.metadata.campaignId || null,
              teamId: intent.metadata.teamId || null,
            },
            payment_method: paymentMethod.id,
          });
        }

        return await stripe.paymentIntents.update(input.intentId, {
          payment_method: paymentMethod.id,
        });
      }
      return intent;
    }),
  registerPurchase: protectedProcedure
    .input(z.object({ intentId: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.stripeId) return;
      let intent = await stripe.paymentIntents.retrieve(input.intentId);
      if (intent.status !== "succeeded") {
        console.log("confirming intent", intent);

        intent = await stripe.paymentIntents.confirm(input.intentId);
        console.log("confirmed intent", intent);
      }
      if (input.note) {
        await stripe.paymentIntents.update(input.intentId, {
          metadata: { ...intent.metadata, note: input.note },
        });
      }
      const campaignId = intent.metadata.campaignId;
      if (!campaignId) throw new Error("No campaignId");
      const campaign = await ctx.prisma.campaign.findFirst({
        where: { id: campaignId },
      });
      if (!campaign) throw new Error("No campaign");
      let credits = await ctx.prisma.userCredits.findFirst({
        where: {
          userId: ctx.session.user.id,
          campaignId: campaignId,
        },
      });
      if (!credits) {
        await ctx.prisma.userCredits.create({
          data: {
            amount: intent.amount / 100,
            campaignId: campaignId,
            userId: ctx.session.user.id,
            stripeUserId: ctx.session.user.stripeId,
          },
        });
      } else {
        await ctx.prisma.userCredits.update({
          where: { id: credits.id },
          data: {
            userId: ctx.session.user.id,
            campaignId: campaignId,
            amount: { increment: intent.amount / 100 },
          },
        });
      }
      await ctx.prisma.transaction.create({
        data: {
          companyId: campaign.companyId,
          stripeIntentId: intent.id,
          userName: ctx.session.user.name + (ctx.session.user.lName || ""),
          userImage: ctx.session.user.image || "",
          userId: ctx.session.user.id,
          campaignId: campaignId,
          amount: intent.amount / 100,
          status: "ok",
        },
      });

      await ctx.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          amount: { increment: intent.amount / 100 },
        },
      });
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const transaction:
          | null
          | (Transaction & {
              intent?: Stripe.PaymentIntent & {
                payment_method: Stripe.PaymentMethod;
                invoice?: Stripe.Invoice;
              };
              user: User;
              campaign: Campaign | null;
            }) = await ctx.prisma.transaction.findFirst({
          where: { id: input.id },
          include: { user: true, campaign: true },
        });
        if (transaction?.stripeIntentId) {
          transaction.intent = (await stripe.paymentIntents.retrieve(
            transaction.stripeIntentId,
            { expand: ["payment_method", "invoice"] }
          )) as Stripe.PaymentIntent & {
            payment_method: Stripe.PaymentMethod;
            invoice?: Stripe.Invoice;
          };
        }
        return transaction;
      } catch (error) {
        console.log({ error });
      }
    }),
});
