import { authRouter } from "./router/auth";
import { feedbackRouter } from "./router/feedback";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  feedback: feedbackRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
