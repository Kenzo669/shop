import { NextResponse, type NextRequest } from "next/server";
import { authed } from "@/lib/auth";
import { currentTenant } from "@/lib/db";
import { chat, history, latestConversation } from "@/lib/assistant";

export const dynamic = "force-dynamic";

/** Dernière conversation de l'utilisateur (ou celle demandée). */
function GET_handler(req: NextRequest) {
  const userId = currentTenant().userId!;
  const conversationId = req.nextUrl.searchParams.get("conversationId") ?? latestConversation(userId);
  return NextResponse.json({ conversationId, messages: conversationId ? history(userId, conversationId) : [] });
}

/** Envoie un message ; la réponse arrive en flux (Server-Sent Events). */
async function POST_handler(req: Request) {
  const { message, conversationId } = (await req.json().catch(() => ({}))) as { message?: string; conversationId?: string | null };
  const text = message?.trim();
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (text.length > 8000) return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  const userId = currentTenant().userId!;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (e: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      chat(userId, conversationId ?? null, text, send)
        .catch((err) => send({ type: "error", message: err instanceof Error ? err.message : String(err) }))
        .finally(() => controller.close());
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

export const GET = authed("GET", GET_handler);
export const POST = authed("POST", POST_handler);
