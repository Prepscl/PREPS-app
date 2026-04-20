import { NextRequest, NextResponse } from 'next/server';
import { getInversiones, createInversion, deleteInversion, updateInversion } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getInversiones());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { descripcion, monto, categoria = 'OTROS' } = body;

    if (!descripcion || !monto || monto <= 0) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const inversion = await createInversion({ descripcion, monto: Math.round(monto), categoria });
    return NextResponse.json({ ok: true, inversion }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const ok = await deleteInversion(Number(id));
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, descripcion, monto, categoria } = await request.json();
    const inv = await updateInversion(Number(id), { descripcion, monto, categoria });
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, inversion: inv });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
