import { z } from "zod";

import { feedback } from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(["bug", "feature", "other"]),
        message: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(feedback).values({
        userId: ctx.session.user.id,
        type: input.type,
        message: input.message ?? null,
      });
      return { success: true };
    }),
});
