import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { z } from "zod/v4";

import { fileShareChannels } from "@acme/db/schema";

import { publicProcedure } from "../trpc";

const BCRYPT_ROUNDS = 12;

// Slug generation helpers (inline to avoid @acme/p2p dependency in api package)
const P2P_SHORT_SLUG_LENGTH = 8;
const P2P_SHORT_SLUG_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const P2P_LONG_SLUG_WORDS_LIST = [
  "angel", "brave", "charm", "dream", "ember",
  "frost", "grace", "heart", "ivory", "jewel",
  "karma", "lunar", "magic", "noble", "ocean",
  "pearl", "quest", "raven", "solar", "tiger",
  "unity", "velvet", "whisper", "xenon", "youth",
  "zephyr", "aura", "blaze", "crystal", "divine",
  "echo", "flame", "glimmer", "haven", "iris",
  "jade", "knight", "lotus", "mist", "nova",
  "opal", "prism", "quartz", "rose", "spark",
  "twilight", "umbra", "violet", "wonder", "zenith",
];
const P2P_MAX_SLUG_ATTEMPTS = 8;
const P2P_CHANNEL_TTL = 60 * 60; // 1 hour in seconds

function generateShortSlug(): string {
  let result = "";
  for (let i = 0; i < P2P_SHORT_SLUG_LENGTH; i++) {
    result += P2P_SHORT_SLUG_CHARS.charAt(
      Math.floor(Math.random() * P2P_SHORT_SLUG_CHARS.length)
    );
  }
  return result;
}

function generateLongSlug(): string {
  const words: string[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < 4; i++) {
    let index: number;
    do {
      index = Math.floor(Math.random() * P2P_LONG_SLUG_WORDS_LIST.length);
    } while (usedIndices.has(index));
    usedIndices.add(index);
    words.push(P2P_LONG_SLUG_WORDS_LIST[index]!);
  }
  return words.join("/");
}

export const p2pRouter = {
  getConfig: publicProcedure.query(() => {
    return {
      host: process.env.NEXT_PUBLIC_PEERJS_HOST ?? "0.peerjs.com",
      path: process.env.NEXT_PUBLIC_PEERJS_PATH ?? "/",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }),

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

      let shortSlug: string | null = null;
      let longSlug: string | null = null;

      for (let i = 0; i < P2P_MAX_SLUG_ATTEMPTS; i++) {
        const candidateShort = generateShortSlug();
        const candidateLong = generateLongSlug();

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
      const expiresAt = new Date(Date.now() + P2P_CHANNEL_TTL * 1000);

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

      const newExpiresAt = new Date(Date.now() + P2P_CHANNEL_TTL * 1000);

      await ctx.db
        .update(fileShareChannels)
        .set({
          expiresAt: newExpiresAt,
          lastRenewedAt: new Date(),
        })
        .where(eq(fileShareChannels.id, channel.id));

      return { success: true };
    }),

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
} satisfies TRPCRouterRecord;
