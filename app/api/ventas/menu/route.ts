import { NextRequest, NextResponse } from 'next/server';
import { createVentaMenu } from '@/lib/store';
import { calcularCostoPlato, calcularPrecioLabs, PRECIOS_VENTA } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

const GRAMOS_DEFAULT: Record<string, { g_pollo: number; g_arroz: number; g_brocoli: number }> = {
  low_carb:  { g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
  high_carb: { g_pollo: 200, g_arroz: 300, g_brocoli: 100 },
  labs:      { g_pollo: 0,   g_arroz: 0,   g_brocoli: 0   },
};

const FACT = { pollo: 0.75, arroz: 2.5, brocoli: 0.9 } as const;

const TAPERES_POR_ITEM: Record<string, number> = {
  low_carb: 1, high_carb: 1, pack_5: 5, pack_15: 15, pack_28: 28, labs: 1,
};

const PLATOS_POR_ITEM: Record<string, number> = {
  low_carb: 1, high_carb: 1, pack_5: 5, pack_15: 15, pack_28: 28, labs: 1,
};

interface ItemIn {
  tipo: string;
  cantidad?: number;
  variante?: string;
  g_pollo?: number;
  g_arroz?: number;
  g_brocoli?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items = [], con_iva = true, descripcion = '', descuento = 0 } = body as {
      items: ItemIn[]; con_iva?: boolean; descripcion?: string; descuento?: number;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    let monto = 0, costo = 0, taperesDelta = 0;
    const stockDelta = { pollo: 0, arroz: 0, brocoli: 0 };
    const desc: string[] = [];

    for (const it of items) {
      const tipo = it.tipo;
      const cantidad = Math.max(1, Math.round(it.cantidad ?? 1));

      let g_pollo = 0, g_arroz = 0, g_brocoli = 0;
      let precioUnit = 0;
      let costoUnit = 0;
      const platosPorItem = PLATOS_POR_ITEM[tipo] ?? 1;

      if (tipo === 'labs') {
        g_pollo   = Math.max(0, Math.round(it.g_pollo   ?? 0));
        g_arroz   = Math.max(0, Math.round(it.g_arroz   ?? 0));
        g_brocoli = Math.max(0, Math.round(it.g_brocoli ?? 0));
        precioUnit = calcularPrecioLabs(g_pollo, g_arroz, g_brocoli);
        costoUnit  = calcularCostoPlato(g_pollo, g_arroz, g_brocoli);
      } else {
        if (!(tipo in PRECIOS_VENTA)) {
          return NextResponse.json({ error: `Tipo desconocido: ${tipo}` }, { status: 400 });
        }
        const variante = tipo.startsWith('pack_') ? (it.variante ?? 'low_carb') : tipo;
        const def = GRAMOS_DEFAULT[variante] ?? GRAMOS_DEFAULT.low_carb;
        g_pollo   = it.g_pollo   ?? def.g_pollo;
        g_arroz   = it.g_arroz   ?? def.g_arroz;
        g_brocoli = it.g_brocoli ?? def.g_brocoli;

        precioUnit = PRECIOS_VENTA[tipo];
        costoUnit  = calcularCostoPlato(g_pollo, g_arroz, g_brocoli) * platosPorItem;
      }

      monto += precioUnit * cantidad;
      costo += costoUnit * cantidad;
      taperesDelta += (TAPERES_POR_ITEM[tipo] ?? 1) * cantidad;

      const platosTotal = platosPorItem * cantidad;
      stockDelta.pollo   += (g_pollo   / FACT.pollo)   * platosTotal;
      stockDelta.arroz   += (g_arroz   / FACT.arroz)   * platosTotal;
      stockDelta.brocoli += (g_brocoli / FACT.brocoli) * platosTotal;

      desc.push(`${cantidad}× ${tipo}`);
    }

    const factor = Math.max(0, 1 - (descuento ?? 0));
    const montoFinal = Math.round(monto * factor);
    const descFinal = descuento && descuento > 0
      ? `${descripcion || desc.join(', ')} · ${Math.round(descuento * 100)}% dscto`
      : (descripcion || desc.join(', '));

    const venta = await createVentaMenu({
      monto: montoFinal,
      costo: Math.round(costo),
      con_iva,
      descripcion: descFinal,
      stockDelta: {
        pollo:   Math.round(stockDelta.pollo),
        arroz:   Math.round(stockDelta.arroz),
        brocoli: Math.round(stockDelta.brocoli),
      },
      taperesDelta,
    });
    return NextResponse.json({ ok: true, venta }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
