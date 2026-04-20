import { NextResponse } from 'next/server';
import { getVentas, getDespensa, getPedidos, getInversiones, getTaperes } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ventas = await getVentas();

  const ventasConIVA = ventas.filter(v => v.con_iva);
  const ventasSinIVA = ventas.filter(v => !v.con_iva);

  // Con IVA: monto includes IVA, neto = monto/1.19
  const montoConIVA = ventasConIVA.reduce((s, v) => s + v.monto, 0);
  const netoConIVA = montoConIVA / 1.19;
  const ivaTotal = Math.round(montoConIVA - netoConIVA);

  // Sin IVA: monto IS the neto
  const montoSinIVA = ventasSinIVA.reduce((s, v) => s + v.monto, 0);

  const ventaBruta = montoConIVA + montoSinIVA;
  const costoTotal = ventas.reduce((s, v) => s + v.costo, 0);
  const netoTotal = netoConIVA + montoSinIVA;
  const gananciaNeta = Math.round(netoTotal - costoTotal);
  const margen = netoTotal > 0
    ? parseFloat(((gananciaNeta / netoTotal) * 100).toFixed(1))
    : 0;

  const inversiones = await getInversiones();
  const totalInvertido = inversiones.reduce((s, i) => s + i.monto, 0);
  const recuperado = Math.max(0, gananciaNeta);
  const porRecuperar = Math.max(0, totalInvertido - recuperado);

  const pedidosPendientes = (await getPedidos('PENDIENTE_PAGO')).length;
  const pedidosAceptados = (await getPedidos('ACEPTADO')).length;

  const despensa = await getDespensa();
  const taperes = await getTaperes();

  return NextResponse.json({
    // Totals
    ventaBruta,
    ivaTotal,
    gananciaNeta,
    margen,
    costoTotal,
    netoTotal,
    // Split
    conIVA: {
      monto: Math.round(montoConIVA),
      neto: Math.round(netoConIVA),
      iva: ivaTotal,
      count: ventasConIVA.length,
    },
    sinIVA: {
      monto: Math.round(montoSinIVA),
      count: ventasSinIVA.length,
    },
    // Pedidos
    pedidosPendientes,
    pedidosAceptados,
    // Inversión
    inversion: {
      totalInvertido,
      recuperado,
      porRecuperar,
      count: inversiones.length,
    },
    // Inventario
    despensa,
    taperes,
  });
}
