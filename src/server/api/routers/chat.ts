import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import chat from "~/server/firestore/chat";

export const chatRouter = createTRPCRouter({
  sendMsg: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return chat.sendMsg(input.campaignId, ctx.session.user, input.message);
    }),
});
