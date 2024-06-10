import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { api } from "~/utils/api";
import "~/styles/globals.css";
import "~/styles/app.css";
import { cn } from "~/utils";
import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import { env } from "~/env.mjs";
import { StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import Head from "next/head";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_API_KEY);

const stripeOptions: StripeElementsOptions = {
  mode: "setup",
  currency: "usd",
};

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Elements stripe={stripePromise} options={stripeOptions}>
        <Head>
          <title>Interior</title>
          <meta name="description" content="1234567890" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} className={cn("bg-white")} />
      </Elements>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
