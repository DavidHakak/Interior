import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
// import { MauticClient } from "mautic";

// const client = new MauticClient({
//   baseUrl: "https://mautic.leadstunnel.com",
//   auth: {
//     username: "luiz",
//     password: "shhhhhhhhhhhhhh!:x",
//   },
// });

export const userInvitationsRouter = createTRPCRouter({
  // getAll: adminProcedure.query(async ({ ctx, input }) => {
  //   const auction = await ctx.prisma.userCompany.findMany({
  //     where: {
  //       companyId: ctx.session.user.companyId,
  //     },
  //   });

  //   return auction;
  // }),

  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      console.log("userInvitationsRouter delete");

      // const auction = await ctx.prisma.userCompany

      // return auction;
    }),

  // create: adminProcedure
  //   .input(
  //     z.object({
  //       fname: z.string(),
  //       lname: z.string(),
  //       email: z.string().email(),
  //       phone: z.string().min(10).max(16),
  //       companyId: z.string(),
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     await ctx.prisma.userCompany.create({
  //       data: {
  //         fname: input.fname,
  //         lname: input.lname,
  //         email: input.email,
  //         phone: input.phone,
  //         companyId: ctx.session.user.companyId,
  //       },
  //     });

  //     // const response: any = await client.contacts.create({
  //     //      firstname: input.fname,
  //     //      lastname: input.lname,
  //     //      email: input.email,
  //     //      status: input.status,
  //     //      companyId: ctx.session.user.companyId,
  //     // });

  //     //    return auction;
  //   }),

  createByFile: adminProcedure.mutation(({ ctx, input }) => {
    console.log("userInvitationsRouter createByFile");
  }),

  update: adminProcedure
    // .input(
    //   z.object({
    //     id: z.string(),
    //     data: z.object({
    //       fname: z.string(),
    //       lname: z.string(),
    //       email: z.string().email(),
    //       phone: z.string().min(10).max(16),
    //     }),
    //   })
    // )
    .mutation(({ ctx, input }) => {
      console.log("userInvitationsRouter update", input);

      // const auction = await ctx.prisma.userCompany

      // return auction;
    }),

  // updateStatus: adminProcedure
  //   .input(
  //     z.object({
  //       id: z.string(),
  //       status: z.boolean(),
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     await ctx.prisma.userCompany.update({
  //       where: {
  //         id: input.id,
  //       },
  //       data: {
  //         status: input.status,
  //       },
  //     });
  //   }
  //   ),
});
