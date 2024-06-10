import { onValue, ref } from "firebase/database";
import { z } from "zod";
import { rtDB } from "./";

const timerSchema = z
  .object({
    timeLeftMS: z.number(),
  })
  .nullable();

export type TimerData = z.infer<typeof timerSchema>;

export const subscribeToTimer = (
  auctionId: string,
  callback: (timer: TimerData) => void
) => {
  const timerRef = ref(rtDB, `timer/${auctionId}`);

  return onValue(timerRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) return;

    const timer = timerSchema.safeParse(val);
    if (!timer.success) return;

    callback(timer.data);
  });
};
