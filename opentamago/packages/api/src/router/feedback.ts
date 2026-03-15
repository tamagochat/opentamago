import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { feedback } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const feedbackRouter = {
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
} satisfies TRPCRouterRecord;
