import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { feedback } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const feedbackRouter = {
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
} satisfies TRPCRouterRecord;
