import { ref, onValue, get } from "firebase/database";
import { z } from "zod";
import { rtDB } from "./";

const auctionSchema = z.object({
  currentBid: z.number().optional().default(0),
  currentBidderId: z.string().optional(),
  currentBidderImage: z.string().optional(),
  lastUpdate: z.string().transform((date) => new Date(date)),
  closedAt: z.string().optional(),
  currentBidderName: z.string().optional(),
});

export type RealTimeAuction = z.infer<typeof auctionSchema>;

export const subscribeToAuction = (
  auctionId: string,
  callback: (auction: RealTimeAuction) => void
) => {
  const auctionRef = ref(rtDB, `auction/${auctionId}`);

  return onValue(auctionRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) return;

    const auction = auctionSchema.safeParse(val);
    if (!auction.success) return;
    if (!auction.data.currentBid) return;

    callback(auction.data);
  });
};

export const getAuction = async (auctionId: string) => {
  const auctionRef = ref(rtDB, `auction/${auctionId}`);
  const snapshot = await get(auctionRef);
  const val = snapshot.val();
  if (!val) return;
  const auction = auctionSchema.safeParse(val);
  if (!auction.success) return;

  return auction.data;
};

export default {
  subscribeToAuction,
  getAuction,
};
