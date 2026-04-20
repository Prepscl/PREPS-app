import { NextRequest, NextResponse } from 'next/server';
import { getVentas, createVentaManual, deleteVenta, updateVenta } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getVentas());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monto, costo = 0, con_iva = true, descripcion = '' } = body;

    if (!monto || monto <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const venta = await createVentaManual({ monto, costo, con_iva, descripcion });
    return NextResponse.json({ ok: true, venta }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const ok = await deleteVenta(Number(id));
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, monto, costo, con_iva, descripcion } = await request.json();
    const venta = await updateVenta(Number(id), { monto, costo, con_iva, descripcion });
    if (!venta) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, venta });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
