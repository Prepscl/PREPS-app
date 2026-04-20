import { NextRequest, NextResponse } from 'next/server';
import { resetData } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { opcion = 'solo_ventas', confirm } = await request.json();
    if (confirm !== 'RESET_PREPS') {
      return NextResponse.json({ error: 'Confirmación inválida' }, { status: 400 });
    }
    await resetData(opcion as 'todo' | 'solo_ventas');
    return NextResponse.json({ ok: true, mensaje: `Reset "${opcion}" completado` });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
