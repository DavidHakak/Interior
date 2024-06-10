import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  superAdminProcedure,
} from "~/server/api/trpc";

export const companyRouter = createTRPCRouter({
  getOne: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log({ input });

      const company = await ctx.prisma.company.findFirst({
        where: { id: input.id },
        include: { address: true, bankDetails: true },
      });
      console.log({ company });

      return company;
    }),

  getOneByCampaignId: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.prisma.company.findFirst({
        where: { campaigns: { some: { id: input.campaignId } } },
        include: { address: true, bankDetails: true },
      });
      return company;
    }),

  getAll: superAdminProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.company.findMany();
  }),

  create: superAdminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        address: z.object({
          country: z.string(),
          city: z.string(),
          line1: z.string(),
          state: z.string(),
          postal_code: z.string(),
        }),
        email: z.string(),
        phone: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const address = await ctx.prisma.address.create({
        data: {
          name: input.name,
          country: input.address.country,
          city: input.address.city,
          line1: input.address.line1,
          line2: "",
          state: input.address.state,
          postal_code: input.address.postal_code,
        },
      });
      return await ctx.prisma.company.create({
        data: {
          companyName: input.name,
          email: input.email,
          phone: input.phone,
          addressId: address.id,
          description: input.description,
        },
      });
    }),
});
