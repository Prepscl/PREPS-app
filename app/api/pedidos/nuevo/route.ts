import { NextRequest, NextResponse } from 'next/server';
import { createPedido, upsertCliente } from '@/lib/store';
import { emitNuevoPedido } from '@/lib/sse';
import { calcularCostoPlato, calcularPrecioLabs, PRECIOS_VENTA } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ────────────────────────────────────────────────────────────────
   ENDPOINT WEBHOOK — recibe tickets desde preps.cl

   El carrito de la web envía un POST con este formato:
   {
     "secret": "preps_secret_2024",       // Autenticación
     "cliente": "Nombre Apellido",
     "telefono": "+56912345678",
     "notas": "sin brócoli",
     "items": [
       {
         "tipo": "low_carb",              // low_carb | high_carb | pack_5 | pack_15 | pack_28 | labs
         "nombre": "Power Breast Low Carb",
         "cantidad": 2,
         "precio_unitario": 4990,
         "g_pollo":  150,                 // solo para labs o si viene desglosado
         "g_arroz":  80,
         "g_brocoli": 100
       }
     ]
   }

   Gramos por defecto si no vienen en el payload:
     Low Carb  → pollo 150 / arroz 80  / brócoli 100
     High Carb → pollo 150 / arroz 200 / brócoli 100
   ──────────────────────────────────────────────────────────────── */

// Gramos cocidos por defecto según tipo de plan
// Todos los planes llevan 200g de pollo cocinado
//   Low Carb  → 200 pollo / 150 arroz / 100 brócoli
//   High Carb → 200 pollo / 300 arroz / 200 brócoli
//   Packs (5/15/28) → el cart envía items individuales con su variante low/high
//   Labs → gramos personalizados desde el cart
const GRAMOS_DEFAULT: Record<string, { g_pollo: number; g_arroz: number; g_brocoli: number }> = {
  low_carb:  { g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
  high_carb: { g_pollo: 200, g_arroz: 300, g_brocoli: 200 },
  labs:      { g_pollo: 0,   g_arroz: 0,   g_brocoli: 0   },
};

function numeroPedido(): string {
  return `PRP-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12)}`;
}

export async function POST(request: NextRequest) {
  try {
    // ── Autenticación ──────────────────────────────────────────
    const body = await request.json();

    const secret = body.secret ?? request.headers.get('x-webhook-secret') ?? '';
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    // ── Parsear payload del carrito ────────────────────────────
    const {
      cliente    = '',
      email      = '',
      telefono   = '',
      notas      = '',
      items      = [],
      origen     = 'WEB',
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Payload sin items' }, { status: 400, headers: CORS_HEADERS });
    }

    // ── Calcular total y costo ─────────────────────────────────
    let total = 0;
    let costo = 0;

    const itemsNormalizados = items.map((item: {
      tipo?: string;
      nombre?: string;
      cantidad?: number;
      precio_unitario?: number;
      precio?: number;
      g_pollo?: number;
      g_arroz?: number;
      g_brocoli?: number;
    }) => {
      const tipo     = item.tipo ?? 'low_carb';
      const cantidad = item.cantidad ?? 1;
      // Para packs: resolver defGrams por "variante" (low_carb/high_carb)
      const variante = (item as { variante?: string }).variante;
      const lookupKey = tipo.startsWith('pack_') ? (variante ?? 'low_carb') : tipo;
      const defGrams = GRAMOS_DEFAULT[lookupKey] ?? GRAMOS_DEFAULT.low_carb;

      const g_pollo   = item.g_pollo   ?? defGrams.g_pollo;
      const g_arroz   = item.g_arroz   ?? defGrams.g_arroz;
      const g_brocoli = item.g_brocoli ?? defGrams.g_brocoli;

      // Precio: usa el que viene del carrito, si no usa la tabla fija
      let precio_unitario = item.precio_unitario ?? item.precio ?? 0;
      if (!precio_unitario) {
        if (tipo === 'labs') {
          precio_unitario = Math.round(calcularPrecioLabs(g_pollo, g_arroz, g_brocoli));
        } else {
          precio_unitario = PRECIOS_VENTA[tipo] ?? 4990;
        }
      }

      const costoItem = calcularCostoPlato(g_pollo, g_arroz, g_brocoli);

      total += precio_unitario * cantidad;
      costo += costoItem * cantidad;

      return {
        tipo,
        nombre:    item.nombre ?? tipo.replace('_', ' '),
        cantidad,
        precio:    precio_unitario,
        g_pollo,
        g_arroz,
        g_brocoli,
      };
    });

    // Tipo principal del pedido (primer ítem)
    const tipoPrincipal = itemsNormalizados[0]?.tipo ?? 'low_carb';

    // ── Crear pedido ───────────────────────────────────────────
    const pedido = await createPedido({
      numero:  numeroPedido(),
      tipo:    tipoPrincipal,
      cliente,
      telefono,
      items:   JSON.stringify(itemsNormalizados),
      total:   Math.round(total),
      costo:   Math.round(costo),
      estado:  'PENDIENTE_PAGO',
      origen,
      notas,
    });

    // ── Guardar / actualizar cliente ────────────────────────────
    if (cliente) {
      try {
        await upsertCliente({
          nombre: cliente,
          email,
          telefono,
          montoPedido: Math.round(total),
        });
      } catch (e) {
        console.error('[webhook] upsertCliente error:', e);
      }
    }

    // ── Emitir SSE → notificación en tiempo real ───────────────
    emitNuevoPedido(pedido);

    return NextResponse.json({ ok: true, pedido }, { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: CORS_HEADERS });
  }
}
