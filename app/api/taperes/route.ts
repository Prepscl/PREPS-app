import { NextRequest, NextResponse } from 'next/server';
import { getTaperes, setTaperes } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getTaperes());
}

export async function PUT(request: NextRequest) {
  try {
    const { stock } = await request.json();
    if (stock === undefined || stock < 0) {
      return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });
    }
    return NextResponse.json(await setTaperes(Math.round(stock)));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
