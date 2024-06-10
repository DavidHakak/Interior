import { createTRPCRouter } from "~/server/api/trpc";
import { campaignRouter } from "./routers/campaign";
import { auctionRouter } from "./routers/auction";
import { orderRouter } from "./routers/order";
import { usersRouter } from "./routers/users";
import { bidsRouter } from "./routers/bids";
import { cartRouter } from "./routers/cart";
import { chatRouter } from "./routers/chat";
import { userInvitationsRouter } from "./routers/userInvitations";
import { mediaRouter } from "./routers/media";
import { companyRouter } from "./routers/company";
import { payRouter } from "./routers/pay";
import { addressRouter } from "./routers/address";
import { prizeRouter } from "./routers/prizes";
import { teamRouter } from "./routers/team";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auction: auctionRouter,
  campaign: campaignRouter,
  bid: bidsRouter,
  order: orderRouter,
  users: usersRouter,
  pay: payRouter,
  company: companyRouter,
  cart: cartRouter,
  chat: chatRouter,
  media: mediaRouter,
  address: addressRouter,
  userInvitations: userInvitationsRouter,
  prize: prizeRouter,
  team: teamRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
