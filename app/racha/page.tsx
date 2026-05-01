'use client';

import { useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { Plus, Minus, RefreshCw, Download, Send, Award } from 'lucide-react';
import html2canvas from 'html2canvas';

const MSGS = [
  'Escribe el nombre y agrega preps',
  '1 de 8',
  '2 de 8',
  '3 de 8',
  '4 de 8 — mitad del camino',
  '5 de 8',
  '6 de 8',
  '7 de 8 — falta solo 1',
  '8 de 8 — el siguiente PREPS es GRATIS',
];

export default function RachaPage() {
  const [name, setName] = useState('');
  const [n, setN] = useState(0);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const slots = Array.from({ length: 8 }, (_, i) => i);

  async function downloadCard() {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `RACHA-PREPS-${(name || 'CLIENTE').toUpperCase().replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Error al generar la imagen');
    } finally {
      setGenerating(false);
    }
  }

  async function shareWhatsApp() {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `racha-${name || 'cliente'}.png`, { type: 'image/png' });
        // Try Web Share API (works on mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Racha PREPS',
              text: `${name ? name.toUpperCase() + ' — ' : ''}Racha PREPS: ${n}/8`,
            });
          } catch {}
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `RACHA-PREPS-${(name || 'CLIENTE').toUpperCase()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
        setGenerating(false);
      }, 'image/png');
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  }

  return (
    <>
      {/* ── Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-black px-4 py-4 flex items-center justify-between divider"
              style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-3">
          <img src="/logo-preps.png" alt="PREPS" className="h-7 w-auto" />
          <div>
            <p className="font-barlow font-800 text-[10px] uppercase tracking-[0.22em] text-white leading-tight">
              Racha
            </p>
            <p className="font-barlow text-[9px] tracking-wider text-[#555] uppercase">
              Tarjeta de fidelidad
            </p>
          </div>
        </div>
        <button onClick={() => { setN(0); setName(''); }} className="btn-ghost p-2" title="Nueva tarjeta">
          <RefreshCw size={12} />
        </button>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {/* ── Card Preview (lo que se exporta) ──────── */}
        <div ref={cardRef} style={{
          background: '#000',
          border: '1px solid #1a1a1a',
          padding: '26px 26px 20px',
          fontFamily: 'var(--font-barlow), system-ui, sans-serif',
        }}>
          {/* Header de la tarjeta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <img src="/logo-preps.png" alt="PREPS" style={{ width: 80, height: 'auto', display: 'block' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 200, fontSize: 8, letterSpacing: '0.35em', color: '#2EE5C2', textTransform: 'uppercase', marginBottom: 2 }}>
                Nuevo sistema
              </div>
              <div style={{ fontFamily: 'var(--font-bebas), Impact, sans-serif', fontSize: 42, lineHeight: 0.9, letterSpacing: '0.04em' }}>
                <span style={{ color: '#fff' }}>RACHA </span>
                <span style={{ color: '#2EE5C2' }}>PREPS</span>
              </div>
              <div style={{ fontWeight: 200, fontSize: 8, letterSpacing: '0.3em', color: '#2a2a2a', textTransform: 'uppercase', marginTop: 8, marginBottom: 2 }}>
                Cliente
              </div>
              <div style={{
                fontFamily: 'var(--font-bebas), Impact, sans-serif',
                fontSize: 20, color: '#fff', letterSpacing: '0.08em',
                borderBottom: '1px solid #1a1a1a', paddingBottom: 1,
                minWidth: 80, display: 'inline-block', textAlign: 'right',
              }}>
                {(name || 'NOMBRE').toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: '#141414', marginBottom: 16 }} />

          {/* Slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {[0, 1].map(row => (
              <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {slots.slice(row * 4, row * 4 + 4).map(i => {
                  const filled = i < n;
                  return (
                    <div key={i} style={{
                      aspectRatio: '1 / 1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: filled ? '#000' : '#b8b8b8',
                      border: filled ? '1px solid #1e1e1e' : 'none',
                    }}>
                      {filled ? (
                        <img src="/logo-preps.png" alt="" style={{ width: '70%', height: 'auto', display: 'block' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-bebas), Impact, sans-serif', fontSize: 30, color: '#000', lineHeight: 1 }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Gift box */}
          <div style={{ width: '100%', border: '1px dashed #2EE5C2', padding: 12, textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 200, fontSize: 8, letterSpacing: '0.3em', color: '#444', textTransform: 'uppercase', marginBottom: 1 }}>
              Al completar <span style={{ color: '#2EE5C2' }}>8</span> obtienes
            </div>
            <div style={{ fontFamily: 'var(--font-bebas), Impact, sans-serif', fontSize: 38, lineHeight: 1, letterSpacing: '0.06em' }}>
              <span style={{ color: '#fff' }}>PREPS </span>
              <span style={{ color: '#2EE5C2' }}>GRATIS</span>
            </div>
            <div style={{ fontWeight: 200, fontSize: 7, letterSpacing: '0.25em', color: '#2a2a2a', textTransform: 'uppercase', marginTop: 3 }}>
              Diseñado para tu rendimiento
            </div>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: '#141414', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                height: 1, background: '#2EE5C2',
                width: `${Math.round((n / 8) * 100)}%`,
                transition: 'width 0.4s',
              }} />
            </div>
            <div style={{ fontFamily: 'var(--font-bebas), Impact, sans-serif', fontSize: 13, color: '#252525', letterSpacing: '0.08em', minWidth: 40, textAlign: 'right' }}>
              {n} / 8
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, borderTop: '1px solid #141414' }}>
            <div style={{ fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', color: '#2a2a2a', textTransform: 'uppercase', lineHeight: 2 }}>
              Completa <span style={{ color: '#2EE5C2' }}>8 preps</span><br />
              y el 9° es <span style={{ color: '#2EE5C2' }}>gratis</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-bebas), Impact, sans-serif', fontSize: 14, color: '#fff', letterSpacing: '0.12em' }}>
                @PREPSCL
              </div>
              <div style={{ fontWeight: 200, fontSize: 7, color: '#1a1a1a', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>
                preps.cl
              </div>
            </div>
          </div>
        </div>

        {/* ── Panel de control ───────────────────────── */}
        <div className="card-solid p-4 space-y-3">
          <p className="label">Panel de gestión</p>

          <input
            type="text"
            className="input"
            placeholder="NOMBRE DEL CLIENTE"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => n > 0 && setN(n - 1)}
              className="btn-dark py-3 disabled:opacity-30"
              disabled={n === 0}>
              <Minus size={14} />
            </button>
            <button onClick={() => n < 8 && setN(n + 1)}
              className="btn-brand col-span-2 py-3 text-xs disabled:opacity-30"
              disabled={n === 8}>
              <Plus size={14} className="mr-1" /> PREP COMPLETADO
            </button>
          </div>

          <div className={`text-center font-barlow text-[10px] uppercase tracking-[0.18em] py-2 ${n === 8 ? 'text-brand' : 'text-[#555]'}`}>
            {MSGS[n]}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={shareWhatsApp} disabled={generating || !name}
              className="btn-brand py-3 text-xs disabled:opacity-30">
              <Send size={12} className="mr-1.5" /> ENVIAR
            </button>
            <button onClick={downloadCard} disabled={generating || !name}
              className="btn-dark py-3 text-xs disabled:opacity-30">
              <Download size={12} className="mr-1.5" /> DESCARGAR
            </button>
          </div>

          <p className="font-barlow text-[9px] text-[#444] text-center mt-2">
            {generating ? 'GENERANDO IMAGEN...' : 'La imagen se genera con la tarjeta de arriba'}
          </p>
        </div>

        {/* ── Tip ─────────────────────────────────────── */}
        <div className="card-solid p-4 flex items-start gap-3">
          <Award size={16} className="text-brand mt-0.5" />
          <div>
            <p className="font-barlow font-800 text-xs uppercase tracking-wider text-white">¿Cómo funciona?</p>
            <p className="font-barlow text-[11px] text-[#888] mt-1 leading-relaxed">
              Cada vez que tu cliente compre un PREPS, presiona <span className="text-brand">+</span> y mándale la tarjeta actualizada por WhatsApp.
              Al completar 8, el siguiente PREPS es gratis.
            </p>
          </div>
        </div>
      </main>

      <Navbar />
    </>
  );
}
