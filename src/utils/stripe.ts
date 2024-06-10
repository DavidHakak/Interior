import { Stripe } from "stripe";
import { env } from "~/env.mjs";

export const stripeClient = new Stripe(env.NEXT_PUBLIC_STRIPE_API_KEY, {
  apiVersion: "2022-11-15",
});
