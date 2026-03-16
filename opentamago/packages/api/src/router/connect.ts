import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod/v4";

import { connectParticipants, connectSessions } from "@acme/db/schema";

import { publicProcedure } from "../trpc";

// Inline constants to avoid @acme/p2p dependency
const CONNECT_SHORT_SLUG_LENGTH = 6;
const CONNECT_SHORT_SLUG_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const CONNECT_SLUG_WORDS_LIST = [
  "angel", "brave", "charm", "dream", "ember",
  "frost", "grace", "heart", "ivory", "jewel",
  "karma", "lunar", "magic", "noble", "ocean",
  "pearl", "quest", "raven", "solar", "tiger",
  "unity", "velvet", "whisper", "zenith", "aura",
  "blaze", "crystal", "divine", "echo", "flame",
  "glimmer", "haven", "iris", "jade", "knight",
  "lotus", "mist", "nova", "opal", "prism",
  "quartz", "rose", "spark", "twilight", "umbra",
  "violet", "wonder", "spirit",
];
const CONNECT_MAX_SLUG_ATTEMPTS = 8;
const CONNECT_SESSION_TTL = 4 * 60 * 60; // 4 hours in seconds

function generateShortSlug(): string {
  let result = "";
  for (let i = 0; i < CONNECT_SHORT_SLUG_LENGTH; i++) {
    result += CONNECT_SHORT_SLUG_CHARS.charAt(
      Math.floor(Math.random() * CONNECT_SHORT_SLUG_CHARS.length)
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
      index = Math.floor(Math.random() * CONNECT_SLUG_WORDS_LIST.length);
    } while (usedIndices.has(index));
    usedIndices.add(index);
    words.push(CONNECT_SLUG_WORDS_LIST[index]!);
  }
  return words.join("-");
}

export const connectRouter = {
  getConfig: publicProcedure.query(() => {
    return {
      host: process.env.NEXT_PUBLIC_PEERJS_HOST ?? "0.peerjs.com",
      path: process.env.NEXT_PUBLIC_PEERJS_PATH ?? "/",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }),

  createSession: publicProcedure
    .input(
      z.object({
        hostPeerId: z.string().min(1),
        characterName: z.string().min(1),
        characterAvatar: z.string().optional(),
        maxParticipants: z.number().int().min(2).max(8).default(8),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { hostPeerId, characterName, characterAvatar, maxParticipants, password } =
        input;

      let shortSlug: string | null = null;
      let longSlug: string | null = null;

      for (let i = 0; i < CONNECT_MAX_SLUG_ATTEMPTS; i++) {
        const candidateShort = generateShortSlug();
        const candidateLong = generateLongSlug();

        const existing = await ctx.db.query.connectSessions.findFirst({
          where: or(
            eq(connectSessions.shortSlug, candidateShort),
            eq(connectSessions.longSlug, candidateLong)
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

      const expiresAt = new Date(Date.now() + CONNECT_SESSION_TTL * 1000);

      let passwordHash: string | null = null;
      if (password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        passwordHash = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }

      const [session] = await ctx.db
        .insert(connectSessions)
        .values({
          shortSlug,
          longSlug,
          hostPeerId,
          maxParticipants,
          passwordHash,
          expiresAt,
        })
        .returning();

      await ctx.db.insert(connectParticipants).values({
        sessionId: session!.id,
        peerId: hostPeerId,
        characterName,
        characterAvatar,
        isHost: true,
      });

      return {
        id: session!.id,
        shortSlug: session!.shortSlug,
        longSlug: session!.longSlug,
        hostPeerId: session!.hostPeerId,
      };
    }),

  getSession: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const { slug } = input;

      const session = await ctx.db.query.connectSessions.findFirst({
        where: or(
          eq(connectSessions.shortSlug, slug),
          eq(connectSessions.longSlug, slug)
        ),
        with: {
          participants: true,
        },
      });

      if (!session) {
        return null;
      }

      if (session.expiresAt < new Date()) {
        await ctx.db
          .delete(connectSessions)
          .where(eq(connectSessions.id, session.id));
        return null;
      }

      const activeParticipants = session.participants.filter(
        (p) => p.leftAt === null
      );

      return {
        id: session.id,
        hostPeerId: session.hostPeerId,
        maxParticipants: session.maxParticipants,
        hasPassword: !!session.passwordHash,
        participants: activeParticipants.map((p) => ({
          peerId: p.peerId,
          characterName: p.characterName,
          characterAvatar: p.characterAvatar,
          isHost: p.isHost,
        })),
        isFull: activeParticipants.length >= (session.maxParticipants ?? 8),
      };
    }),

  joinSession: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        peerId: z.string().min(1),
        characterName: z.string().min(1),
        characterAvatar: z.string().optional(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, peerId, characterName, characterAvatar, password } = input;

      const session = await ctx.db.query.connectSessions.findFirst({
        where: or(
          eq(connectSessions.shortSlug, slug),
          eq(connectSessions.longSlug, slug)
        ),
        with: {
          participants: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      if (session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session has expired",
        });
      }

      if (session.passwordHash) {
        if (!password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Password required",
          });
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        if (inputHash !== session.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      const existingParticipant = session.participants.find(
        (p) => p.peerId === peerId && p.leftAt === null
      );

      if (existingParticipant) {
        return {
          success: true,
          sessionId: session.id,
          hostPeerId: session.hostPeerId,
        };
      }

      const activeParticipants = session.participants.filter(
        (p) => p.leftAt === null
      );
      if (activeParticipants.length >= (session.maxParticipants ?? 8)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Session is full",
        });
      }

      await ctx.db.insert(connectParticipants).values({
        sessionId: session.id,
        peerId,
        characterName,
        characterAvatar,
        isHost: false,
      });

      return {
        success: true,
        sessionId: session.id,
        hostPeerId: session.hostPeerId,
      };
    }),

  leaveSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number().int(),
        peerId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, peerId } = input;

      await ctx.db
        .update(connectParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(connectParticipants.sessionId, sessionId),
            eq(connectParticipants.peerId, peerId),
            isNull(connectParticipants.leftAt)
          )
        );

      const session = await ctx.db.query.connectSessions.findFirst({
        where: eq(connectSessions.id, sessionId),
      });

      if (session?.hostPeerId === peerId) {
        await ctx.db
          .delete(connectSessions)
          .where(eq(connectSessions.id, sessionId));
      }

      return { success: true };
    }),

  heartbeat: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug } = input;

      const session = await ctx.db.query.connectSessions.findFirst({
        where: or(
          eq(connectSessions.shortSlug, slug),
          eq(connectSessions.longSlug, slug)
        ),
      });

      if (!session) {
        return { success: false };
      }

      const newExpiresAt = new Date(Date.now() + CONNECT_SESSION_TTL * 1000);

      await ctx.db
        .update(connectSessions)
        .set({
          expiresAt: newExpiresAt,
          lastActivityAt: new Date(),
        })
        .where(eq(connectSessions.id, session.id));

      return { success: true };
    }),

  destroySession: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        hostPeerId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, hostPeerId } = input;

      const session = await ctx.db.query.connectSessions.findFirst({
        where: or(
          eq(connectSessions.shortSlug, slug),
          eq(connectSessions.longSlug, slug)
        ),
      });

      if (!session || session.hostPeerId !== hostPeerId) {
        return { success: false };
      }

      await ctx.db
        .delete(connectSessions)
        .where(eq(connectSessions.id, session.id));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
