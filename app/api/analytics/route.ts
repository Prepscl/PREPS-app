import { NextResponse } from 'next/server';
import { getVentas, getPedidos, getInversiones, getDespensa, getTaperes } from '@/lib/store';

export const dynamic = 'force-dynamic';

interface ItemRaw { tipo?: string; nombre?: string; cantidad?: number; precio?: number }

// Parse Spanish CL date "DD-MM-YYYY, HH:MM:SS am/pm" → Date
function parseFecha(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{2})-(\d{2})-(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])\.\s*m\./i);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, dd, mm, yyyy, hRaw, mi, ss, ap] = m;
  let h = parseInt(hRaw);
  if (ap.toLowerCase() === 'p' && h !== 12) h += 12;
  if (ap.toLowerCase() === 'a' && h === 12) h = 0;
  return new Date(`${yyyy}-${mm}-${dd}T${h.toString().padStart(2,'0')}:${mi}:${ss}`);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export async function GET() {
  const [ventas, pedidos, inversiones, despensa, taperes] = await Promise.all([
    getVentas(), getPedidos(), getInversiones(), getDespensa(), getTaperes(),
  ]);

  // ── Totales globales ─────────────────────────────────
  const ventaBruta = ventas.reduce((s, v) => s + v.monto, 0);
  const costoTotal = ventas.reduce((s, v) => s + v.costo, 0);
  const ivaTotal = ventas.reduce((s, v) => s + v.iva, 0);
  const netoTotal = ventas.reduce((s, v) => s + (v.con_iva ? v.monto / 1.19 : v.monto), 0);
  const gananciaNeta = Math.round(netoTotal - costoTotal);
  const margen = netoTotal > 0 ? +((gananciaNeta / netoTotal) * 100).toFixed(1) : 0;

  // ── Serie temporal (últimos 30 días) ─────────────────
  const now = new Date();
  const days30: Array<{ date: string; label: string; ventas: number; ganancia: number; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days30.push({
      date: dayKey(d),
      label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
      ventas: 0,
      ganancia: 0,
      count: 0,
    });
  }
  const dayMap = new Map(days30.map(d => [d.date, d]));

  for (const v of ventas) {
    const d = parseFecha(v.created_at);
    if (!d) continue;
    const key = dayKey(d);
    const slot = dayMap.get(key);
    if (slot) {
      slot.ventas += v.monto;
      const neto = v.con_iva ? v.monto / 1.19 : v.monto;
      slot.ganancia += (neto - v.costo);
      slot.count += 1;
    }
  }

  // ── Top productos (de pedidos aceptados + ventas con descripción parseable) ──
  const productosMap = new Map<string, { unidades: number; revenue: number; costo: number }>();
  const pedidosAceptados = pedidos.filter(p => p.estado === 'ACEPTADO');
  for (const p of pedidosAceptados) {
    try {
      const items = JSON.parse(p.items) as ItemRaw[];
      for (const it of items) {
        const tipo = (it.tipo || 'desconocido').toLowerCase();
        const cant = it.cantidad ?? 1;
        const precio = it.precio ?? 0;
        const cur = productosMap.get(tipo) ?? { unidades: 0, revenue: 0, costo: 0 };
        cur.unidades += cant;
        cur.revenue += precio * cant;
        productosMap.set(tipo, cur);
      }
    } catch {}
  }
  const topProductos = Array.from(productosMap.entries())
    .map(([tipo, d]) => ({ tipo, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── Top clientes (DERIVADO de pedidos aceptados, no del registro estático) ──
  // Esto garantiza que solo aparezcan clientes que realmente compraron (no test data ni placeholders)
  const clientesMap = new Map<string, { gastado: number; pedidos: number }>();
  for (const p of pedidosAceptados) {
    const nombre = (p.cliente || '').trim();
    if (!nombre) continue; // descartar pedidos sin nombre real
    if (nombre.toLowerCase() === 'cliente' || nombre.toLowerCase().includes('test')
        || nombre.toLowerCase().includes('ping') || nombre.toLowerCase() === 'lucas'
        || nombre.toLowerCase() === 'preps user') {
      // descartar nombres genéricos / test
      continue;
    }
    const key = nombre.toUpperCase();
    const cur = clientesMap.get(key) ?? { gastado: 0, pedidos: 0 };
    cur.gastado += p.total;
    cur.pedidos += 1;
    clientesMap.set(key, cur);
  }
  const topClientes = Array.from(clientesMap.entries())
    .map(([nombre, d]) => ({
      nombre,
      pedidos: d.pedidos,
      gastado: d.gastado,
      promedio: d.pedidos > 0 ? Math.round(d.gastado / d.pedidos) : 0,
    }))
    .sort((a, b) => b.gastado - a.gastado)
    .slice(0, 10);

  // ── Análisis temporal ────────────────────────────────
  const ventasFechadas = ventas
    .map(v => ({ ...v, fecha: parseFecha(v.created_at) }))
    .filter(v => v.fecha) as Array<typeof ventas[0] & { fecha: Date }>;

  const primeraFecha = ventasFechadas.length > 0
    ? ventasFechadas.reduce((m, v) => v.fecha < m ? v.fecha : m, ventasFechadas[0].fecha)
    : null;
  const diasOperando = primeraFecha
    ? Math.max(1, Math.ceil((now.getTime() - primeraFecha.getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const promedioVentaDiaria = Math.round(ventaBruta / diasOperando);
  const promedioGananciaDiaria = Math.round(gananciaNeta / diasOperando);

  // Mejor día / peor día (con ventas > 0)
  const diasConVentas = days30.filter(d => d.count > 0);
  const mejorDia = diasConVentas.length
    ? diasConVentas.reduce((m, d) => d.ventas > m.ventas ? d : m, diasConVentas[0])
    : null;
  const ventasUltimos7 = days30.slice(-7).reduce((s, d) => s + d.ventas, 0);
  const ventasPrev7 = days30.slice(-14, -7).reduce((s, d) => s + d.ventas, 0);
  const tendencia7d = ventasPrev7 > 0
    ? +(((ventasUltimos7 - ventasPrev7) / ventasPrev7) * 100).toFixed(1)
    : 0;

  // ── Predicción próximos 30 días (lineal sobre últimos 14) ──
  const recientes = days30.slice(-14);
  const promReciente = recientes.reduce((s, d) => s + d.ventas, 0) / recientes.length;
  const proyeccion30d = Math.round(promReciente * 30);
  const proyeccionGanancia30d = Math.round(promReciente * 30 * (margen / 100));

  // ── Inversión y ROI ──────────────────────────────────
  const totalInvertido = inversiones.reduce((s, i) => s + i.monto, 0);
  const recuperado = Math.min(totalInvertido, Math.max(0, gananciaNeta));
  const porRecuperar = Math.max(0, totalInvertido - recuperado);
  const roi = totalInvertido > 0 ? +((gananciaNeta / totalInvertido) * 100).toFixed(1) : 0;
  const diasAlBreakeven = porRecuperar > 0 && promedioGananciaDiaria > 0
    ? Math.ceil(porRecuperar / promedioGananciaDiaria)
    : 0;

  // ── Inversión por categoría ──────────────────────────
  const invPorCategoria = inversiones.reduce<Record<string, number>>((acc, i) => {
    acc[i.categoria] = (acc[i.categoria] ?? 0) + i.monto;
    return acc;
  }, {});

  // ── Balance simplificado ─────────────────────────────
  // Activos: stock valorizado + taperes + ganancia neta
  const stockValor = despensa.reduce((s, d) => {
    const precio = d.ingrediente.toLowerCase().includes('pollo') ? 9.06
      : d.ingrediente.toLowerCase().includes('arroz') ? 2.27
      : d.ingrediente.toLowerCase().includes('brocoli') || d.ingrediente.toLowerCase().includes('brócoli') ? 0.86
      : 0;
    return s + (d.stock_g * precio);
  }, 0);
  const taperesValor = (taperes.stock ?? 0) * 350;
  const activos = Math.round(stockValor + taperesValor);
  const balance = {
    activos,
    stockValor: Math.round(stockValor),
    taperesValor: Math.round(taperesValor),
    pasivos: porRecuperar,
    patrimonio: activos - porRecuperar + Math.max(0, gananciaNeta),
  };

  // ── Distribución pago (con/sin IVA) ──────────────────
  const conIvaCount = ventas.filter(v => v.con_iva).length;
  const sinIvaCount = ventas.length - conIvaCount;
  const conIvaMonto = ventas.filter(v => v.con_iva).reduce((s, v) => s + v.monto, 0);
  const sinIvaMonto = ventas.filter(v => !v.con_iva).reduce((s, v) => s + v.monto, 0);

  return NextResponse.json({
    totales: {
      ventaBruta,
      costoTotal,
      ivaTotal,
      netoTotal: Math.round(netoTotal),
      gananciaNeta,
      margen,
      ventasCount: ventas.length,
      pedidosCount: pedidos.length,
      clientesCount: clientesMap.size,
      diasOperando,
    },
    promedios: {
      ventaDiaria: promedioVentaDiaria,
      gananciaDiaria: promedioGananciaDiaria,
      ticketPromedio: ventas.length > 0 ? Math.round(ventaBruta / ventas.length) : 0,
    },
    tendencia: {
      ultimos7: ventasUltimos7,
      previos7: ventasPrev7,
      cambio_pct: tendencia7d,
      mejorDia: mejorDia ? { fecha: mejorDia.label, ventas: mejorDia.ventas } : null,
    },
    proyeccion: {
      ventas30d: proyeccion30d,
      ganancia30d: proyeccionGanancia30d,
    },
    serie30d: days30,
    topProductos,
    topClientes,
    inversion: {
      totalInvertido,
      recuperado,
      porRecuperar,
      roi,
      diasAlBreakeven,
      porCategoria: invPorCategoria,
    },
    pago: {
      conIvaCount,
      sinIvaCount,
      conIvaMonto: Math.round(conIvaMonto),
      sinIvaMonto: Math.round(sinIvaMonto),
    },
    balance,
  });
}
