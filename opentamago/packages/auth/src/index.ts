import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";
import * as authSchema from "@acme/db/schema";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  discordClientId: string;
  discordClientSecret: string;
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authSchema.user,
        session: authSchema.session,
        account: authSchema.account,
        verification: authSchema.verification,
      },
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      ...(options.extraPlugins ?? []),
    ],
    socialProviders: {
      discord: {
        clientId: options.discordClientId,
        clientSecret: options.discordClientSecret,
        redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
      },
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
