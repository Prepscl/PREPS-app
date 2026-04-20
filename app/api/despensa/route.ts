import { NextRequest, NextResponse } from 'next/server';
import { getDespensa, setStock } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getDespensa());
}

export async function PUT(request: NextRequest) {
  try {
    const { ingrediente, stock_g } = await request.json();
    if (!ingrediente || stock_g === undefined) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }
    const updated = await setStock(ingrediente, stock_g);
    if (!updated) return NextResponse.json({ error: 'Ingrediente no encontrado' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
