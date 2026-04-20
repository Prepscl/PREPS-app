import { NextRequest, NextResponse } from 'next/server';
import { getPedidos, createPedido } from '@/lib/store';
import { emitNuevoPedido } from '@/lib/sse';
import { calcularCostoPlato, PRECIOS_VENTA } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') ?? undefined;
  return NextResponse.json(await getPedidos(estado));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo = 'low_carb', cliente = '', telefono = '', items = [], notas = '', origen = 'MANUAL' } = body;

    let total = 0;
    let costo = 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const precio = item.precio ?? PRECIOS_VENTA[item.tipo ?? tipo] ?? 4990;
        total += precio * (item.cantidad ?? 1);
        costo += calcularCostoPlato(
          item.g_pollo ?? 150,
          item.g_arroz ?? 80,
          item.g_brocoli ?? 100
        ) * (item.cantidad ?? 1);
      }
    } else {
      total = body.total ?? PRECIOS_VENTA[tipo] ?? 4990;
      costo = calcularCostoPlato(body.g_pollo ?? 150, body.g_arroz ?? 80, body.g_brocoli ?? 100);
    }

    const pedido = await createPedido({
      numero: `PRP-${Date.now()}`,
      tipo,
      cliente,
      telefono,
      items: JSON.stringify(
        Array.isArray(items) && items.length > 0
          ? items
          : [{ tipo, cantidad: 1, g_pollo: body.g_pollo ?? 150, g_arroz: body.g_arroz ?? 80, g_brocoli: body.g_brocoli ?? 100 }]
      ),
      total: Math.round(total),
      costo: Math.round(costo),
      estado: 'PENDIENTE_PAGO',
      origen,
      notas,
    });

    emitNuevoPedido(pedido);
    return NextResponse.json({ ok: true, pedido }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
