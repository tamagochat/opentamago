import { authRouter } from "./router/auth";
import { connectRouter } from "./router/connect";
import { feedbackRouter } from "./router/feedback";
import { p2pRouter } from "./router/p2p";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  feedback: feedbackRouter,
  p2p: p2pRouter,
  connect: connectRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
