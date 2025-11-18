import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://a2c9799b-d236-49a9-8c7e-396f1c4d8c24-00-2elrt6cp24nmx.spock.replit.dev/api/health",
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: `Upstream error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
