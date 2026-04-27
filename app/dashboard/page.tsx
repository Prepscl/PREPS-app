'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAutoRefresh } from '@/components/NotificationProvider';
import VentaModal from '@/components/VentaModal';
import { formatCLP } from '@/lib/calculations';
import { RefreshCw, PlusCircle, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ConIVA { monto: number; neto: number; iva: number; count: number }
interface SinIVA { monto: number; count: number }
interface InversionStats { totalInvertido: number; recuperado: number; porRecuperar: number; count: number }
interface DespItem { ingrediente: string; stock_g: number }
interface TaperesData { stock: number }

interface DashboardData {
  ventaBruta: number; ivaTotal: number; gananciaNeta: number; margen: number;
  costoTotal: number; netoTotal: number;
  conIVA: ConIVA; sinIVA: SinIVA;
  pedidosPendientes: number; pedidosAceptados: number;
  inversion: InversionStats; despensa: DespItem[]; taperes: TaperesData;
}

// ── Reset Modal ──────────────────────────────────────────────────
function ResetModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [opcion, setOpcion] = useState<'solo_ventas' | 'todo'>('solo_ventas');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function doReset() {
    if (confirm !== 'BORRAR') { setError('Escribe BORRAR para confirmar'); return; }
    setLoading(true);
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opcion, confirm: 'RESET_PREPS' }),
    });
    if (res.ok) { onDone(); onClose(); }
    else setError('Error al resetear');
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90" onClick={onClose}>
      <div
        className="w-full max-w-lg animate-slide-up bg-black max-h-[90vh] overflow-y-auto"
        style={{ borderTop: '1px solid #1a1a1a' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-black flex items-center justify-between px-5 pt-5 pb-4 divider z-10">
          <div className="flex items-center gap-3">
            <Trash2 size={14} className="text-white" />
            <span className="eyebrow text-white">Limpiar Datos</span>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 pb-28 space-y-5">
          <p className="font-barlow text-xs text-[#888] leading-relaxed">
            Acción irreversible. Usa esto solo para empezar con datos reales.
          </p>

          <div className="grid grid-cols-1 gap-0" style={{ border: '1px solid #1a1a1a' }}>
            {([
              { v: 'solo_ventas', title: 'SOLO VENTAS', desc: 'Elimina pedidos y ventas. Conserva inventario.' },
              { v: 'todo',        title: 'RESET TOTAL', desc: 'Todo: ventas, pedidos, inversiones. Reinicia stocks.' },
            ] as { v: 'solo_ventas'|'todo'; title: string; desc: string }[]).map(({ v, title, desc }, i) => (
              <button key={v} onClick={() => setOpcion(v)}
                className="w-full flex items-start gap-3 p-4 text-left transition-all"
                style={{
                  background: opcion === v ? '#2EE5C2' : 'transparent',
                  color:      opcion === v ? '#000'    : '#fff',
                  borderTop:  i > 0 ? '1px solid #1a1a1a' : 'none',
                }}>
                <div className="flex-1">
                  <p className="font-barlow font-800 text-xs tracking-[0.22em]">{title}</p>
                  <p className="font-barlow text-[11px] mt-1 opacity-70">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <p className="label mb-2">Escribe <span className="text-white font-800">BORRAR</span></p>
            <input className="input font-bebas text-xl tracking-widest text-white"
              placeholder="BORRAR"
              value={confirm}
              onChange={e => { setConfirm(e.target.value.toUpperCase()); setError(''); }}
            />
          </div>

          {error && <p className="text-xs text-white font-barlow">{error}</p>}

          <div className="flex gap-2 pb-2">
            <button onClick={onClose} className="btn-dark flex-1">CANCELAR</button>
            <button
              onClick={doReset}
              disabled={loading || confirm !== 'BORRAR'}
              className="btn-white flex-1 disabled:opacity-30">
              {loading ? 'LIMPIANDO' : 'CONFIRMAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ventas Historial (editable) ─────────────────────────────────
interface VentaRow {
  id: number; pedido_id: number | null; monto: number; costo: number;
  iva: number; ganancia: number; con_iva: boolean;
  tipo_venta: 'PEDIDO' | 'MANUAL'; descripcion: string; created_at: string;
}

function VentasSection({ onChange }: { onChange: () => void }) {
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ monto: '', costo: '', con_iva: true, descripcion: '' });

  const load = useCallback(async () => {
    try { setVentas(await (await fetch('/api/ventas')).json()); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  function startEdit(v: VentaRow) {
    setEditing(v.id);
    setForm({
      monto: String(v.monto), costo: String(v.costo),
      con_iva: v.con_iva, descripcion: v.descripcion,
    });
  }

  async function saveEdit() {
    if (editing == null) return;
    await fetch('/api/ventas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing,
        monto: parseInt(form.monto) || 0,
        costo: parseInt(form.costo) || 0,
        con_iva: form.con_iva, descripcion: form.descripcion,
      }),
    });
    setEditing(null);
    await load();
    onChange();
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar esta venta?')) return;
    await fetch('/api/ventas', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    onChange();
  }

  return (
    <section>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <p className="label">Historial Ventas</p>
          <span className="eyebrow">{ventas.length} registros</span>
        </div>
        {open ? <ChevronDown size={14} className="text-[#555]" /> : <ChevronRight size={14} className="text-[#555]" />}
      </button>

      {open && (
        <div style={{ border: '1px solid #1a1a1a' }}>
          {ventas.length === 0 ? (
            <p className="font-barlow text-[10px] text-[#444] text-center uppercase tracking-[0.22em] py-8">
              SIN VENTAS REGISTRADAS
            </p>
          ) : ventas.map((v, i) => (
            <div key={v.id} style={{ borderTop: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
              {editing === v.id ? (
                <div className="p-4 space-y-2 animate-fade-in">
                  <div className="flex gap-0" style={{ border: '1px solid #1a1a1a' }}>
                    {[
                      { v: true,  label: 'CON IVA' },
                      { v: false, label: 'SIN IVA' },
                    ].map(({ v: cv, label }, idx) => (
                      <button key={String(cv)} onClick={() => setForm(f => ({ ...f, con_iva: cv }))}
                        className="flex-1 py-1.5 font-barlow font-800 text-[9px] tracking-[0.2em] uppercase transition-all"
                        style={{
                          background: form.con_iva === cv ? '#2EE5C2' : 'transparent',
                          color:      form.con_iva === cv ? '#000'    : '#555',
                          borderLeft: idx === 1 ? '1px solid #1a1a1a' : 'none',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="input font-bebas text-base" placeholder="Monto"
                      value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
                    <input type="number" className="input" placeholder="Costo"
                      value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} />
                  </div>
                  <input className="input" placeholder="Descripción"
                    value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditing(null)} className="btn-dark flex-1 text-[10px] py-2">CANCELAR</button>
                    <button onClick={saveEdit} className="btn-brand flex-1 py-2 text-[10px]">GUARDAR</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bebas text-lg text-white">{formatCLP(v.monto)}</span>
                      <span className="eyebrow">{v.con_iva ? 'C/IVA' : 'S/IVA'}</span>
                      {v.tipo_venta === 'PEDIDO' && <span className="eyebrow">PEDIDO</span>}
                    </div>
                    <p className="font-barlow text-[10px] text-[#555] truncate mt-0.5">
                      {v.descripcion || '—'} · {v.created_at.split(',')[0]}
                    </p>
                  </div>
                  <span className="font-bebas text-sm text-[#666]">+{formatCLP(v.ganancia)}</span>
                  <button onClick={() => startEdit(v)} className="p-1.5 text-[#555] hover:text-white" title="Editar">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => del(v.id)} className="p-1.5 text-[#333] hover:text-white" title="Eliminar">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const fetchData = useCallback(async () => {
    try { setData(await (await fetch('/api/dashboard')).json()); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, 45000);

  const inv = data?.inversion;
  const invPct = inv && inv.totalInvertido > 0
    ? Math.min(100, (inv.recuperado / inv.totalInvertido) * 100) : 0;

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-black px-4 py-4 flex items-center justify-between divider"
              style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-3">
          <span className="preps-logo">PREPS</span>
          <div>
            <p className="font-barlow font-800 text-[10px] uppercase tracking-[0.22em] text-white leading-tight">
              Dashboard
            </p>
            <p className="font-barlow text-[9px] tracking-wider text-[#555] uppercase">
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)} className="btn-brand px-3 py-2 text-[11px]">
            <PlusCircle size={12} className="mr-1" />
            VENTA
          </button>
          <button onClick={fetchData} className="btn-ghost p-2">
            <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowReset(true)} className="btn-ghost p-2" title="Limpiar datos">
            <Trash2 size={12} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-6">

        {/* ── Hero: Venta Bruta ──────────────────────────── */}
        <section>
          <p className="label mb-2">VENTA BRUTA</p>
          <p className="font-bebas text-[72px] leading-[0.9] text-[#2EE5C2]">
            {data ? formatCLP(data.ventaBruta) : '——'}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-barlow text-[10px] tracking-widest uppercase text-[#555]">
              {(data?.conIVA.count ?? 0) + (data?.sinIVA.count ?? 0)} ventas · {data?.pedidosAceptados ?? 0} pedidos
            </span>
            {(data?.pedidosPendientes ?? 0) > 0 && (
              <span className="badge-brand animate-pulse-fast">
                {data!.pedidosPendientes} PEND.
              </span>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── KPI grid ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-0" style={{ border: '1px solid #1a1a1a' }}>
          {[
            { label: 'GANANCIA NETA',  value: data ? formatCLP(data.gananciaNeta) : '——', sub: 'Después insumos' },
            { label: 'MARGEN',         value: data ? `${data.margen}%` : '——',             sub: 'Sobre neto' },
            { label: 'IVA ACUMULADO',  value: data ? formatCLP(data.ivaTotal) : '——',      sub: 'Solo c/boleta' },
            { label: 'COSTO INSUMOS',  value: data ? formatCLP(data.costoTotal) : '——',    sub: 'Acumulado' },
          ].map(({ label, value, sub }, i) => (
            <div key={label} className="p-4"
                 style={{
                   borderLeft:   i % 2 === 1 ? '1px solid #1a1a1a' : 'none',
                   borderTop:    i >= 2      ? '1px solid #1a1a1a' : 'none',
                 }}>
              <p className="label mb-1">{label}</p>
              <p className="font-bebas text-3xl text-white leading-tight">{value}</p>
              <p className="font-barlow text-[9px] uppercase tracking-wider text-[#444] mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Desglose tipo ──────────────────────────────── */}
        <section>
          <p className="label mb-3">Desglose por tipo</p>
          <div className="space-y-0" style={{ border: '1px solid #1a1a1a' }}>
            {/* Con IVA */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-barlow font-700 text-[11px] tracking-[0.22em] uppercase text-white">Con Boleta</p>
                <p className="font-barlow text-[10px] text-[#555] mt-1">
                  Neto {formatCLP(data?.conIVA.neto ?? 0)} · {data?.conIVA.count ?? 0} trans.
                </p>
              </div>
              <span className="font-bebas text-2xl text-white">{formatCLP(data?.conIVA.monto ?? 0)}</span>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a' }} />
            {/* Sin IVA */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-barlow font-700 text-[11px] tracking-[0.22em] uppercase text-white">Sin Boleta</p>
                <p className="font-barlow text-[10px] text-[#555] mt-1">
                  Precio es neto · {data?.sinIVA.count ?? 0} trans.
                </p>
              </div>
              <span className="font-bebas text-2xl text-white">{formatCLP(data?.sinIVA.monto ?? 0)}</span>
            </div>
          </div>
        </section>

        {/* ── Inversión ──────────────────────────────────── */}
        <section>
          <div className="flex justify-between items-baseline mb-2">
            <p className="label">Inversión Inicial</p>
            <span className="font-barlow text-[10px] tracking-wider uppercase text-[#444]">{inv?.count ?? 0} ítems</span>
          </div>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-bebas text-4xl text-white">{formatCLP(inv?.totalInvertido ?? 0)}</span>
            <span className="eyebrow">TOTAL</span>
          </div>

          <div className="h-[2px] mb-2" style={{ background: '#1a1a1a' }}>
            <div className="h-full transition-all duration-700"
              style={{
                width: `${invPct}%`,
                background: invPct >= 100 ? '#fff' : '#2EE5C2',
              }} />
          </div>

          <div className="flex justify-between items-center">
            <span className="font-bebas text-lg" style={{ color: invPct >= 100 ? '#fff' : '#2EE5C2' }}>
              {invPct.toFixed(1)}% RECUPERADO
            </span>
            {(inv?.porRecuperar ?? 0) > 0
              ? <span className="font-barlow text-[10px] uppercase tracking-wider text-[#555]">Faltan {formatCLP(inv!.porRecuperar)}</span>
              : inv?.totalInvertido && inv.totalInvertido > 0
              ? <span className="font-barlow font-800 text-[10px] tracking-[0.22em] text-white">RECUPERADA</span>
              : null
            }
          </div>
        </section>

        {/* ── Inventario ──────────────────────────────────── */}
        <section>
          <div className="flex justify-between items-baseline mb-3">
            <p className="label">Inventario</p>
            <a href="/inventario" className="font-barlow text-[10px] tracking-[0.22em] uppercase text-[#555] hover:text-white transition-colors">
              Gestionar →
            </a>
          </div>

          <div className="space-y-0" style={{ border: '1px solid #1a1a1a' }}>
            <div className="flex justify-between items-center p-4">
              <span className="font-barlow font-700 text-[11px] tracking-[0.22em] uppercase text-white">Tápers</span>
              <span className="font-bebas text-xl text-white">{data?.taperes.stock ?? 0} un.</span>
            </div>
            {data?.despensa.map(item => (
              <div key={item.ingrediente}
                   className="flex justify-between items-center p-4"
                   style={{ borderTop: '1px solid #1a1a1a' }}>
                <span className="font-barlow font-700 text-[11px] tracking-[0.22em] uppercase text-[#888] capitalize">
                  {item.ingrediente}
                </span>
                <span className="font-bebas text-xl text-white">
                  {(item.stock_g / 1000).toFixed(2)} kg
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Ventas editables ──────────────────────────────── */}
        <VentasSection onChange={fetchData} />

        {/* ── Pedidos pendientes alert ─────────────────────── */}
        {(data?.pedidosPendientes ?? 0) > 0 && (
          <a href="/comandas" className="flex items-center justify-between p-4 animate-fade-in"
             style={{ background: '#2EE5C2', color: '#000' }}>
            <div>
              <p className="font-bebas text-xl leading-tight">
                {data!.pedidosPendientes} PEDIDO{data!.pedidosPendientes > 1 ? 'S' : ''} ESPERANDO PAGO
              </p>
              <p className="font-barlow text-[10px] uppercase tracking-[0.22em] mt-1">
                Ver comandas →
              </p>
            </div>
          </a>
        )}

        <p className="text-center font-barlow text-[9px] tracking-[0.28em] text-[#222] uppercase pt-6 pb-2">
          DISEÑADO PARA TU RENDIMIENTO
        </p>
      </div>

      {showModal && <VentaModal onClose={() => setShowModal(false)} onSaved={fetchData} />}
      {showReset && <ResetModal onClose={() => setShowReset(false)} onDone={fetchData} />}
      <Navbar pendientes={data?.pedidosPendientes ?? 0} />
    </>
  );
}
