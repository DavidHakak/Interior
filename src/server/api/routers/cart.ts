import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cartRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const auction = await ctx.prisma.order.findMany({
        where: {
          auction: {
            campaignId: input.campaignId,
          },
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
          auction: true,
          createdAt: true,
          price: true,
          status: true,
        },
      });

      return auction;
    }),
  count: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cartCount = await ctx.prisma.order.count({
        where: {
          auction: {
            campaignId: input.campaignId,
          },
          userId: ctx.session.user.id,
        },
      });

      return cartCount;
    }),
});
