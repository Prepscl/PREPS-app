import { NextRequest, NextResponse } from 'next/server';
import { getVentas, createVentaManual, createVentaMenu, deleteVenta, updateVenta } from '@/lib/store';
import { calcularCostoPlato } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

const FACT = { pollo: 0.75, arroz: 2.5, brocoli: 0.9 } as const;

export async function GET() {
  return NextResponse.json(await getVentas());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      monto, costo, con_iva = true, descripcion = '',
      insumos, tapers = 0,
    } = body as {
      monto: number; costo?: number; con_iva?: boolean; descripcion?: string;
      insumos?: { g_pollo: number; g_arroz: number; g_brocoli: number };
      tapers?: number;
    };

    if (!monto || monto <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // Si vienen insumos: calculamos costo automáticamente y descontamos stock
    if (insumos) {
      const gP = Math.max(0, Math.round(insumos.g_pollo   ?? 0));
      const gA = Math.max(0, Math.round(insumos.g_arroz   ?? 0));
      const gB = Math.max(0, Math.round(insumos.g_brocoli ?? 0));
      const costoCalc = Math.round(calcularCostoPlato(gP, gA, gB));
      const venta = await createVentaMenu({
        monto, costo: costoCalc, con_iva, descripcion,
        stockDelta: {
          pollo:   Math.round(gP / FACT.pollo),
          arroz:   Math.round(gA / FACT.arroz),
          brocoli: Math.round(gB / FACT.brocoli),
        },
        taperesDelta: Math.max(0, Math.round(tapers)),
      });
      return NextResponse.json({ ok: true, venta }, { status: 201 });
    }

    const venta = await createVentaManual({ monto, costo: costo ?? 0, con_iva, descripcion });
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
