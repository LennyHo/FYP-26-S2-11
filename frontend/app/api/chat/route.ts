import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendBase = process.env.DRIPTEA_API_BASE || 'http://localhost:3000';

    const backendResponse = await fetch(`${backendBase}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await backendResponse.text();

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        reply: text || 'Backend returned a non-JSON response.',
        system_action: { ui_navigation: 'none' },
      };
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to connect to DripTea backend';

    return NextResponse.json(
      {
        reply: `Connection failed: ${message}. Start DripTea backend and set DRIPTEA_API_BASE if needed.`,
        system_action: { ui_navigation: 'none' },
      },
      { status: 502 }
    );
  }
}
