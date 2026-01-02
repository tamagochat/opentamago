import { z } from "zod";
import { eq, or, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { connectSessions, connectParticipants } from "~/server/db/schema";
import {
  generateShortSlug,
  generateLongSlug,
  CONNECT_CONFIG,
} from "~/lib/connect";

export const connectRouter = createTRPCRouter({
  // Get PeerJS configuration (reuse from p2p)
  getConfig: publicProcedure.query(() => {
    return {
      host: process.env.NEXT_PUBLIC_PEERJS_HOST ?? "0.peerjs.com",
      path: process.env.NEXT_PUBLIC_PEERJS_PATH ?? "/",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }),

  // Create a new connect session
  createSession: publicProcedure
    .input(
      z.object({
        hostPeerId: z.string().min(1),
        characterName: z.string().min(1),
        characterAvatar: z.string().optional(),
        maxParticipants: z.number().int().min(2).max(8).default(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { hostPeerId, characterName, characterAvatar, maxParticipants } =
        input;

      // Generate unique slugs with retry
      let shortSlug: string | null = null;
      let longSlug: string | null = null;

      for (let i = 0; i < CONNECT_CONFIG.MAX_SLUG_ATTEMPTS; i++) {
        const candidateShort = generateShortSlug();
        const candidateLong = generateLongSlug();

        // Check if slugs already exist
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

      const expiresAt = new Date(
        Date.now() + CONNECT_CONFIG.SESSION_TTL * 1000
      );

      // Create session
      const [session] = await ctx.db
        .insert(connectSessions)
        .values({
          shortSlug,
          longSlug,
          hostPeerId,
          maxParticipants,
          expiresAt,
        })
        .returning();

      // Add host as first participant
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

  // Get session info for joining
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

      // Check if expired
      if (session.expiresAt < new Date()) {
        // Clean up expired session
        await ctx.db
          .delete(connectSessions)
          .where(eq(connectSessions.id, session.id));
        return null;
      }

      // Filter active participants (not left)
      const activeParticipants = session.participants.filter(
        (p) => p.leftAt === null
      );

      return {
        id: session.id,
        hostPeerId: session.hostPeerId,
        maxParticipants: session.maxParticipants,
        participants: activeParticipants.map((p) => ({
          peerId: p.peerId,
          characterName: p.characterName,
          characterAvatar: p.characterAvatar,
          isHost: p.isHost,
        })),
        isFull: activeParticipants.length >= (session.maxParticipants ?? 8),
      };
    }),

  // Join session
  joinSession: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        peerId: z.string().min(1),
        characterName: z.string().min(1),
        characterAvatar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, peerId, characterName, characterAvatar } = input;

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

      // Check if expired
      if (session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session has expired",
        });
      }

      // Check if already a participant
      const existingParticipant = session.participants.find(
        (p) => p.peerId === peerId && p.leftAt === null
      );

      if (existingParticipant) {
        // Already joined, just return success
        return {
          success: true,
          sessionId: session.id,
          hostPeerId: session.hostPeerId,
        };
      }

      // Check if session is full
      const activeParticipants = session.participants.filter(
        (p) => p.leftAt === null
      );
      if (activeParticipants.length >= (session.maxParticipants ?? 8)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Session is full",
        });
      }

      // Add participant
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

  // Leave session
  leaveSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number().int(),
        peerId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, peerId } = input;

      // Mark participant as left
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

      // Check if this was the host
      const session = await ctx.db.query.connectSessions.findFirst({
        where: eq(connectSessions.id, sessionId),
      });

      if (session?.hostPeerId === peerId) {
        // Host left, end session
        await ctx.db
          .delete(connectSessions)
          .where(eq(connectSessions.id, sessionId));
      }

      return { success: true };
    }),

  // Heartbeat to keep session alive
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

      const newExpiresAt = new Date(
        Date.now() + CONNECT_CONFIG.SESSION_TTL * 1000
      );

      await ctx.db
        .update(connectSessions)
        .set({
          expiresAt: newExpiresAt,
          lastActivityAt: new Date(),
        })
        .where(eq(connectSessions.id, session.id));

      return { success: true };
    }),

  // Destroy session (host only)
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
});
