import { z } from "zod";

import { feedback } from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        feedbackType: z.enum(["bug", "feature", "other"]),
        message: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(feedback).values({
        userId: ctx.session.user.id,
        feedbackType: input.feedbackType,
        message: input.message ?? null,
      });
      return { success: true };
    }),
});
