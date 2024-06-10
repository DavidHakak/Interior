import { ref, onChildAdded, push } from "firebase/database";
import { z } from "zod";
import { rtDB } from "./";

const msgSchema = z.object({
  message: z.string(),
  createdAt: z.string().transform((date) => new Date(date)),
  userId: z.string(),
  userName: z.string(),
  userImage: z.string().optional(),
  id: z.string(),
});

export type Msg = z.infer<typeof msgSchema> & { id: string };

export const subscribe = (
  campaighnId: string,
  callback: (data: Msg, key: string) => void
) => {
  const chatRef = ref(rtDB, `campaign/${campaighnId}/chat`);
  return onChildAdded(chatRef, (snapshot) => {
    const data = snapshot.val();
    const key = snapshot.key;
    if (!key || !data) return;
    data.id = key;
    const result = msgSchema.safeParse(data);
    if (!result.success) return;
    callback(result.data, key);
  });
};

export const sendMsg = ({
  campaignId,
  message,
  userId,
}: {
  campaignId: string;
  message: string;
  userId: string;
}) => {
  const chatRef = ref(rtDB, `campaign/${campaignId}/chat`);
  return push(chatRef, {
    message,
    createdAt: new Date().toISOString(),
    userId,
  });
};

export default {
  subscribe,
  sendMsg,
};
