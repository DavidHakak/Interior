import { PrizeCategory, campaignCategory } from "@prisma/client";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  superAdminProcedure,
} from "~/server/api/trpc";
import firebase from "~/server/firestore";
import { api } from "~/utils/api";

export const auctionRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        filters: z.object({
          name: z.string().optional(),
          campaignId: z.string().optional(),
        }),
        pagination: z
          .object({
            skip: z.number().optional(),
            take: z.number().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;

      const allAuctions = await ctx.prisma.auction.findMany({
        where: {
          name: filters.name ?? undefined,
          campaignId: filters.campaignId ?? undefined,
        },
        include: {
          prizes: true,
          campaign: true,
          winner: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: pagination?.skip ?? undefined,
        take: pagination?.take ?? undefined,
      });

      return allAuctions;
    }),

  getForDashboard: adminProcedure
    .input(
      z
        .object({
          filters: z
            .object({
              name: z.string().optional(),
              campaignId: z.string().optional(),
            })
            .optional(),
          pagination: z
            .object({
              skip: z.number().optional(),
              take: z.number().optional(),
            })
            .optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.auction.findMany({
        where: {
          companyId: ctx.session?.user.companyId,
          campaignId: input?.filters?.campaignId,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: input?.pagination?.skip,
        // take: input?.pagination?.take,
        include: {
          winner: true,
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  currentWinner: publicProcedure
    .input(
      z.object({
        auctionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // return await ctx.prisma.user.findFirst({});
      const auction = await ctx.prisma.auction.findUnique({
        where: { id: input.auctionId },
        select: { winner: true },
      });
      if (auction) {
        return auction?.winner;
      }
      const lastBidder = await ctx.prisma.bid.findFirst({
        where: { auctionId: input.auctionId },
        orderBy: { price: "desc" },
        select: { user: true },
      });

      if (lastBidder) {
        return lastBidder.user;
      }

      return null;
    }),

  getOne: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => {
      if (!input.id) return null;
      return ctx.prisma.auction.findUnique({
        where: { id: input.id },
        include: { prizes: true },
      });
    }),

  close: protectedProcedure
    .input(z.object({ auctionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await firebase.auction.close(input.auctionId);

      const auction = await ctx.prisma.auction.findUnique({
        where: { id: input.auctionId },
        select: { bids: true, closedAt: true, companyId: true },
      });

      if (!auction) {
        throw new Error("Auction not found");
      }
      if (auction.closedAt) {
        throw new Error("Auction already closed");
      }

      const lastBid = auction.bids[auction.bids.length - 1];

      if (!lastBid) {
        await firebase.auction.cancelClose(input.auctionId);
        throw new Error("No bids");
      }

      await ctx.prisma.auction.update({
        where: { id: input.auctionId },
        data: {
          price: lastBid.price,
          closedAt: new Date(),
          winnerId: lastBid.userId,
        },
      });

      return true;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        price: z.number(),
        images: z.array(z.string()),
        description: z.string(),
        video: z.string(),
        campaign: z.string(),
        startAt: z.string(),
        startAtPrice: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const auction = await ctx.prisma.auction.create({
        data: {
          name: input.name,
          price: input.price,
          //images: input.images,
          // to fix
          startAtPrice: input.startAtPrice,
          campaignId: input.campaign,
          description: input.description,
          video: input.video,
          startAt: input.startAt,
          companyId: ctx.session.user.companyId,
          views: 0,
        },
      });
      await firebase.auction
        .update(auction.id, {
          currentBid: 0,
          lastUpdate: new Date(),
        })
        .catch((e) => console.log(e));
      return auction;
    }),
  userWins: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const auctions = await ctx.prisma.auction.findMany({
        where: {
          winnerId: input.userId,
        },
        include: {
          prizes: true,
          campaign: true,
        },
      });
      return auctions;
    }),

  makeBid: protectedProcedure
    .input(
      z.object({
        auctionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const timer = await firebase.timer.touch(input.auctionId);
        if (!timer.success) {
          throw new Error("Auction is closed");
        }
      } catch (e) {
        console.log("errr", e);

        throw new Error("Auction is closed");
      }

      const oldAuction = await ctx.prisma.auction.findUnique({
        where: { id: input.auctionId },
      });
      if (!oldAuction) throw new Error("Auction not found");
      const userCredits = await ctx.prisma.userCredits.findFirst({
        where: {
          userId: ctx.session.user.id,
          campaignId: oldAuction.campaignId,
        },
      });
      if (!userCredits || userCredits.amount < 1)
        throw new Error("Not enough credits");

      const current_auction = await firebase.auction.get(oldAuction.id);
      if (current_auction.currentBidderId === ctx.session.user.id)
        throw new Error("You are already the highest bidder");
      await firebase.auction
        .update(input.auctionId, {
          currentBidderId: ctx.session.user.id,
          currentBidderImage: ctx?.session?.user?.image || undefined,
          lastUpdate: new Date(),
          currentBid: (current_auction?.currentBid ?? 0) + 0.01,

          currentBidderName:
            ctx.session.user.username ||
            ctx.session.user.name + (ctx.session.user.lName || ""),
        })
        .catch((e) => console.log(e));

      const auction = await ctx.prisma.auction.update({
        where: { id: input.auctionId },
        data: { price: oldAuction.price + 0.01 },
      });

      await ctx.prisma.bid.create({
        data: {
          auctionId: input.auctionId,
          userId: ctx.session.user.id,
          price: (current_auction?.currentBid ?? 0) + 0.01,
          name:
            ctx.session.user.username ||
            ctx.session.user.name + (ctx.session.user.lName || ""),
        },
      });

      await ctx.prisma.userCredits.update({
        where: { id: userCredits.id },
        data: { amount: { decrement: 1 } },
      });

      return auction;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      console.log({ input });
      return ctx.prisma.auction.delete({ where: { id: input.id } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        startAtPrice: z.number().optional(),
        name: z.string().optional(),
        price: z.number().optional(),
        description: z.string().optional(),
        prizes: z
          .array(
            z.object({
              id: z.string().optional(),
              name: z.string(),
              description: z.string(),
              images: z.array(z.string()),
              category: z.nativeEnum(PrizeCategory),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const auction = await ctx.prisma.auction.findUnique({
        where: { id: input.id },
      });
      if (!auction) throw new Error("Auction not found");
      const oldPrizesIds = [];
      for (const prize of input.prizes ?? []) {
        if (prize.id) {
          oldPrizesIds.push(prize.id);
        }
      }
      const oldPrizes = await ctx.prisma.prize.findMany({
        where: {
          auctionId: input.id,
          id: { notIn: oldPrizesIds },
        },
      });

      for (const prize of oldPrizes) {
        await ctx.prisma.prize.delete({ where: { id: prize.id } });
      }

      for (const prize of input.prizes ?? []) {
        if (prize.id) {
          await ctx.prisma.prize.update({
            where: { id: prize.id },
            data: {
              name: prize.name,
              description: prize.description,
              images: prize.images,
              category: prize.category,
            },
          });
        } else {
          await ctx.prisma.prize.create({
            data: {
              name: prize.name,
              campaignId: auction.campaignId,
              description: prize.description,
              images: prize.images,
              category: prize.category,
              auctionId: auction.id,
            },
          });
        }
      }

      return ctx.prisma.auction.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          price: input.price,
          //images: input.images,
          startAtPrice: input.startAtPrice,
          // to fix
          description: input.description,
          // video: input.video,
        },
      });
    }),

  updateView: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.auction.update({
        where: {
          id: input.id,
        },
        data: {
          views: {
            increment: 1,
          },
        },
      });
    }),

  sumAuctionCompleted: superAdminProcedure.query(async ({ ctx }) => {
    const auctions = await ctx.prisma.auction.findMany({
      where: {
        closedAt: {
          not: null,
        },
      },
    });
    return auctions.length;
  }),

  // addCampaignAmount: protectedProcedure
  // .input(
  //   z.object({
  //     auctionId: z.string(),
  //   })
  // )
  // .mutation(({ ctx, input }) => {
  //   console.log({input})
  // })
});
