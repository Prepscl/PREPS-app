import { NextResponse } from 'next/server';
import { getPedidos } from '@/lib/store';

export const dynamic = 'force-dynamic';

const MERMA = { pollo: 0.75, arroz: 2.5, brocoli: 0.9 };

export async function GET() {
  const pedidos = await getPedidos('ACEPTADO');

  let totalPolloCocinado = 0;
  let totalArrozCocinado = 0;
  let totalBrocoliCocinado = 0;
  let totalPlatos = 0;

  for (const pedido of pedidos) {
    const items = JSON.parse(pedido.items) as Array<{
      g_pollo?: number;
      g_arroz?: number;
      g_brocoli?: number;
      cantidad?: number;
    }>;
    for (const item of items) {
      const qty = item.cantidad ?? 1;
      totalPolloCocinado += (item.g_pollo ?? 0) * qty;
      totalArrozCocinado += (item.g_arroz ?? 0) * qty;
      totalBrocoliCocinado += (item.g_brocoli ?? 0) * qty;
      totalPlatos += qty;
    }
  }

  const polloRaw = totalPolloCocinado / MERMA.pollo;
  const arrozRaw = totalArrozCocinado / MERMA.arroz;
  const brocoliRaw = totalBrocoliCocinado / MERMA.brocoli;

  return NextResponse.json({
    totalPlatos,
    pedidosAceptados: pedidos.length,
    insumos: {
      pollo: {
        cocido_g: Math.round(totalPolloCocinado),
        crudo_g: Math.round(polloRaw),
        crudo_kg: parseFloat((polloRaw / 1000).toFixed(3)),
      },
      arroz: {
        cocido_g: Math.round(totalArrozCocinado),
        crudo_g: Math.round(arrozRaw),
        crudo_kg: parseFloat((arrozRaw / 1000).toFixed(3)),
      },
      brocoli: {
        cocido_g: Math.round(totalBrocoliCocinado),
        crudo_g: Math.round(brocoliRaw),
        crudo_kg: parseFloat((brocoliRaw / 1000).toFixed(3)),
      },
    },
  });
}
