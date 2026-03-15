import { db } from "~/server/db";
import { connectSessions, connectParticipants } from "~/server/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, peerId, isHost, slug } = body as {
      sessionId?: number;
      peerId?: string;
      isHost?: boolean;
      slug?: string;
    };

    if (!peerId) {
      return new Response("Missing peerId", { status: 400 });
    }

    // If host, destroy the session
    if (isHost && slug) {
      const session = await db.query.connectSessions.findFirst({
        where: or(
          eq(connectSessions.shortSlug, slug),
          eq(connectSessions.longSlug, slug)
        ),
      });

      if (session && session.hostPeerId === peerId) {
        await db
          .delete(connectSessions)
          .where(eq(connectSessions.id, session.id));
      }
    } else if (sessionId) {
      // Mark participant as left
      await db
        .update(connectParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(connectParticipants.sessionId, sessionId),
            eq(connectParticipants.peerId, peerId),
            isNull(connectParticipants.leftAt)
          )
        );
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error leaving session:", error);
    return new Response("Internal error", { status: 500 });
  }
}
