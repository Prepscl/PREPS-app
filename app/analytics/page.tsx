'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAutoRefresh } from '@/components/NotificationProvider';
import { formatCLP } from '@/lib/calculations';
import { TrendingUp, TrendingDown, Award, Users, Package, Target, Zap, RefreshCw } from 'lucide-react';

interface AnalyticsData {
  totales: {
    ventaBruta: number; costoTotal: number; ivaTotal: number; netoTotal: number;
    gananciaNeta: number; margen: number; ventasCount: number; pedidosCount: number;
    clientesCount: number; diasOperando: number;
  };
  promedios: { ventaDiaria: number; gananciaDiaria: number; ticketPromedio: number };
  tendencia: {
    ultimos7: number; previos7: number; cambio_pct: number;
    mejorDia: { fecha: string; ventas: number } | null;
  };
  proyeccion: { ventas30d: number; ganancia30d: number };
  serie30d: Array<{ date: string; label: string; ventas: number; ganancia: number; count: number }>;
  topProductos: Array<{ tipo: string; unidades: number; revenue: number; costo: number }>;
  topClientes: Array<{ nombre: string; pedidos: number; gastado: number; promedio: number }>;
  inversion: {
    totalInvertido: number; recuperado: number; porRecuperar: number;
    roi: number; diasAlBreakeven: number;
    porCategoria: Record<string, number>;
  };
  pago: { conIvaCount: number; sinIvaCount: number; conIvaMonto: number; sinIvaMonto: number };
  balance: { activos: number; stockValor: number; taperesValor: number; pasivos: number; patrimonio: number };
}

const TIPO_LABEL: Record<string, string> = {
  low_carb: 'LOW CARB',
  high_carb: 'HIGH CARB',
  pack_5: 'PACK ×5',
  pack_15: 'PACK ×15',
  pack_28: 'PACK ×28',
  labs: 'LABS',
};

// ── Bar Chart (vertical, 30 días) ─────────────────────────────
function BarChart({ data }: { data: AnalyticsData['serie30d'] }) {
  const max = Math.max(...data.map(d => d.ventas), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px] h-[140px]">
        {data.map((d, i) => {
          const h = (d.ventas / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative">
              <div
                className="w-full transition-all"
                style={{
                  height: `${Math.max(h, 1)}%`,
                  background: d.ventas > 0 ? '#2EE5C2' : '#1a1a1a',
                  minHeight: '1px',
                }}
                title={`${d.label}: ${formatCLP(d.ventas)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-barlow text-[8px] text-[#444] tracking-wider">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// ── Horizontal bars ───────────────────────────────────────────
function HBar({
  label, value, max, sub, color = '#2EE5C2',
}: { label: string; value: number; max: number; sub?: string; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="font-barlow font-700 text-xs text-white tracking-wide">{label}</span>
        <span className="font-bebas text-base text-white">{formatCLP(value)}</span>
      </div>
      <div className="h-[3px] bg-[#1a1a1a]">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      {sub && <p className="font-barlow text-[10px] text-[#666]">{sub}</p>}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, accent }:
  { label: string; value: string; sub?: string; icon?: React.ElementType; accent?: boolean }) {
  return (
    <div className="card-solid p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="label">{label}</p>
        {Icon && <Icon size={14} className={accent ? 'text-brand' : 'text-[#444]'} />}
      </div>
      <p className={`font-bebas text-[32px] leading-none ${accent ? 'text-brand' : 'text-white'}`}>
        {value}
      </p>
      {sub && <p className="font-barlow text-[10px] text-[#666] mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────
function Section({ title, children, eyebrow }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <p className="label text-white">{title}</p>
      </div>
      {children}
    </section>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/analytics');
      setData(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, 60000);

  if (loading || !data) {
    return (
      <>
        <header className="sticky top-0 z-10 bg-black px-4 py-4 divider" style={{ borderTop: 'none' }}>
          <p className="font-bebas text-2xl text-white">ANALYTICS</p>
        </header>
        <div className="px-4 py-10 text-center font-barlow text-[10px] text-[#444] tracking-widest">
          CARGANDO ANÁLISIS...
        </div>
        <Navbar />
      </>
    );
  }

  const t = data.totales;
  const trendUp = data.tendencia.cambio_pct > 0;
  const maxProducto = Math.max(...data.topProductos.map(p => p.revenue), 1);
  const roiRecPct = data.inversion.totalInvertido > 0
    ? Math.min(100, (data.inversion.recuperado / data.inversion.totalInvertido) * 100)
    : 0;

  return (
    <>
      <header className="sticky top-0 z-10 bg-black px-4 py-4 flex items-center justify-between divider"
              style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-3">
          <img src="/logo-preps.png" alt="PREPS" className="h-7 w-auto" />
          <div>
            <p className="font-barlow font-800 text-[10px] uppercase tracking-[0.22em] text-white leading-tight">
              Analytics
            </p>
            <p className="font-barlow text-[9px] tracking-wider text-[#555] uppercase">
              {t.diasOperando} días operando
            </p>
          </div>
        </div>
        <button onClick={fetchData} className="btn-ghost p-2" title="Refrescar">
          <RefreshCw size={12} />
        </button>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto space-y-8 pb-24">

        {/* ─── HERO KPIs ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <KPI label="Venta bruta" value={formatCLP(t.ventaBruta)} sub={`${t.ventasCount} ventas · ${t.pedidosCount} pedidos`} accent />
          <KPI label="Ganancia neta" value={formatCLP(t.gananciaNeta)} sub={`Margen ${t.margen}%`} icon={TrendingUp} />
          <KPI label="Ticket promedio" value={formatCLP(data.promedios.ticketPromedio)} sub={`${formatCLP(data.promedios.ventaDiaria)}/día`} />
          <KPI label="Clientes" value={String(t.clientesCount)} sub={`+${formatCLP(data.promedios.gananciaDiaria)}/día neto`} icon={Users} />
        </div>

        {/* ─── TENDENCIA 7 DÍAS ─────────────────────────────── */}
        <Section eyebrow="Tendencia" title="Comparativo 7 días vs 7 anteriores">
          <div className="card-solid p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-bebas text-3xl text-white leading-none">{formatCLP(data.tendencia.ultimos7)}</p>
                <p className="font-barlow text-[10px] text-[#666] mt-1">ÚLTIMOS 7 DÍAS</p>
              </div>
              <div className={`flex items-center gap-1 font-bebas text-2xl ${trendUp ? 'text-brand' : 'text-orange-400'}`}>
                {trendUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {data.tendencia.cambio_pct > 0 ? '+' : ''}{data.tendencia.cambio_pct}%
              </div>
            </div>
            <div className="flex justify-between font-barlow text-[10px] text-[#666]">
              <span>vs {formatCLP(data.tendencia.previos7)} previos</span>
              {data.tendencia.mejorDia && (
                <span className="text-brand">★ MEJOR DÍA: {data.tendencia.mejorDia.fecha}</span>
              )}
            </div>
          </div>
        </Section>

        {/* ─── GRÁFICO 30 DÍAS ────────────────────────────────── */}
        <Section eyebrow="Series" title="Ventas últimos 30 días">
          <div className="card-solid p-4">
            <BarChart data={data.serie30d} />
          </div>
        </Section>

        {/* ─── TOP PRODUCTOS ──────────────────────────────────── */}
        <Section eyebrow="Ranking" title="Top productos por revenue">
          <div className="card-solid p-4 space-y-3">
            {data.topProductos.length === 0 ? (
              <p className="font-barlow text-[10px] text-[#444] text-center py-4">
                SIN DATOS DE PRODUCTOS AÚN
              </p>
            ) : data.topProductos.map((p, i) => (
              <HBar key={p.tipo}
                label={`${i + 1}. ${TIPO_LABEL[p.tipo] || p.tipo.toUpperCase()}`}
                value={p.revenue}
                max={maxProducto}
                sub={`${p.unidades} unidades vendidas`}
              />
            ))}
          </div>
        </Section>

        {/* ─── TOP CLIENTES ───────────────────────────────────── */}
        <Section eyebrow="LTV" title="Top clientes por gasto">
          <div className="card-solid">
            {data.topClientes.length === 0 ? (
              <p className="font-barlow text-[10px] text-[#444] text-center py-6">
                SIN CLIENTES REGISTRADOS
              </p>
            ) : data.topClientes.map((c, i) => (
              <div key={c.nombre} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < data.topClientes.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`font-bebas text-lg ${i < 3 ? 'text-brand' : 'text-[#555]'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-barlow font-700 text-xs text-white truncate uppercase">{c.nombre}</p>
                    <p className="font-barlow text-[10px] text-[#666]">
                      {c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'} · ticket {formatCLP(c.promedio)}
                    </p>
                  </div>
                </div>
                <span className="font-bebas text-base text-white">{formatCLP(c.gastado)}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ─── PREDICCIÓN ─────────────────────────────────────── */}
        <Section eyebrow="Forecast" title="Proyección próximos 30 días">
          <div className="card-solid p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label mb-1">Ventas proyectadas</p>
                <p className="font-bebas text-3xl text-brand leading-none">{formatCLP(data.proyeccion.ventas30d)}</p>
              </div>
              <div>
                <p className="label mb-1">Ganancia proyectada</p>
                <p className="font-bebas text-3xl text-white leading-none">{formatCLP(data.proyeccion.ganancia30d)}</p>
              </div>
            </div>
            <p className="font-barlow text-[10px] text-[#666] leading-relaxed pt-2"
               style={{ borderTop: '1px solid #1a1a1a' }}>
              Basado en el promedio diario de los últimos 14 días manteniendo margen de {t.margen}%.
              Si la tendencia es {trendUp ? 'positiva' : 'negativa'} ({data.tendencia.cambio_pct > 0 ? '+' : ''}{data.tendencia.cambio_pct}%),
              los números reales podrían {trendUp ? 'superar' : 'estar por debajo'} de la proyección.
            </p>
          </div>
        </Section>

        {/* ─── ROI INVERSIÓN ───────────────────────────────────── */}
        <Section eyebrow="ROI" title="Recuperación de inversión">
          <div className="card-solid p-4 space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-bebas text-3xl text-white leading-none">{formatCLP(data.inversion.recuperado)}</p>
                <p className="font-barlow text-xs text-[#666]">de {formatCLP(data.inversion.totalInvertido)}</p>
              </div>
              <div className="h-[6px] bg-[#1a1a1a]">
                <div className="h-full transition-all"
                  style={{
                    width: `${roiRecPct}%`,
                    background: roiRecPct >= 100 ? '#fff' : '#2EE5C2',
                  }} />
              </div>
              <div className="flex justify-between mt-2 font-barlow text-[10px]">
                <span className="text-brand">{roiRecPct.toFixed(1)}% RECUPERADO</span>
                <span className="text-[#666]">FALTAN {formatCLP(data.inversion.porRecuperar)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
              <div>
                <p className="label mb-1">ROI total</p>
                <p className={`font-bebas text-2xl ${data.inversion.roi >= 0 ? 'text-brand' : 'text-orange-400'}`}>
                  {data.inversion.roi > 0 ? '+' : ''}{data.inversion.roi}%
                </p>
              </div>
              <div>
                <p className="label mb-1">Días al breakeven</p>
                <p className="font-bebas text-2xl text-white">
                  {data.inversion.diasAlBreakeven > 0 ? data.inversion.diasAlBreakeven : '✓'}
                </p>
              </div>
            </div>

            {Object.keys(data.inversion.porCategoria).length > 0 && (
              <div className="pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
                <p className="label mb-2">Por categoría</p>
                <div className="space-y-1.5">
                  {Object.entries(data.inversion.porCategoria)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, monto]) => (
                      <div key={cat} className="flex justify-between font-barlow text-[11px]">
                        <span className="text-[#aaa]">{cat}</span>
                        <span className="text-white font-700">{formatCLP(monto)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ─── BALANCE ─────────────────────────────────────────── */}
        <Section eyebrow="Balance" title="Activos / Pasivos / Patrimonio">
          <div className="card-solid p-4 space-y-3">
            <div className="flex justify-between items-baseline pb-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
              <p className="font-barlow font-700 text-xs text-white tracking-wide">ACTIVOS</p>
              <p className="font-bebas text-2xl text-brand">{formatCLP(data.balance.activos)}</p>
            </div>
            <div className="space-y-1.5 font-barlow text-[11px]">
              <div className="flex justify-between"><span className="text-[#888]">Stock insumos</span><span className="text-white">{formatCLP(data.balance.stockValor)}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Taperes</span><span className="text-white">{formatCLP(data.balance.taperesValor)}</span></div>
            </div>

            <div className="flex justify-between items-baseline pb-3 pt-3" style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
              <p className="font-barlow font-700 text-xs text-white tracking-wide">PASIVOS</p>
              <p className="font-bebas text-2xl text-orange-400">{formatCLP(data.balance.pasivos)}</p>
            </div>
            <p className="font-barlow text-[10px] text-[#666]">Inversión por recuperar</p>

            <div className="flex justify-between items-baseline pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
              <p className="font-barlow font-800 text-sm text-white tracking-wide">PATRIMONIO NETO</p>
              <p className="font-bebas text-3xl text-white">{formatCLP(data.balance.patrimonio)}</p>
            </div>
          </div>
        </Section>

        {/* ─── DISTRIBUCIÓN PAGO ───────────────────────────────── */}
        <Section eyebrow="Distribución" title="Con IVA vs Sin IVA">
          <div className="card-solid p-4 space-y-3">
            {(() => {
              const total = data.pago.conIvaMonto + data.pago.sinIvaMonto;
              const conPct = total > 0 ? (data.pago.conIvaMonto / total) * 100 : 0;
              return (
                <>
                  <div className="flex h-[8px]" style={{ border: '1px solid #1a1a1a' }}>
                    <div style={{ width: `${conPct}%`, background: '#2EE5C2' }} />
                    <div style={{ width: `${100 - conPct}%`, background: '#444' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="label">CON IVA</p>
                      <p className="font-bebas text-xl text-brand">{formatCLP(data.pago.conIvaMonto)}</p>
                      <p className="font-barlow text-[10px] text-[#666]">
                        {data.pago.conIvaCount} ventas · {conPct.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="label">SIN IVA</p>
                      <p className="font-bebas text-xl text-white">{formatCLP(data.pago.sinIvaMonto)}</p>
                      <p className="font-barlow text-[10px] text-[#666]">
                        {data.pago.sinIvaCount} ventas · {(100 - conPct).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
                    <span className="font-barlow text-[10px] text-[#666]">IVA ACUMULADO POR DECLARAR</span>
                    <span className="font-bebas text-base text-white">{formatCLP(t.ivaTotal)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </Section>

        {/* ─── INSIGHTS RÁPIDOS ────────────────────────────────── */}
        <Section eyebrow="Insights" title="Conclusiones automáticas">
          <div className="card-solid p-4 space-y-2.5">
            {(() => {
              const insights: Array<{ icon: React.ElementType; txt: string; color?: string }> = [];
              if (t.margen >= 50) insights.push({ icon: Award, txt: `Margen del ${t.margen}% es excelente. Estás capturando bien el valor.`, color: 'brand' });
              else if (t.margen < 30) insights.push({ icon: Target, txt: `Margen del ${t.margen}% está bajo. Revisar costos o subir precios.`, color: 'orange' });
              if (data.tendencia.cambio_pct >= 20) insights.push({ icon: TrendingUp, txt: `Crecimiento +${data.tendencia.cambio_pct}% en última semana. Aprovechá el momentum.`, color: 'brand' });
              if (data.tendencia.cambio_pct <= -10) insights.push({ icon: TrendingDown, txt: `Bajada de ${data.tendencia.cambio_pct}% esta semana. Activar promo o contactar clientes top.`, color: 'orange' });
              if (data.topProductos[0]) insights.push({ icon: Zap, txt: `${TIPO_LABEL[data.topProductos[0].tipo] || data.topProductos[0].tipo} es tu producto estrella (${data.topProductos[0].unidades} u vendidas).` });
              if (data.inversion.diasAlBreakeven > 0 && data.inversion.diasAlBreakeven < 60) insights.push({ icon: Target, txt: `Recuperás tu inversión en ~${data.inversion.diasAlBreakeven} días al ritmo actual.`, color: 'brand' });
              else if (data.inversion.recuperado >= data.inversion.totalInvertido && data.inversion.totalInvertido > 0) insights.push({ icon: Award, txt: `Inversión 100% recuperada. Todo lo que viene es ganancia neta.`, color: 'brand' });
              if (insights.length === 0) insights.push({ icon: Package, txt: 'Necesitamos más datos para generar insights. Seguí registrando ventas.' });
              return insights.map((ins, i) => {
                const Icon = ins.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <Icon size={14} className={ins.color === 'brand' ? 'text-brand mt-0.5' : ins.color === 'orange' ? 'text-orange-400 mt-0.5' : 'text-[#666] mt-0.5'} />
                    <p className="font-barlow text-[11px] text-[#ccc] leading-relaxed flex-1">{ins.txt}</p>
                  </div>
                );
              });
            })()}
          </div>
        </Section>
      </main>

      <Navbar />
    </>
  );
}
