/**
 * app/api/stream/route.ts
 *
 * Next.js API route that proxies the MJPEG stream from the edge server
 * (localhost:8080) to the browser via the same origin (localhost:3000).
 *
 * This eliminates the CORS/cross-port ERR_CONNECTION_RESET problem that
 * Chrome applies to cross-origin MJPEG streams.
 */

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EDGE_STREAM = 'http://localhost:8080/stream';

export async function GET(req: NextRequest) {
  // Proxy the MJPEG stream from the edge to the browser.
  // ReadableStream lets us pipe the infinite multipart body through.
  const edgeRes = await fetch(EDGE_STREAM, {
    headers: { Connection: 'keep-alive' },
    // @ts-ignore – Node 18 fetch supports duplex
    duplex: 'half',
  });

  if (!edgeRes.ok || !edgeRes.body) {
    return new Response('Edge stream unavailable', { status: 502 });
  }

  return new Response(edgeRes.body, {
    status: 200,
    headers: {
      'Content-Type': edgeRes.headers.get('Content-Type') ??
                      'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',  // disable nginx buffering if deployed
    },
  });
}
