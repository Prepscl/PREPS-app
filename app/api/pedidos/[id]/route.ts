import { NextRequest, NextResponse } from 'next/server';
import {
  getPedidoById, updatePedidoEstado, aceptarPedido,
  calcularTaperesDesdeItems, updatePedido,
} from '@/lib/store';
import { emitPedidoActualizado } from '@/lib/sse';
import { calcularCostoPlato } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

const MERMA = { pollo: 0.75, arroz: 2.5, brocoli: 0.9 };

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pedido = await getPedidoById(Number(params.id));
  if (!pedido) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(pedido);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body  = await request.json();
    const { accion } = body;
    const id = Number(params.id);

    const pedido = await getPedidoById(id);
    if (!pedido) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    /* ── EDITAR ──────────────────────────────────────────────── */
    if (accion === 'EDITAR') {
      const { cliente, telefono, notas, total, items } = body;

      // Recalcular costo si cambian los items
      let costo = pedido.costo;
      if (items) {
        const parsed = JSON.parse(typeof items === 'string' ? items : JSON.stringify(items));
        costo = Math.round(
          parsed.reduce((sum: number, item: {
            g_pollo?: number; g_arroz?: number; g_brocoli?: number; cantidad?: number;
          }) => {
            return sum + calcularCostoPlato(
              item.g_pollo ?? 0, item.g_arroz ?? 0, item.g_brocoli ?? 0
            ) * (item.cantidad ?? 1);
          }, 0)
        );
      }

      const updated = await updatePedido(id, {
        ...(cliente   !== undefined && { cliente }),
        ...(telefono  !== undefined && { telefono }),
        ...(notas     !== undefined && { notas }),
        ...(total     !== undefined && { total: Math.round(total) }),
        ...(items     !== undefined && {
          items: typeof items === 'string' ? items : JSON.stringify(items),
          costo,
        }),
      });

      emitPedidoActualizado(updated);
      return NextResponse.json({ ok: true, pedido: updated });
    }

    /* ── ACEPTAR ─────────────────────────────────────────────── */
    if (accion === 'ACEPTAR') {
      if (pedido.estado !== 'PENDIENTE_PAGO') {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      const con_iva = body.con_iva ?? true;

      const items = JSON.parse(pedido.items) as Array<{
        g_pollo?: number; g_arroz?: number; g_brocoli?: number; cantidad?: number;
      }>;

      let polloRaw = 0, arrozRaw = 0, brocoliRaw = 0;
      for (const item of items) {
        const qty = item.cantidad ?? 1;
        polloRaw  += ((item.g_pollo  ?? 0) / MERMA.pollo)   * qty;
        arrozRaw  += ((item.g_arroz  ?? 0) / MERMA.arroz)   * qty;
        brocoliRaw+= ((item.g_brocoli?? 0) / MERMA.brocoli) * qty;
      }

      const monto   = pedido.total;
      const iva     = con_iva ? Math.round(monto - monto / 1.19) : 0;
      const neto    = con_iva ? monto / 1.19 : monto;
      const ganancia= Math.round(neto - pedido.costo);
      const taperes = calcularTaperesDesdeItems(pedido.items);

      const { pedido: updated } = await aceptarPedido(
        id,
        { monto, costo: pedido.costo, iva, ganancia, con_iva },
        { pollo: polloRaw, arroz: arrozRaw, brocoli: brocoliRaw },
        taperes
      );

      emitPedidoActualizado(updated);
      return NextResponse.json({ ok: true, pedido: updated });
    }

    /* ── RECHAZAR / CANCELAR ─────────────────────────────────── */
    if (accion === 'RECHAZAR' || accion === 'CANCELAR') {
      const estado = accion === 'RECHAZAR' ? 'RECHAZADO' : 'CANCELADO';
      const updated = await updatePedidoEstado(id, estado as 'RECHAZADO' | 'CANCELADO');
      emitPedidoActualizado(updated);
      return NextResponse.json({ ok: true, pedido: updated });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
