'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { calcularPrecioLabs, calcularCostoPlato, formatCLP, PRECIOS_VENTA, LABELS_PRECIO } from '@/lib/calculations';
import clsx from 'clsx';

const STEP = 50;
const MAX_G = 800;

const INGREDIENTES = [
  { key: 'pollo'  as const, label: 'POLLO',   emoji: '🍗', color: '#fb923c', bg: 'rgba(251,146,60,0.08)'  },
  { key: 'arroz'  as const, label: 'ARROZ',   emoji: '🍚', color: '#2EE5C2', bg: 'rgba(46,229,194,0.08)'   },
  { key: 'brocoli'as const, label: 'BRÓCOLI', emoji: '🥦', color: '#22c55e', bg: 'rgba(34,197,94,0.08)'   },
];

export default function LaboratorioPage() {
  const [gPollo, setGPollo]     = useState(150);
  const [gArroz, setGArroz]     = useState(100);
  const [gBrocoli, setGBrocoli] = useState(100);

  const vals: Record<string, [number, (v: number) => void]> = {
    pollo:   [gPollo,   setGPollo],
    arroz:   [gArroz,   setGArroz],
    brocoli: [gBrocoli, setGBrocoli],
  };

  const totalG   = gPollo + gArroz + gBrocoli;
  const precio   = calcularPrecioLabs(gPollo, gArroz, gBrocoli);
  const costo    = calcularCostoPlato(gPollo, gArroz, gBrocoli);
  const ganancia = precio - costo;
  const margen   = precio > 0 ? ((ganancia / (precio / 1.19)) * 100) : 0;
  const sobreMax = totalG > MAX_G;

  return (
    <>
      <header style={{ background: '#080808', borderBottom: '1px solid #1e1e1e' }}
        className="sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo-preps.png" alt="PREPS" className="h-7 w-auto" />
          <div>
            <p className="font-barlow font-800 text-[11px] uppercase tracking-[0.15em] text-white">Laboratorio</p>
            <p className="font-barlow text-[10px] uppercase tracking-widest" style={{ color: '#2EE5C2' }}>
              LABS — PRECIOS CUSTOM
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-3">

        {/* Sliders */}
        <div className="card p-4 space-y-5">
          {INGREDIENTES.map(({ key, label, emoji, color, bg }) => {
            const [val, setter] = vals[key];
            const pct = (val / MAX_G) * 100;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-barlow font-800 text-xs uppercase tracking-[0.15em]" style={{ color }}>
                    {emoji} {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setter(Math.max(0, val - STEP))}
                      className="w-8 h-8 font-bebas text-xl flex items-center justify-center transition-all active:scale-95"
                      style={{ background: '#161616', border: '1px solid #2a2a2a', color: '#888' }}>
                      −
                    </button>
                    <span className="font-bebas text-2xl w-16 text-center" style={{ color }}>
                      {val}G
                    </span>
                    <button
                      onClick={() => setter(Math.min(MAX_G, val + STEP))}
                      className="w-8 h-8 font-bebas text-xl flex items-center justify-center transition-all active:scale-95"
                      style={{ background: '#161616', border: '1px solid #2a2a2a', color: '#888' }}>
                      +
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5" style={{ background: '#1e1e1e' }}>
                  <div className="h-full transition-all duration-200"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}

          {/* Total weight indicator */}
          <div
            className="flex items-center justify-between px-3 py-2.5 font-barlow font-700 text-sm uppercase tracking-wider"
            style={{
              background: sobreMax ? 'rgba(239,68,68,0.1)' : '#161616',
              border: `1px solid ${sobreMax ? '#ef4444' : '#2a2a2a'}`,
            }}>
            <span style={{ color: sobreMax ? '#ef4444' : '#888' }}>TOTAL PLATO</span>
            <span className={clsx('font-bebas text-xl', sobreMax && 'animate-pulse')}
              style={{ color: sobreMax ? '#ef4444' : '#fff' }}>
              {totalG}G / {MAX_G}G
            </span>
          </div>
        </div>

        {/* Price result — hero */}
        <div className={clsx('p-6 text-center', sobreMax && 'opacity-40')}
          style={{ background: '#000', border: '2px solid #2EE5C2' }}>
          <p className="label mb-2">PRECIO LABS</p>
          <p className="font-bebas leading-none" style={{ fontSize: '4rem', color: '#2EE5C2' }}>
            {formatCLP(precio)}
          </p>
          <p className="font-barlow text-[10px] text-[#444] mt-2 uppercase tracking-wider">
            $3 base + (g_pollo×22.47) + (g_arroz×2.08) + (g_brócoli×5.69)
          </p>
        </div>

        {/* Breakdown */}
        <div className="card p-4">
          <p className="label mb-3">DESGLOSE</p>
          <div className="space-y-2">
            {[
              { l: 'COSTO INSUMOS', v: formatCLP(costo),    c: '#888' },
              { l: 'GANANCIA BRUTA', v: formatCLP(ganancia), c: ganancia >= 0 ? '#22c55e' : '#ef4444' },
              { l: 'MARGEN S/IVA',  v: `${margen.toFixed(1)}%`, c: margen >= 40 ? '#2EE5C2' : '#fb923c' },
              { l: 'COSTO POR GRAMO', v: totalG > 0 ? `${formatCLP(costo / totalG)}/g` : '—', c: '#444' },
            ].map(({ l, v, c }) => (
              <div key={l} className="flex justify-between items-center py-1.5"
                style={{ borderBottom: '1px solid #1a1a1a' }}>
                <span className="font-barlow text-[11px] uppercase tracking-wider text-[#555]">{l}</span>
                <span className="font-bebas text-xl" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compare with plans */}
        <div className="card p-4">
          <p className="label mb-3">VS PLANES FIJOS</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PRECIOS_VENTA).map(([key, p]) => {
              const diff = p - precio;
              const close = Math.abs(diff) < 500;
              return (
                <div key={key} className="p-3 text-center"
                  style={{
                    background: close ? 'rgba(46,229,194,0.06)' : '#161616',
                    border: `1px solid ${close ? '#2EE5C2' : '#2a2a2a'}`,
                  }}>
                  <p className="font-barlow text-[10px] uppercase tracking-widest text-[#555] mb-0.5">
                    {LABELS_PRECIO[key]}
                  </p>
                  <p className="font-bebas text-xl text-white">{formatCLP(p)}</p>
                  <p className="font-bebas text-sm" style={{ color: diff > 0 ? '#22c55e' : '#ef4444' }}>
                    {diff > 0 ? '+' : ''}{formatCLP(diff)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center font-barlow text-[10px] tracking-[0.25em] text-[#2a2a2a] uppercase py-1">
          DISEÑADO PARA TU RENDIMIENTO
        </p>
      </div>

      <Navbar />
    </>
  );
}
