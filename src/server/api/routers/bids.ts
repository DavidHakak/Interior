import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { uniques } from "~/utils";

export const bidsRouter = createTRPCRouter({
  getForAuction: protectedProcedure
    .input(
      z.object({
        auctionId: z.string(),
        take: z.number().optional(),
        order: z
          .object({
            createdAt: z.enum(["asc", "desc"]).optional(),
          })
          .optional(),
      })
    )
    .query(({ ctx, input }) => {
      const { auctionId, order } = input;
      return ctx.prisma.bid.findMany({
        where: { auctionId },
        include: { user: true },
        orderBy: order ? order : { createdAt: "desc" },
      });
    }),
  getForCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { campaignId, take = 5 } = input;
      const bids = await ctx.prisma.bid.findMany({
        where: {
          auction: { campaignId },
        },
        take,
        select: {
          id: true,
          price: true,
          createdAt: true,
        },
      });
      return bids;
    }),
  sumForCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { campaignId } = input;
      const bids = await ctx.prisma.bid.findMany({
        where: {
          auction: { campaignId },
        },
        select: {
          price: true,
        },
      });
      return bids.reduce((acc, bid) => acc + bid.price, 0);
    }),
  activeBidders: protectedProcedure
    .input(
      z.object({
        auctionId: z.string(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { auctionId, take = 5 } = input;
      const bids = await ctx.prisma.bid.findMany({
        where: { auctionId },
        take,
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return uniques(
        bids.map((bid) => bid.user),
        (user) => user.id
      );
    }),
  lastBid: protectedProcedure
    .input(
      z.object({
        auctionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { auctionId } = input;
      const bid = await ctx.prisma.bid.findFirst({
        where: {
          auctionId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          price: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
      return bid;
    }),
});
