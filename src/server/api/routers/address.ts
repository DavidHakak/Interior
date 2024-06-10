import { Address, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { getCountries, locationData } from "~/server/services/data";

const stripe = new Stripe(env.STRIPE_SECRET_API_KEY, {
  apiVersion: "2022-11-15",
});

const addressSchema = z.object({
  country: z.string(),
  city: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  postal_code: z.string(),
  state: z.string(),
});

export const addressRouter = createTRPCRouter({
  shipping: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id) return [];
    const addresses = await prisma.address.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });

    return addresses.map((address) => {
      return {
        ...address,
        isDefaultShiping:
          address.id === ctx.session.user.defaultShippingAddressId,
        isDefaultBilling:
          address.id === ctx.session.user.defaultBillingAddressId,
      };
    });
  }),
  add: protectedProcedure
    .input(
      z.object({
        address: addressSchema,
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await prisma.address.create({
        data: {
          ...input.address,
          line2: input.address.line2 || "",
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        address: addressSchema,
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: update stripe address if it's default
      if (
        ctx.session.user.stripeId &&
        ctx.session.user.defaultShippingAddressId === input.id
      ) {
        await stripe.customers.update(ctx.session.user.stripeId, {
          shipping: {
            address: input.address,
            name: input.name,
          },
        });
      }

      if (
        ctx.session.user.stripeId &&
        ctx.session.user.defaultBillingAddressId === input.id
      ) {
        await stripe.customers.update(ctx.session.user.stripeId, {
          address: input.address,
          name: input.name,
        });
      }

      return await prisma.address.update({
        where: {
          id: input.id,
        },
        data: {
          ...input.address,
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),
  changeBilling: protectedProcedure
    .input(
      z.object({
        addressId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id || !ctx.session.user.stripeId) return;
      const address = await prisma.address.findUnique({
        where: { id: input.addressId },
      });
      if(!address) return;
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          defaultBillingAddressId: address?.id,
        },
      });

      await stripe.customers.update(ctx.session.user.stripeId, {
        address: {
          city: address.city,
          country: address.country,
          line1: address.line1,
          line2: address.line2,
          postal_code: address.postal_code,
          state: address.state,
        },
        name: address?.name,
      });
    }),
  changeShipping: protectedProcedure
    .input(
      z.object({
        addressId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id || !ctx.session.user.stripeId) return;
      const address = await prisma.address.findUnique({
        where: { id: input.addressId },
      });

      if (!address) return;

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          defaultShippingAddressId: address?.id,
        },
      });

      await stripe.customers.update(ctx.session.user.stripeId, {
        shipping: {
          address: {
            city: address.city,
            country: address.country,
            line1: address.line1,
            line2: address.line2,
            postal_code: address.postal_code,
            state: address.state,
          },
          name: address.name,
          // phone: ctx.session.user.phone ,
        },
      });
    }),

  getBilling: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id || !ctx.session.user.stripeId) return;
    const stripeCustomer = await stripe.customers.retrieve(
      ctx.session.user.stripeId
    );

    if (stripeCustomer.deleted) return;

    return stripeCustomer.address;
  }),
  getShipping: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.id || !ctx.session.user.stripeId) return;
    const stripeCustomer = await stripe.customers.retrieve(
      ctx.session.user.stripeId
    );

    if (stripeCustomer.deleted) return;

    return stripeCustomer.shipping;
  }),

  countries: protectedProcedure.query(() => {
    return locationData.getCountries();
  }),
  states: protectedProcedure
    .input(z.object({ countryCode: z.string().optional() }))
    .query(({ input }) => {
      console.log("input", input);

      return locationData.getStates(input.countryCode);
    }),
});
