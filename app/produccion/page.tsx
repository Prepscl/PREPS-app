'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAutoRefresh } from '@/components/NotificationProvider';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface Insumo { cocido_g: number; crudo_g: number; crudo_kg: number }
interface ProduccionData {
  totalPlatos: number; pedidosAceptados: number;
  insumos: { pollo: Insumo; arroz: Insumo; brocoli: Insumo };
}

const ITEMS = [
  { key: 'pollo'   as const, label: 'POLLO',   merma: '÷ 0.75  ·  pierde 25%' },
  { key: 'arroz'   as const, label: 'ARROZ',   merma: '÷ 2.50  ·  absorbe agua' },
  { key: 'brocoli' as const, label: 'BRÓCOLI', merma: '÷ 0.90  ·  pierde 10%' },
];

export default function ProduccionPage() {
  const [data, setData] = useState<ProduccionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try { setData(await (await fetch('/api/produccion')).json()); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useAutoRefresh(fetch_, 60000);

  const totalKg = data
    ? data.insumos.pollo.crudo_kg + data.insumos.arroz.crudo_kg + data.insumos.brocoli.crudo_kg
    : 0;

  return (
    <>
      <header className="sticky top-0 z-10 bg-black px-4 py-4 flex items-center justify-between divider"
              style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-3">
          <span className="preps-logo">PREPS</span>
          <div>
            <p className="font-barlow font-800 text-[10px] uppercase tracking-[0.22em] text-white">Cocina</p>
            <p className="font-barlow text-[9px] uppercase tracking-wider text-[#555]">
              Reporte de Producción
            </p>
          </div>
        </div>
        <button onClick={fetch_} className="btn-ghost p-2">
          <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
        </button>
      </header>

      <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 gap-0" style={{ border: '1px solid #1a1a1a' }}>
          <div className="p-5 text-center">
            <p className="label mb-2">Platos</p>
            <p className="font-bebas text-[56px] leading-[0.9] text-[#FFD600]">
              {data?.totalPlatos ?? 0}
            </p>
            <p className="eyebrow mt-2">A COCINAR</p>
          </div>
          <div className="p-5 text-center" style={{ borderLeft: '1px solid #1a1a1a' }}>
            <p className="label mb-2">Peso crudo</p>
            <p className="font-bebas text-[56px] leading-[0.9] text-white">
              {totalKg.toFixed(2)}
            </p>
            <p className="eyebrow mt-2">KG TOTAL</p>
          </div>
        </div>

        {/* Empty state */}
        {!loading && (!data || data.totalPlatos === 0) && (
          <div className="py-20 text-center" style={{ border: '1px solid #1a1a1a' }}>
            <p className="font-bebas text-4xl tracking-widest text-[#222]">SIN PRODUCCIÓN</p>
            <p className="font-barlow text-[10px] uppercase tracking-[0.22em] text-[#333] mt-3">
              Acepta pedidos en Comandas para ver los insumos
            </p>
          </div>
        )}

        {/* Insumos */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ border: '1px solid #1a1a1a' }} />
          ))
        ) : data && data.totalPlatos > 0 && (
          <>
            <div className="space-y-0" style={{ border: '1px solid #1a1a1a' }}>
              {ITEMS.map(({ key, label, merma }, i) => {
                const ins = data.insumos[key];
                return (
                  <div key={key} className="p-5 animate-fade-in"
                       style={{ borderTop: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-barlow font-800 text-xs uppercase tracking-[0.22em] text-white">
                          {label}
                        </p>
                        <p className="font-barlow text-[10px] text-[#444] mt-1 uppercase tracking-wider">
                          {merma}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="eyebrow">Rendirá cocido</p>
                        <p className="font-bebas text-lg text-[#666] mt-1">
                          {ins.cocido_g.toLocaleString()} G
                        </p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <p className="font-bebas leading-none text-[72px] text-[#FFD600]">
                        {ins.crudo_kg.toFixed(3)}
                      </p>
                      <div>
                        <p className="font-bebas text-xl text-white tracking-widest">KG</p>
                        <p className="eyebrow mt-0.5">CRUDO</p>
                      </div>
                    </div>
                    <p className="font-barlow text-[10px] text-[#444] mt-1 tracking-wider">
                      = {ins.crudo_g.toLocaleString()} gramos
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Formulas */}
            <div className="p-4" style={{ border: '1px solid #1a1a1a' }}>
              <p className="label mb-3">Fórmulas de merma</p>
              <div className="space-y-1.5 font-barlow text-[11px] text-[#555] tracking-wider">
                <p>POLLO   g_crudo = g_cocido ÷ 0.75</p>
                <p>ARROZ   g_crudo = g_cocido ÷ 2.50</p>
                <p>BRÓCOLI g_crudo = g_cocido ÷ 0.90</p>
              </div>
            </div>
          </>
        )}

        <p className="text-center font-barlow text-[9px] tracking-[0.28em] text-[#222] uppercase pt-4 pb-2">
          DISEÑADO PARA TU RENDIMIENTO
        </p>
      </div>

      <Navbar />
    </>
  );
}
