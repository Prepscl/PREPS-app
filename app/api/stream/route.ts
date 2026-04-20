// Endpoint deshabilitado para ahorrar CPU en Vercel.
// SSE mantenía una conexión viva que consumía tiempo de ejecución continuo.
// Ahora el cliente hace polling con visibility-awareness (ver NotificationProvider).
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({ ok: true, stream: 'disabled' }, {
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
