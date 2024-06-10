import { z } from "zod";
import { env } from "~/env.mjs";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const teamRouter = createTRPCRouter({
  getOne: publicProcedure.input(z.object({
    id: z.string(),
  })
  ).query(async ({ ctx, input }) => {
    const team = await ctx.prisma.campaignTeam.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  }),
});