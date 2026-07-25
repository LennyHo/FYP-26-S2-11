import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const configuredBase = process.env.DRIPTEA_API_BASE?.trim();
    const backendBases = [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      configuredBase,
      'https://driptea-trrn.onrender.com',
    ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

    let backendResponse: Response | null = null;
    let lastNetworkError: unknown = null;

    for (const backendBase of backendBases) {
      try {
        backendResponse = await fetch(`${backendBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          cache: 'no-store',
        });
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }

    if (!backendResponse) {
      throw lastNetworkError instanceof Error
        ? lastNetworkError
        : new Error('Unable to connect to the DripTea backend.');
    }

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
        reply: `Connection failed: ${message}. Start the DripTea backend in c:\\FYP\\FYP-26-S2-11\\DripTea_V1 and set DRIPTEA_API_BASE if your backend uses a different host or port.`,
        system_action: { ui_navigation: 'none' },
      },
      { status: 502 }
    );
  }
}
