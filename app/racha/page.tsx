'use client';

import { useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { Plus, Minus, RefreshCw, Download, Send, Award, Phone, Check } from 'lucide-react';
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

// Card export size: fixed for consistent HD output
const CARD_W = 1080;
const CARD_H = 1350; // 4:5 ratio (Instagram-friendly, perfect WhatsApp preview)
const SCALE  = 1;    // multiplied by html2canvas scale=3 → final 3240x4050px

export default function RachaPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [n, setN] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [lastDataUrl, setLastDataUrl] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const slots = Array.from({ length: 8 }, (_, i) => i);

  async function generateImage(): Promise<{ blob: Blob; dataUrl: string } | null> {
    if (!exportRef.current) return null;
    const canvas = await html2canvas(exportRef.current, {
      backgroundColor: '#000000',
      scale: 3,
      useCORS: true,
      width: CARD_W,
      height: CARD_H,
      windowWidth: CARD_W,
      windowHeight: CARD_H,
    });
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(), 'image/png', 1.0);
    });
    return { blob, dataUrl };
  }

  function fileNameSafe() {
    const base = (name || 'cliente').toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_-]/g, '');
    return `RACHA-PREPS-${base}.png`;
  }

  async function downloadCard() {
    setGenerating(true);
    try {
      const result = await generateImage();
      if (!result) return;
      setLastDataUrl(result.dataUrl);
      const link = document.createElement('a');
      link.download = fileNameSafe();
      link.href = result.dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Error al generar la imagen');
    } finally {
      setGenerating(false);
    }
  }

  // Native share (sistema iOS/Android — abre selector con WhatsApp incluido)
  async function shareNative() {
    setGenerating(true);
    try {
      const result = await generateImage();
      if (!result) return;
      setLastDataUrl(result.dataUrl);
      const file = new File([result.blob], fileNameSafe(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Racha PREPS',
          text: `${name ? name.toUpperCase() + ' — ' : ''}Tu racha PREPS: ${n}/8`,
        });
      } else {
        // Fallback desktop: descarga
        const link = document.createElement('a');
        link.download = fileNameSafe();
        link.href = result.dataUrl;
        link.click();
      }
    } catch (e) {
      // user cancelled or share failed
      console.log(e);
    } finally {
      setGenerating(false);
    }
  }

  // Send to specific phone via WhatsApp
  // (WhatsApp no permite adjuntar archivo via URL: descargamos la imagen y abrimos el chat con texto)
  async function sendToPhone() {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length < 8) {
      alert('Ingresá un número de teléfono válido (con código de país, ej: 569XXXXXXXX)');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateImage();
      if (!result) return;
      setLastDataUrl(result.dataUrl);

      // 1) Descargar la imagen
      const link = document.createElement('a');
      link.download = fileNameSafe();
      link.href = result.dataUrl;
      link.click();

      // 2) Pequeño delay y abrir WhatsApp
      await new Promise(r => setTimeout(r, 500));
      const msg = encodeURIComponent(
        `Hola${name ? ' ' + name : ''}! 🍱\n\nAcá te dejo tu tarjeta de fidelidad PREPS — vas ${n}/8.\nAl completar 8, el siguiente es ¡GRATIS! 🎁\n\n(Adjuntá la imagen que se acaba de descargar)`
      );
      window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
    } catch (e) {
      console.error(e);
    } finally {
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
        <button onClick={() => { setN(0); setName(''); setPhone(''); setLastDataUrl(null); }}
          className="btn-ghost p-2" title="Nueva tarjeta">
          <RefreshCw size={12} />
        </button>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5 pb-24">

        {/* ── PREVIEW (visible, responsive) ─────────────── */}
        <div className="card-solid overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
          <CardContent name={name} n={n} slots={slots} responsive />
        </div>

        {/* ── EXPORT TARGET (off-screen, fijo HD) ───────── */}
        <div style={{
          position: 'absolute', left: '-99999px', top: 0,
          width: `${CARD_W}px`, height: `${CARD_H}px`, pointerEvents: 'none',
        }}>
          <div ref={exportRef} style={{ width: `${CARD_W}px`, height: `${CARD_H}px` }}>
            <CardContent name={name} n={n} slots={slots} />
          </div>
        </div>

        {/* ── Panel ──────────────────────────────────── */}
        <div className="card-solid p-4 space-y-3">
          <p className="label">Datos del cliente</p>

          <input
            type="text"
            className="input"
            placeholder="NOMBRE DEL CLIENTE"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <input
            type="tel"
            className="input"
            placeholder="WHATSAPP (ej: 569XXXXXXXX)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            inputMode="numeric"
          />

          <div className="grid grid-cols-3 gap-2 pt-2">
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
        </div>

        {/* ── ACCIONES ENVIO ────────────────────────────── */}
        <div className="card-solid p-4 space-y-3">
          <p className="label">Enviar tarjeta</p>

          {/* Enviar a teléfono específico */}
          <button onClick={sendToPhone} disabled={generating || !name || phone.replace(/\D/g,'').length < 8}
            className="btn-brand w-full py-3 text-xs disabled:opacity-30">
            <Phone size={12} className="mr-2" />
            ENVIAR POR WHATSAPP A ESTE NÚMERO
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={shareNative} disabled={generating || !name}
              className="btn-dark py-3 text-xs disabled:opacity-30">
              <Send size={12} className="mr-1.5" /> COMPARTIR
            </button>
            <button onClick={downloadCard} disabled={generating || !name}
              className="btn-dark py-3 text-xs disabled:opacity-30">
              <Download size={12} className="mr-1.5" /> DESCARGAR
            </button>
          </div>

          <p className="font-barlow text-[10px] text-[#666] text-center leading-relaxed">
            {generating
              ? '⏳ GENERANDO IMAGEN HD...'
              : 'La imagen se descarga en 1080×1350 (HD) — perfecta para WhatsApp'}
          </p>

          {lastDataUrl && (
            <div className="flex items-center justify-center gap-2 text-brand pt-1">
              <Check size={12} />
              <span className="font-barlow text-[10px] tracking-widest">IMAGEN GENERADA</span>
            </div>
          )}
        </div>

        {/* ── INFO ─────────────────────────────────────── */}
        <div className="card-solid p-4 flex items-start gap-3">
          <Award size={16} className="text-brand mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-barlow font-800 text-xs uppercase tracking-wider text-white">¿Cómo funciona?</p>
            <p className="font-barlow text-[11px] text-[#888] mt-1 leading-relaxed">
              Cada vez que tu cliente compre, presioná <span className="text-brand">+</span> y enviale la tarjeta actualizada.
              Al llegar a 8, el siguiente PREPS es <span className="text-brand">gratis</span>.
            </p>
          </div>
        </div>
      </main>

      <Navbar />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Card content — usado tanto para preview como para export
// `responsive: true` → escala con el contenedor (preview)
// sin responsive → tamaño fijo en píxeles (export)
// ─────────────────────────────────────────────────────────────
function CardContent({
  name, n, slots, responsive,
}: { name: string; n: number; slots: number[]; responsive?: boolean }) {
  // Para preview responsive usamos vw-like units, para export usamos px fijos
  const px = (v: number) => responsive ? `${(v / CARD_W) * 100}cqw` : `${v}px`;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#000', color: '#fff',
      fontFamily: 'var(--font-barlow), system-ui, sans-serif',
      padding: px(60),
      containerType: responsive ? 'inline-size' : undefined,
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: px(40) }}>
        <img src="/logo-preps.png" alt="PREPS" style={{
          width: px(180), height: 'auto', display: 'block',
        }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontWeight: 200, fontSize: px(18), letterSpacing: '0.35em',
            color: '#2EE5C2', textTransform: 'uppercase', marginBottom: px(6),
          }}>
            Nuevo sistema
          </div>
          <div style={{
            fontFamily: 'var(--font-bebas), Impact, sans-serif',
            fontSize: px(82), lineHeight: 0.9, letterSpacing: '0.04em',
          }}>
            <span style={{ color: '#fff' }}>RACHA </span>
            <span style={{ color: '#2EE5C2' }}>PREPS</span>
          </div>
          <div style={{
            fontWeight: 200, fontSize: px(16), letterSpacing: '0.3em',
            color: '#555', textTransform: 'uppercase', marginTop: px(20), marginBottom: px(4),
          }}>
            Cliente
          </div>
          <div style={{
            fontFamily: 'var(--font-bebas), Impact, sans-serif',
            fontSize: px(40), color: '#fff', letterSpacing: '0.08em',
            borderBottom: '2px solid #1a1a1a', paddingBottom: px(2),
            minWidth: px(220), display: 'inline-block', textAlign: 'right',
            lineHeight: 1,
          }}>
            {(name || 'NOMBRE').toUpperCase()}
          </div>
        </div>
      </div>

      {/* RULE */}
      <div style={{ width: '100%', height: 1, background: '#222', marginBottom: px(40) }} />

      {/* SLOTS GRID */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(14), marginBottom: px(36) }}>
        {[0, 1].map(row => (
          <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: px(14) }}>
            {slots.slice(row * 4, row * 4 + 4).map(i => {
              const filled = i < n;
              return (
                <div key={i} style={{
                  aspectRatio: '1 / 1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: filled ? '#000' : '#b8b8b8',
                  border: filled ? '2px solid #2EE5C2' : 'none',
                  position: 'relative',
                }}>
                  {filled ? (
                    <img src="/logo-preps.png" alt="" style={{
                      width: '70%', height: 'auto', display: 'block',
                    }} />
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-bebas), Impact, sans-serif',
                      fontSize: px(64), color: '#000', lineHeight: 1, fontWeight: 400,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* GIFT BOX */}
      <div style={{
        width: '100%', border: '2px dashed #2EE5C2',
        padding: px(28), textAlign: 'center', marginBottom: px(28),
      }}>
        <div style={{
          fontWeight: 200, fontSize: px(16), letterSpacing: '0.3em',
          color: '#666', textTransform: 'uppercase', marginBottom: px(4),
        }}>
          Al completar <span style={{ color: '#2EE5C2', fontWeight: 700 }}>8</span> obtienes
        </div>
        <div style={{
          fontFamily: 'var(--font-bebas), Impact, sans-serif',
          fontSize: px(78), lineHeight: 1, letterSpacing: '0.06em',
        }}>
          <span style={{ color: '#fff' }}>PREPS </span>
          <span style={{ color: '#2EE5C2' }}>GRATIS</span>
        </div>
        <div style={{
          fontWeight: 200, fontSize: px(14), letterSpacing: '0.25em',
          color: '#555', textTransform: 'uppercase', marginTop: px(8),
        }}>
          Diseñado para tu rendimiento
        </div>
      </div>

      {/* PROGRESS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: px(20), marginBottom: px(28) }}>
        <div style={{ flex: 1, height: 2, background: '#222', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: 2,
            background: '#2EE5C2',
            width: `${Math.round((n / 8) * 100)}%`,
            transition: 'width 0.4s',
          }} />
        </div>
        <div style={{
          fontFamily: 'var(--font-bebas), Impact, sans-serif',
          fontSize: px(28), color: '#fff', letterSpacing: '0.08em',
          minWidth: px(80), textAlign: 'right', lineHeight: 1,
        }}>
          {n} / 8
        </div>
      </div>

      {/* SPACER que empuja el footer abajo */}
      <div style={{ flex: 1 }} />

      {/* FOOTER */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingTop: px(28), borderTop: '1px solid #222',
      }}>
        <div style={{
          fontWeight: 200, fontSize: px(18), letterSpacing: '0.18em',
          color: '#555', textTransform: 'uppercase', lineHeight: 1.8,
        }}>
          Completa <span style={{ color: '#2EE5C2', fontWeight: 700 }}>8 PREPS</span><br />
          y el 9° es <span style={{ color: '#2EE5C2', fontWeight: 700 }}>GRATIS</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-bebas), Impact, sans-serif',
            fontSize: px(28), color: '#fff', letterSpacing: '0.12em', lineHeight: 1,
          }}>
            @PREPSCL
          </div>
          <div style={{
            fontWeight: 200, fontSize: px(13), color: '#444',
            letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: px(6),
          }}>
            preps.cl
          </div>
        </div>
      </div>
    </div>
  );
}
