import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const prizeRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        auctionId: z.string(),
        images: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const auction = await ctx.prisma.auction.findUnique({
        where: {
          id: input.auctionId,
        },
      });
      if (!auction) {
        throw new Error("Auction not found");
      }
      const prize = await ctx.prisma.prize.create({
        data: {
          name: input.name,
          description: input.description,
          auctionId: input.auctionId,
          images: input.images,
          campaignId: auction.campaignId,
        },
      });

      return prize;
    }),

  winnersForCompany: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;
    if (!companyId) {
      return [];
    }
    const closedAuctions = await ctx.prisma.auction.findMany({
      where: {
        companyId: ctx.session.user.isAdmin ? companyId : undefined,
        winnerId: { not: null },
      },
      include: { winner: true, campaign: true },
    });

    const selectedPrizes = await ctx.prisma.prize.findMany({
      where: {
        auctionId: { in: closedAuctions.map((auction) => auction.id) },
        selected: true,
      },
    });

    const orders = await ctx.prisma.order.findMany({
      where: {
        prizeId: { in: selectedPrizes.map((prize) => prize.id) },
      },
      include: { address: true },
    });

    return closedAuctions.map((auction) => {
      const prize = selectedPrizes.find(
        (prize) => prize.auctionId === auction.id
      );
      const order = orders.find((order) => order.prizeId === prize?.id);
      return { auction, prize, order };
    });
  }),

  winner: protectedProcedure
    .input(
      z.object({
        auctionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const auction = await ctx.prisma.auction.findUnique({
        where: { id: input.auctionId },
        include: { winner: true, campaign: true },
      });

      if (!auction) {
        throw new Error("Auction not found");
      }
      if (!auction.winner) {
        throw new Error("Winner not found");
      }

      const prize = await ctx.prisma.prize.findFirst({
        where: { auctionId: auction.id, selected: true },
      });

      if (!prize) {
        return { auction };
      }

      const order = await ctx.prisma.order.findFirst({
        where: { prizeId: prize.id },
        include: { address: true },
      });

      return { auction, prize, order };
    }),

  updateWinnerAddress: protectedProcedure
    .input(
      z.object({
        oldAddressId: z.string(),
        orderId: z.string(),
        address: z.object({
          line1: z.string().optional(),
          line2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postal_code: z.string().optional(),
          country: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const oldAddress = await ctx.prisma.address.findUnique({
        where: { id: input.oldAddressId },
      });
      if (!oldAddress) {
        throw new Error("Old address not found");
      }

      console.log("new address", { ...oldAddress, ...input.address });

      const address = await ctx.prisma.address.create({
        data: { ...oldAddress, ...input.address, id: undefined },
      });

      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { addressId: address.id },
      });

      return address;
    }),

  getAllPrizesImagesByAuction: publicProcedure
    .input(z.object({ auctionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prizes = await ctx.prisma.prize.findMany({
        where: { auctionId: input.auctionId },
      });

      const allImages = prizes?.flatMap((prize) => prize.images);

      return allImages;
    }),

  getPrizesByAuctionId: publicProcedure
    .input(
      z.object({
        pagination: z
          .object({
            take: z.number().optional(),
            skip: z.number().optional(),
          })
          .optional(),
        auctionId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.prize.findMany({
        where: {
          auctionId: input.auctionId,
        },
        take: input.pagination?.take,
        skip: input.pagination?.skip,
      });
    }),

  getSelectedPrize: protectedProcedure
    .input(z.object({ auctionId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.prize.findFirst({
        where: { auctionId: input.auctionId, selected: true },
      });
    }),

  getUserPrizes: protectedProcedure.query(async ({ ctx }) => {
    const prizes = await ctx.prisma.prize.findMany({
      where: {
        order: {
          some: {
            userId: ctx.session.user.id,
          },
        },
      },
    });

    return prizes;
  }),

  selectPrize: protectedProcedure
    .input(
      z.object({
        prizeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prize = await ctx.prisma.prize.findUnique({
        where: { id: input.prizeId },
      });

      if (!prize || !prize.auctionId) {
        throw new Error("Prize not found");
      }
      const auction = await ctx.prisma.auction.findUnique({
        where: { id: prize.auctionId },
      });

      if (!auction) {
        throw new Error("Auction not found");
      }

      const order = await ctx.prisma.order.create({
        data: {
          userId: ctx.session.user.id,
          prizeId: input.prizeId,
          companyId: ctx.session.user.companyId,
          price: auction.price,
          auctionId: auction.id,
        },
      });

      await ctx.prisma.prize.update({
        where: { id: input.prizeId },
        data: { selected: true },
      });

      return order;
    }),

  checkIfPrizeTypeIsInCampaign: protectedProcedure
    .input(
      z.object({
        prizeCategory: z.string(),
        campaignId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prizes = await ctx.prisma.prize.findMany({
        where: {
          campaignId: input.campaignId,
        },
      });

      const prizeTypes = prizes.map((prize) => prize.category);

      return prizeTypes.length > 0 ? true : false;
    }),
});
