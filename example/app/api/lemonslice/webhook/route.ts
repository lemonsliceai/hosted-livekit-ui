// Demo stand-in for your webhook receiver.

const TERMINATE_AFTER_CREDITS = Number(process.env.TERMINATE_AFTER_CREDITS ?? 30);

type UsageEvent = {
  event: "session.usage";
  session_id: string;
  credits_used_total: number;
  occurred_at: string;
};

type SessionEndedEvent = {
  event: "session.ended";
  session_id: string;
  credits_used_total: number;
  started_at: string | null;
  ended_at: string;
  full_transcript: { role: "user" | "avatar"; text: string; occurred_at: string }[];
};

export async function POST(request: Request) {
  let payload: UsageEvent | SessionEndedEvent;
  try {
    payload = await request.json();
  } catch {
    console.error("[webhook] body was not JSON");
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[webhook] ${payload.event}`, JSON.stringify(payload, null, 2));

  if (payload.event === "session.usage") {
    const terminate = payload.credits_used_total >= TERMINATE_AFTER_CREDITS;
    console.log(
      `[webhook] ${payload.session_id} used ${payload.credits_used_total.toFixed(2)}` +
        ` of ${TERMINATE_AFTER_CREDITS} credits → terminate=${terminate}`,
    );
    // LemonSlice ends the call when this is true. Anything else keeps it running.
    return Response.json({ terminate });
  }

  if (payload.event === "session.ended") {
    const turns = payload.full_transcript?.length ?? 0;
    console.log(
      `[webhook] ${payload.session_id} ended — ${payload.credits_used_total.toFixed(2)}` +
        ` credits, ${turns} transcript turn(s)`,
    );
    for (const turn of payload.full_transcript ?? []) {
      console.log(`  ${turn.role.padEnd(6)} ${turn.text}`);
    }
    // Any 2xx acks it.
    return Response.json({ received: true });
  }

  console.warn("[webhook] unrecognised event", (payload as { event?: string }).event);
  return Response.json({ received: true });
}
