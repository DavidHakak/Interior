import { z } from "zod";
import fs from "fs";
import { Storage } from "@google-cloud/storage";
import { uploadImageBase64 } from "~/server/services/google-cloud-storage";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  superAdminProcedure,
} from "~/server/api/trpc";
import {
  PrizeCategory,
  campaignCategory,
  campaignStatus,
} from "@prisma/client";

const categoryValues = Object.values(campaignCategory);
const campaignCategoryEnum = z.enum(categoryValues as [string, ...string[]]);
const statusValues = Object.values(campaignStatus);

function toCampaignCategory(
  value: string | undefined
): campaignCategory | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Object.values(campaignCategory).includes(value as campaignCategory)
    ? (value as campaignCategory)
    : undefined;
}

export const campaignRouter = createTRPCRouter({
  getActive: publicProcedure
    .input(
      z
        .object({
          filters: z.object({ companyId: z.string().optional() }).optional(),
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
      const { pagination } = input || {};

      return ctx.prisma.campaign.findMany({
        where: {
          // status: "Active",
          companyId: input?.filters?.companyId,
          // auctions length is greater than 0
          auctions: {
            some: {
              startAt: {
                lte: new Date(),
              },
            },
          },
          status: { in: ["Active", "Upcoming"] },
        },
        skip: pagination?.skip,
        take: pagination?.take,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          company: ctx.session?.user.isSuperAdmin,
        },
      });
    }),

  info: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const activeAuctions = await ctx.prisma.auction.count({
        where: {
          campaignId: input.id,
          closedAt: null,
        },
      });

      const activePrizes = await ctx.prisma.prize.count({
        where: {
          auction: {
            campaignId: input.id,
            closedAt: null,
          },
        },
      });

      return {
        activeAuctions,
        activePrizes,
      };
    }),

  getAll: publicProcedure
    .input(
      z
        .object({
          filters: z
            .object({
              // Define your filters schema here
              companyId: z.string().optional(),
              prizeCategories: z.array(z.nativeEnum(PrizeCategory)).optional(),
              status: z.array(z.nativeEnum(campaignStatus)).default([]),
              categories: z.array(z.nativeEnum(campaignCategory)).optional(),
              campaignName: z.string().optional(),
              targetRange: z.array(z.number()).optional(),
              sortBy: z.string().optional(),
            })
            .default({}),
          pagination: z
            .object({
              skip: z.number().optional(),
              take: z.number().optional(),
            })
            .default({}),
        })
        .default({})
    )

    .query(async ({ ctx, input }) => {
      const { pagination } = input || {};

      // Fetch all campaigns with basic pagination and ordering.
      const allCampaigns = await ctx.prisma.campaign.findMany({
        where: {
          status:
            input.filters.status.length > 0
              ? { in: input.filters.status }
              : undefined,
          companyId: input.filters?.companyId,
          name: {
            contains: input.filters?.campaignName?.toLowerCase(),
            mode: "insensitive",
          },
          category: {
            in: input.filters?.categories,
          },
          auctions: input.filters?.prizeCategories
            ? {
                some: {
                  prizes: {
                    some: { category: { in: input.filters?.prizeCategories } },
                  },
                },
              }
            : undefined,
          target: {
            gte: input.filters?.targetRange?.[0],
            lte: input.filters?.targetRange?.[1],
          },
        },
        skip: pagination?.skip,
        take: pagination?.take,
        orderBy: {
          createdAt: input.filters?.sortBy === "desc" ? "desc" : "asc",
        },
        include: {
          company: true,
        },
      });

      // Iterate over each campaign to fetch related auctions and prizes.
      const campaigns = await Promise.all(
        allCampaigns.map(async (campaign) => {
          const auctions = await ctx.prisma.auction.findMany({
            where: {
              campaignId: campaign.id,
              closedAt: null,
            },
          });

          // Initialize totalPrizes for each campaign.
          let totalPrizes = 0;

          // Fetch prizes for each active auction under the current campaign and sum them up.
          await Promise.all(
            auctions.map(async (auction) => {
              const prizeCount = await ctx.prisma.prize.count({
                where: {
                  auctionId: auction.id,
                  campaignId: campaign.id,
                },
              });
              totalPrizes += prizeCount; // Summing up the prizes directly.
            })
          );

          // Construct the final campaign object with additional data.
          return {
            ...campaign,
            sumAuctions: auctions.length, // Assuming you want the count of active auctions.
            sumPrizes: totalPrizes, // Total prizes across all active auctions.
          };
        })
      );

      return campaigns; // This will be an array of campaigns with the added fields.
    }),

  getOne: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.campaign.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  getByOrderId: publicProcedure
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.campaign.findFirst({
        where: {
          auctions: {
            some: {
              id: input.orderId,
            },
          },
        },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        images: z.array(z.string()).optional(),
        description: z.string(),
        category: z.nativeEnum(campaignCategory).optional(),
        video: z.string().optional(),
        target: z.number(),
        startAt: z.string(),
        status: z.nativeEnum(campaignStatus).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      console.log("input", input);
      console.log("data", {
        name: input.name,
        images: input.images,
        description: input.description,
        target: input.target,
        companyId: ctx.session.user.companyId,
        video: input.video || "",
        userId: ctx.session.user.id,
        category: input.category,
        status: input.status,
        startAt: input.startAt,
      });

      return ctx.prisma.campaign.create({
        data: {
          name: input.name,
          images: input.images,
          description: input.description,
          target: input.target,
          companyId: ctx.session.user.companyId,
          video: input.video || "",
          userId: ctx.session.user.id,
          category: input.category,
          status: input.status,
          startAt: input.startAt,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        title: z.string().optional(),
        images: z.array(z.string()).optional(),
        description: z.string().optional(),
        video: z.string().optional(),
        target: z.number().optional(),
        startAt: z.string().optional(),
        status: z.nativeEnum(campaignStatus).optional(),
        category: z.nativeEnum(campaignCategory).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          target: input.target,
          images: input.images,
          description: input.description,
          video: input.video,
          startAt: input.startAt,
          status: input.status as campaignStatus,
          category: input.category as campaignCategory,
        },
      });
    }),

  createTeam: protectedProcedure
    .input(
      z.object({
        teamName: z.string(),
        teamUrl: z.string(),
        slug: z.string().optional(),
        teamTarget: z.number(),
        description: z.string().optional(),
        image: z.string().optional(),
        campaignId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        teamName,
        teamUrl,
        teamTarget,
        description,
        image,
        campaignId,
        slug,
      } = input;

      let teamSlug = slug;
      if (!teamSlug) {
        teamSlug =
          teamUrl.includes("/team/") && teamUrl.split("/team/")[1]
            ? (teamUrl.split("/team/")[1] as string)
            : teamUrl;
      }

      const newTeam = await ctx.prisma.campaignTeam.create({
        data: {
          teamName,
          teamUrl,
          slug: teamSlug,
          teamTarget,
          teamDescription: description || "",
          campaignId,
          image: image || "",
          teamAmount: 0,
        },
      });
      return newTeam;
    }),

  createInfluencer: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        image: z.string().optional(),
        campaignId: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { name, image, campaignId } = input;

      return ctx.prisma.influencer.create({
        data: {
          name,
          campaignId: campaignId,
          image: image || "",
        },
      });
    }),

  getOneTeam: publicProcedure
    .input(
      z.object({
        teamSlug: z.string().optional(),
        campaignId: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => {
      if (!input.teamSlug || !input.campaignId) {
        return null;
      }
      return ctx.prisma.campaignTeam.findFirst({
        where: { slug: input.teamSlug, campaignId: input.campaignId },
        include: { user: true },
      });
    }),

  getAllTeams: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ ctx, input }) => {
      const allTeamsByCampaign = ctx.prisma.campaignTeam.findMany({
        where: {
          campaignId: input.campaignId,
        },
      });
      return allTeamsByCampaign;
    }),

  getAllDonations: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.transaction.findMany({
        where: { campaignId: input.campaignId },
        include: { team: true },
      });
    }),

  getInfuencers: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      const allInfluencers = ctx.prisma.influencer.findMany({
        where: { campaignId: input.campaignId },
      });

      return allInfluencers;
    }),

  removeInfluencer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.influencer.delete({
        where: { id: input.id },
      });
    }),

  removeTeam: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaignTeam.delete({
        where: { id: input.id },
      });
    }),

  categories: publicProcedure.query(({ ctx }) => {
    return categoryValues;
  }),

  dashboardSearch: publicProcedure
    .input(
      z.object({
        query: z.string(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const campaigns = await ctx.prisma.campaign.findMany({
        where: {
          name: {
            contains: input.query,
          },
        },
        take: input.take,
      });
      if (input.take && campaigns.length >= input.take) {
        return campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          link: `/dashboard/campaigns/${campaign.id}`,
          type: "campaign",
        }));
      }
      const auctions = await ctx.prisma.auction.findMany({
        where: {
          name: {
            contains: input.query,
          },
        },
        include: {
          campaign: true,
        },
        take: input.take,
      });
      return [
        ...campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          type: "campaign",
          link: `/dashboard/campaigns/${campaign.id}`,
        })),
        ...auctions.map((auction) => ({
          id: auction.id,
          name: auction.name,
          type: "auction",
          link: `/dashboard/campaigns/${auction.campaignId}/auctions/${auction.id}/edit`,
        })),
      ];
    }),
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const influencers = await ctx.prisma.influencer.deleteMany({
        where: { campaignId: input.id },
      });
      const teams = await ctx.prisma.campaignTeam.deleteMany({
        where: { campaignId: input.id },
      });
      const auctions = await ctx.prisma.auction.deleteMany({
        where: { campaignId: input.id },
      });
      const campaign = await ctx.prisma.campaign.delete({
        where: { id: input.id },
      });
      return { influencers, teams, auctions, campaign };
    }),
});
