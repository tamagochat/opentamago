import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fileShareChannels } from "~/server/db/schema";
import { generateShortSlug, generateLongSlug, P2P_CONFIG } from "~/lib/p2p";

const BCRYPT_ROUNDS = 12;

export const p2pRouter = createTRPCRouter({
  // Get PeerJS configuration
  getConfig: publicProcedure.query(() => {
    return {
      host: process.env.NEXT_PUBLIC_PEERJS_HOST ?? "0.peerjs.com",
      path: process.env.NEXT_PUBLIC_PEERJS_PATH ?? "/",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }),

  // Create a new file sharing channel
  createChannel: publicProcedure
    .input(
      z.object({
        uploaderPeerId: z.string().min(1),
        fileName: z.string().optional(),
        fileSize: z.number().int().nonnegative().optional(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { uploaderPeerId, fileName, fileSize, password } = input;

      // Generate unique slugs with retry
      let shortSlug: string | null = null;
      let longSlug: string | null = null;

      for (let i = 0; i < P2P_CONFIG.MAX_SLUG_ATTEMPTS; i++) {
        const candidateShort = generateShortSlug();
        const candidateLong = generateLongSlug();

        // Check if slugs already exist
        const existing = await ctx.db.query.fileShareChannels.findFirst({
          where: or(
            eq(fileShareChannels.shortSlug, candidateShort),
            eq(fileShareChannels.longSlug, candidateLong)
          ),
        });

        if (!existing) {
          shortSlug = candidateShort;
          longSlug = candidateLong;
          break;
        }
      }

      if (!shortSlug || !longSlug) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate unique slug",
        });
      }

      const secret = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + P2P_CONFIG.CHANNEL_TTL * 1000);

      // Hash password with bcrypt (includes salt automatically)
      let passwordHash: string | null = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      }

      const [channel] = await ctx.db
        .insert(fileShareChannels)
        .values({
          shortSlug,
          longSlug,
          secret,
          uploaderPeerId,
          fileName,
          fileSize,
          hasPassword: !!password,
          passwordHash,
          expiresAt,
        })
        .returning();

      return {
        id: channel!.id,
        shortSlug: channel!.shortSlug,
        longSlug: channel!.longSlug,
        secret: channel!.secret,
        uploaderPeerId: channel!.uploaderPeerId,
      };
    }),

  // Fetch channel by slug (for download page)
  getChannel: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const { slug } = input;

      const channel = await ctx.db.query.fileShareChannels.findFirst({
        where: or(
          eq(fileShareChannels.shortSlug, slug),
          eq(fileShareChannels.longSlug, slug)
        ),
      });

      if (!channel) {
        return null;
      }

      // Check if expired
      if (channel.expiresAt < new Date()) {
        await ctx.db
          .delete(fileShareChannels)
          .where(eq(fileShareChannels.id, channel.id));
        return null;
      }

      return {
        id: channel.id,
        uploaderPeerId: channel.uploaderPeerId,
        fileName: channel.fileName,
        fileSize: channel.fileSize,
        hasPassword: channel.hasPassword,
      };
    }),

  // Renew channel TTL
  renewChannel: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        secret: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, secret } = input;

      const channel = await ctx.db.query.fileShareChannels.findFirst({
        where: or(
          eq(fileShareChannels.shortSlug, slug),
          eq(fileShareChannels.longSlug, slug)
        ),
      });

      if (!channel || channel.secret !== secret) {
        return { success: false };
      }

      const newExpiresAt = new Date(Date.now() + P2P_CONFIG.CHANNEL_TTL * 1000);

      await ctx.db
        .update(fileShareChannels)
        .set({
          expiresAt: newExpiresAt,
          lastRenewedAt: new Date(),
        })
        .where(eq(fileShareChannels.id, channel.id));

      return { success: true };
    }),

  // Destroy channel
  destroyChannel: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        secret: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, secret } = input;

      const channel = await ctx.db.query.fileShareChannels.findFirst({
        where: or(
          eq(fileShareChannels.shortSlug, slug),
          eq(fileShareChannels.longSlug, slug)
        ),
      });

      if (!channel) {
        return { success: false };
      }

      if (secret && channel.secret !== secret) {
        return { success: false };
      }

      await ctx.db
        .delete(fileShareChannels)
        .where(eq(fileShareChannels.id, channel.id));

      return { success: true };
    }),

  // Verify password
  verifyPassword: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, password } = input;

      const channel = await ctx.db.query.fileShareChannels.findFirst({
        where: or(
          eq(fileShareChannels.shortSlug, slug),
          eq(fileShareChannels.longSlug, slug)
        ),
      });

      if (!channel || !channel.passwordHash) {
        return { valid: false };
      }

      const valid = await bcrypt.compare(password, channel.passwordHash);
      return { valid };
    }),
});
