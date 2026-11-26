import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function forwardReminderRun(request: NextRequest) {
  const apiBase = (
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL
  )?.replace(/\/$/, "");
  const authorization = request.headers.get("authorization");

  if (!apiBase || !authorization) {
    return NextResponse.json(
      { success: false, message: "Cron configuration is incomplete" },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(`${apiBase}/cron/meeting-reminders`, {
      method: request.method,
      headers: { Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Meeting reminder service is unavailable" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return forwardReminderRun(request);
}

export async function POST(request: NextRequest) {
  return forwardReminderRun(request);
}
