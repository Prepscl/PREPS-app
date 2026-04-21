'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { useAutoRefresh, playNotificationSound } from '@/components/NotificationProvider';
import { formatCLP, calcularCostoPlato } from '@/lib/calculations';
import {
  CheckCircle2, XCircle, Clock, User, Phone, MessageSquare,
  Plus, RefreshCw, Globe, Smartphone, ChevronDown, ChevronUp,
  Pencil, X,
} from 'lucide-react';
import clsx from 'clsx';

type Estado = 'PENDIENTE_PAGO' | 'ACEPTADO' | 'RECHAZADO' | 'CANCELADO';

interface ItemPedido {
  tipo?: string; nombre?: string; cantidad?: number;
  precio?: number; g_pollo?: number; g_arroz?: number; g_brocoli?: number;
  variante?: string;
}

interface Pedido {
  id: number; numero: string; tipo: string; cliente: string; telefono: string;
  items: string; total: number; costo: number; estado: Estado;
  origen: string; notas: string; created_at: string; accepted_at?: string;
}

const ESTADO_LABEL: Record<Estado, string> = {
  PENDIENTE_PAGO: 'PEND. PAGO',
  ACEPTADO:       'ACEPTADO',
  RECHAZADO:      'RECHAZADO',
  CANCELADO:      'CANCELADO',
};

const TIPOS_PLAN = [
  { value: 'low_carb',  label: 'LOW CARB',  precio: 4990,   g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
  { value: 'high_carb', label: 'HIGH CARB', precio: 5690,   g_pollo: 200, g_arroz: 300, g_brocoli: 200 },
  { value: 'pack_5',    label: 'PACK ×5',   precio: 24990,  g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
  { value: 'pack_15',   label: 'PACK ×15',  precio: 72900,  g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
  { value: 'pack_28',   label: 'PACK ×28',  precio: 129000, g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
  { value: 'labs',      label: 'LABS',      precio: 0,      g_pollo: 200, g_arroz: 150, g_brocoli: 100 },
];

// ── Edit Panel ────────────────────────────────────────────────────
function EditPanel({
  pedido, onSaved, onClose,
}: { pedido: Pedido; onSaved: () => void; onClose: () => void }) {
  let parsedItems: ItemPedido[] = [];
  try { parsedItems = JSON.parse(pedido.items); } catch {}
  const firstItem = parsedItems[0] ?? {};

  const [cliente,  setCliente]  = useState(pedido.cliente);
  const [telefono, setTelefono] = useState(pedido.telefono);
  const [notas,    setNotas]    = useState(pedido.notas);
  const [total,    setTotal]    = useState(String(pedido.total));
  const [tipo,     setTipo]     = useState(pedido.tipo);
  const [gPollo,   setGPollo]   = useState(firstItem.g_pollo  ?? 200);
  const [gArroz,   setGArroz]   = useState(firstItem.g_arroz  ?? 150);
  const [gBrocoli, setGBrocoli] = useState(firstItem.g_brocoli ?? 100);
  const [cantidad, setCantidad] = useState(firstItem.cantidad ?? 1);
  const [saving, setSaving]     = useState(false);

  const precioTipo = TIPOS_PLAN.find(t => t.value === tipo)?.precio ?? 0;
  const costoCalc  = calcularCostoPlato(gPollo, gArroz, gBrocoli) * cantidad;

  async function save() {
    setSaving(true);
    const newItems = JSON.stringify([{
      tipo, nombre: TIPOS_PLAN.find(t => t.value === tipo)?.label ?? tipo,
      cantidad, precio: parseInt(total) / cantidad || precioTipo,
      g_pollo: gPollo, g_arroz: gArroz, g_brocoli: gBrocoli,
    }]);
    await fetch(`/api/pedidos/${pedido.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'EDITAR', cliente, telefono, notas,
        total: parseInt(total) || precioTipo * cantidad,
        items: newItems,
      }),
    });
    onSaved(); onClose();
    setSaving(false);
  }

  return (
    <div className="animate-fade-in space-y-4 px-4 pb-4 pt-4"
      style={{ borderTop: '1px solid #1a1a1a', background: '#060606' }}>
      <div className="flex items-center justify-between">
        <p className="eyebrow text-white">EDITAR PEDIDO</p>
        <button onClick={onClose}><X size={14} className="text-[#555]" /></button>
      </div>

      {/* Plan type */}
      <div>
        <p className="label mb-2">Plan</p>
        <div className="grid grid-cols-3 gap-0" style={{ border: '1px solid #1a1a1a' }}>
          {TIPOS_PLAN.map((t, i) => (
            <button key={t.value} onClick={() => {
              setTipo(t.value);
              setGPollo(t.g_pollo); setGArroz(t.g_arroz); setGBrocoli(t.g_brocoli);
              if (t.precio) setTotal(String(t.precio * cantidad));
            }}
              className="py-2.5 font-bebas text-sm tracking-wider transition-all"
              style={{
                background: tipo === t.value ? '#FFD600' : 'transparent',
                color:      tipo === t.value ? '#000'    : '#777',
                borderLeft: i % 3 !== 0 ? '1px solid #1a1a1a' : 'none',
                borderTop:  i >= 3     ? '1px solid #1a1a1a' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gramos */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'POLLO (g)',   val: gPollo,   set: setGPollo   },
          { label: 'ARROZ (g)',   val: gArroz,   set: setGArroz   },
          { label: 'BRÓCOLI (g)', val: gBrocoli, set: setGBrocoli },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <p className="label mb-1.5">{label}</p>
            <input type="number" className="input font-bebas text-base text-center py-2"
              value={val} onChange={e => set(Number(e.target.value))} min={0} step={50} />
          </div>
        ))}
      </div>

      {/* Cliente + teléfono */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="label mb-1.5">Cliente</p>
          <input className="input" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre" />
        </div>
        <div>
          <p className="label mb-1.5">Teléfono</p>
          <input className="input" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+569..." />
        </div>
      </div>

      {/* Total + cantidad */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="label mb-1.5">Total ($)</p>
          <input type="number" className="input font-bebas text-lg text-white" value={total}
            onChange={e => setTotal(e.target.value)} />
        </div>
        <div>
          <p className="label mb-1.5">Cantidad</p>
          <input type="number" className="input font-bebas text-lg" value={cantidad} min={1}
            onChange={e => setCantidad(Number(e.target.value))} />
        </div>
      </div>

      {/* Notas */}
      <div>
        <p className="label mb-1.5">Notas</p>
        <input className="input" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
      </div>

      {/* Costo preview */}
      <div className="flex justify-between items-center p-3 font-barlow text-xs"
           style={{ border: '1px solid #1a1a1a' }}>
        <span className="eyebrow">COSTO ESTIMADO</span>
        <span className="font-bebas text-base text-white">{formatCLP(costoCalc)}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="btn-dark flex-1 text-xs py-2.5">CANCELAR</button>
        <button onClick={save} disabled={saving} className="btn-brand flex-1 py-2.5 disabled:opacity-30">
          {saving ? '...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────
function OrderCard({
  pedido, onAccept, onReject, onRefresh, loading,
}: {
  pedido: Pedido;
  onAccept:  (id: number, conIva: boolean) => void;
  onReject:  (id: number) => void;
  onRefresh: () => void;
  loading:   boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [conIva,   setConIva]   = useState(true);
  const [editing,  setEditing]  = useState(false);

  const isPending = pedido.estado === 'PENDIENTE_PAGO';

  let items: ItemPedido[] = [];
  try { items = JSON.parse(pedido.items); } catch {}

  const iva      = conIva ? Math.round(pedido.total - pedido.total / 1.19) : 0;
  const neto     = conIva ? Math.round(pedido.total / 1.19) : pedido.total;
  const ganancia = neto - pedido.costo;

  return (
    <div style={{ border: '1px solid #1a1a1a', background: isPending ? '#0a0a0a' : 'transparent' }}>
      <div className="flex">
        {/* Yellow bar if pending */}
        <div style={{ width: 2, background: isPending ? '#FFD600' : 'transparent', flexShrink: 0 }} />

        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bebas text-base tracking-wider text-white">
                  {pedido.numero}
                </span>
                <span className="badge-outline">
                  {ESTADO_LABEL[pedido.estado]}
                </span>
                <span className="font-barlow text-[9px] flex items-center gap-0.5 tracking-wider uppercase text-[#333]">
                  {pedido.origen === 'WEB'
                    ? <><Globe size={9} />WEB</>
                    : <><Smartphone size={9} />MANUAL</>}
                </span>
              </div>
              <p className="font-barlow text-[10px] mt-1 tracking-wider text-[#333]">
                {pedido.created_at}
              </p>
            </div>
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
              <p className="font-bebas text-2xl leading-none text-white">{formatCLP(pedido.total)}</p>
              <p className="font-barlow text-[10px] text-[#333]">
                Costo {formatCLP(pedido.costo)}
              </p>
              {isPending && !editing && (
                <button onClick={() => setEditing(true)} className="btn-ghost px-2 py-1">
                  <Pencil size={9} className="mr-1" /> EDITAR
                </button>
              )}
            </div>
          </div>

          {/* Cliente */}
          {(pedido.cliente || pedido.telefono) && (
            <div className="flex gap-3 mb-2 text-[#666]">
              {pedido.cliente  && <span className="flex items-center gap-1 font-barlow text-xs"><User  size={10} />{pedido.cliente}</span>}
              {pedido.telefono && <span className="flex items-center gap-1 font-barlow text-xs"><Phone size={10} />{pedido.telefono}</span>}
            </div>
          )}

          {/* Notas */}
          {pedido.notas && (
            <div className="flex items-start gap-2 mb-3 p-2.5 font-barlow text-[10px] text-[#777]"
                 style={{ border: '1px solid #1a1a1a' }}>
              <MessageSquare size={10} className="mt-0.5 flex-shrink-0" />
              {pedido.notas}
            </div>
          )}

          {/* Items expand */}
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 font-barlow text-[10px] tracking-[0.22em] uppercase mb-2 text-[#555] hover:text-white transition-colors">
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {items.length} ítem{items.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="space-y-0 mb-3 animate-fade-in" style={{ border: '1px solid #1a1a1a' }}>
              {items.map((item, i) => (
                <div key={i} className="flex justify-between items-start p-3 font-barlow text-xs"
                     style={{ borderTop: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
                  <div>
                    <span className="font-700 text-white uppercase tracking-wider">
                      {item.nombre ?? item.tipo?.replace('_', ' ')} ×{item.cantidad ?? 1}
                    </span>
                    {(item.g_pollo || item.g_arroz || item.g_brocoli) && (
                      <p className="text-[10px] mt-1 text-[#555] tracking-wider">
                        POLLO {item.g_pollo ?? 0}g · ARROZ {item.g_arroz ?? 0}g · BRÓCOLI {item.g_brocoli ?? 0}g
                      </p>
                    )}
                  </div>
                  {item.precio != null && (
                    <span className="font-bebas text-base text-white">
                      {formatCLP(item.precio)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions pending */}
          {isPending && !editing && (
            <div className="space-y-3 pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
              {/* IVA toggle + ganancia */}
              <div className="flex gap-2 items-center">
                <div className="flex flex-1" style={{ border: '1px solid #1a1a1a' }}>
                  {[
                    { v: true,  label: 'CON IVA' },
                    { v: false, label: 'SIN IVA' },
                  ].map(({ v, label }, i) => (
                    <button key={String(v)} onClick={() => setConIva(v)}
                      className="flex-1 py-2 font-barlow font-800 text-[10px] tracking-[0.22em] uppercase transition-all"
                      style={{
                        background: conIva === v ? '#FFD600' : 'transparent',
                        color:      conIva === v ? '#000'    : '#555',
                        borderLeft: i === 1 ? '1px solid #1a1a1a' : 'none',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <p className="font-bebas text-lg leading-tight text-white">
                    +{formatCLP(ganancia)}
                  </p>
                  {conIva && (
                    <p className="font-barlow text-[9px] tracking-wider uppercase text-[#444]">
                      IVA {formatCLP(iva)}
                    </p>
                  )}
                </div>
              </div>

              {/* Aceptar / Rechazar */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(pedido.id, conIva)}
                  disabled={loading}
                  className="btn-brand flex-1 py-3 disabled:opacity-30">
                  <CheckCircle2 size={14} className="mr-2" />
                  ACEPTAR PAGO
                </button>
                <button
                  onClick={() => onReject(pedido.id)}
                  disabled={loading}
                  className="btn-dark w-14 disabled:opacity-30">
                  <XCircle size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditPanel pedido={pedido} onSaved={onRefresh} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

// ── Nuevo Pedido Modal ────────────────────────────────────────────
interface Cliente {
  id: number; nombre: string; email: string; telefono: string;
  count_pedidos: number; total_gastado: number;
}

function NuevoPedidoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    tipo: 'low_carb', cliente: '', email: '', telefono: '',
    notas: '', g_pollo: 200, g_arroz: 150, g_brocoli: 100, cantidad: 1,
  });
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showSug, setShowSug] = useState(false);

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(setClientes).catch(() => {});
  }, []);

  const plan = TIPOS_PLAN.find(t => t.value === form.tipo);
  const precioUnitario = plan?.precio ?? 4990;
  const total = precioUnitario * form.cantidad;

  const q = form.cliente.trim().toLowerCase();
  const sugerencias = q.length >= 1
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  function pickCliente(c: Cliente) {
    setForm(f => ({ ...f, cliente: c.nombre, email: c.email ?? '', telefono: c.telefono ?? '' }));
    setShowSug(false);
  }

  async function submit() {
    setLoading(true);
    await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        items: [{
          tipo: form.tipo,
          nombre: plan?.label ?? form.tipo,
          cantidad: form.cantidad,
          precio: precioUnitario,
          g_pollo: form.g_pollo, g_arroz: form.g_arroz, g_brocoli: form.g_brocoli,
        }],
      }),
    });
    // Guardar cliente en historial (sin monto hasta que se acepte el pago)
    if (form.cliente.trim()) {
      fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.cliente, email: form.email, telefono: form.telefono }),
      }).catch(() => {});
    }
    onCreated(); onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90" onClick={onClose}>
      <div className="w-full max-w-lg animate-slide-up bg-black max-h-[90vh] overflow-y-auto"
           style={{ borderTop: '1px solid #1a1a1a' }}
           onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-black flex items-center justify-between px-5 pt-5 pb-4 divider z-10">
          <div className="flex items-center gap-3">
            <span className="preps-logo">PREPS</span>
            <span className="eyebrow">Nuevo Pedido Manual</span>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 pb-28 space-y-4">
          <div>
            <p className="label mb-2">Plan</p>
            <div className="grid grid-cols-3 gap-0" style={{ border: '1px solid #1a1a1a' }}>
              {TIPOS_PLAN.map((t, i) => (
                <button key={t.value} onClick={() => setForm(f => ({
                  ...f, tipo: t.value, g_pollo: t.g_pollo, g_arroz: t.g_arroz, g_brocoli: t.g_brocoli
                }))}
                  className="py-2.5 font-bebas text-base tracking-wider transition-all"
                  style={{
                    background: form.tipo === t.value ? '#FFD600' : 'transparent',
                    color:      form.tipo === t.value ? '#000'    : '#777',
                    borderLeft: i % 3 !== 0 ? '1px solid #1a1a1a' : 'none',
                    borderTop:  i >= 3     ? '1px solid #1a1a1a' : 'none',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[['g_pollo','POLLO'],['g_arroz','ARROZ'],['g_brocoli','BRÓCOLI']].map(([k, l]) => (
              <div key={k}>
                <p className="label mb-1.5">{l} (g)</p>
                <input type="number" className="input font-bebas text-lg text-center"
                  value={(form as Record<string, unknown>)[k] as number}
                  onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))}
                  min={0} step={50} />
              </div>
            ))}
          </div>

          <div className="relative">
            <p className="label mb-1.5">Cliente</p>
            <input className="input" placeholder="Nombre" value={form.cliente}
              onChange={e => { setForm(f => ({ ...f, cliente: e.target.value })); setShowSug(true); }}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 180)} />
            {showSug && sugerencias.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-black z-20 max-h-56 overflow-y-auto"
                   style={{ border: '1px solid #1a1a1a' }}>
                {sugerencias.map(c => (
                  <button key={c.id} type="button" onMouseDown={() => pickCliente(c)}
                    className="w-full text-left px-3 py-2 hover:bg-[#0f0f0f] transition-colors"
                    style={{ borderTop: '1px solid #0f0f0f' }}>
                    <p className="font-barlow text-xs text-white font-700 uppercase tracking-wider">{c.nombre}</p>
                    <p className="font-barlow text-[10px] text-[#555] tracking-wider">
                      {c.email || '—'} · {c.count_pedidos} pedido{c.count_pedidos !== 1 ? 's' : ''} · {formatCLP(c.total_gastado)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="label mb-1.5">Email (opcional)</p>
              <input className="input" placeholder="cliente@mail.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <p className="label mb-1.5">Teléfono</p>
              <input className="input" placeholder="+569..." value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="label mb-1.5">Cantidad</p>
              <input type="number" className="input font-bebas text-lg" value={form.cantidad} min={1}
                onChange={e => setForm(f => ({ ...f, cantidad: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="label mb-1.5">Notas</p>
              <input className="input" placeholder="Observaciones..." value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 pb-2">
            <div>
              <p className="label">Total</p>
              <p className="font-bebas text-3xl text-[#FFD600]">{formatCLP(total)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-dark">CANCELAR</button>
              <button onClick={submit} disabled={loading} className="btn-brand px-6 disabled:opacity-30">
                {loading ? '...' : 'CREAR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
type FilterTab = 'PENDIENTE_PAGO' | 'ACEPTADO' | 'TODOS';

export default function ComandasPage() {
  const [pedidos, setPedidos]   = useState<Pedido[]>([]);
  const [filter,  setFilter]    = useState<FilterTab>('PENDIENTE_PAGO');
  const [loading, setLoading]   = useState(true);
  const [actionL, setActionL]   = useState(false);
  const [modal,   setModal]     = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const url = filter === 'TODOS' ? '/api/pedidos' : `/api/pedidos?estado=${filter}`;
      setPedidos(await (await fetch(url)).json());
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { setLoading(true); fetch_(); }, [fetch_]);

  // Detectar pedidos nuevos (suena si aumenta la cantidad de pendientes)
  const prevPendientesRef = useRef<number | null>(null);
  useEffect(() => {
    const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE_PAGO').length;
    if (prevPendientesRef.current != null && pendientes > prevPendientesRef.current) {
      playNotificationSound();
    }
    prevPendientesRef.current = pendientes;
  }, [pedidos]);

  useAutoRefresh(fetch_, 20000);

  async function handleAccept(id: number, conIva: boolean) {
    setActionL(true);
    await fetch(`/api/pedidos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'ACEPTAR', con_iva: conIva }),
    });
    await fetch_(); setActionL(false);
  }

  async function handleReject(id: number) {
    setActionL(true);
    await fetch(`/api/pedidos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'RECHAZAR' }),
    });
    await fetch_(); setActionL(false);
  }

  const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE_PAGO').length;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'PENDIENTE_PAGO', label: 'PENDIENTES' },
    { key: 'ACEPTADO',       label: 'ACEPTADOS'  },
    { key: 'TODOS',          label: 'TODOS'      },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 bg-black">
        <div className="px-4 py-4 flex items-center justify-between divider" style={{ borderTop: 'none' }}>
          <div className="flex items-center gap-3">
            <span className="preps-logo">PREPS</span>
            <span className="font-barlow font-800 text-[10px] uppercase tracking-[0.22em] text-white">Comandas</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetch_} className="btn-ghost p-2">
              <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
            </button>
            <button onClick={() => setModal(true)} className="btn-brand px-3 py-2 text-[11px]">
              <Plus size={12} className="mr-1" /> NUEVO
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex divider">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="flex-1 py-3 font-barlow font-800 text-[10px] tracking-[0.22em] uppercase relative transition-colors"
              style={{ color: filter === tab.key ? '#fff' : '#444' }}>
              {tab.label}
              {tab.key === 'PENDIENTE_PAGO' && pendientes > 0 && (
                <span className="ml-1.5 font-bebas px-1.5 text-xs" style={{ background: '#FFD600', color: '#000' }}>
                  {pendientes}
                </span>
              )}
              {filter === tab.key && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px]" style={{ background: '#FFD600' }} />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 pb-28 space-y-3 max-w-lg mx-auto">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse" style={{ border: '1px solid #1a1a1a' }} />
          ))
        ) : pedidos.length === 0 ? (
          <div className="text-center py-24">
            <Clock size={36} className="mx-auto mb-3 text-[#1a1a1a]" />
            <p className="font-bebas text-3xl tracking-widest text-[#222]">SIN PEDIDOS</p>
            <p className="font-barlow text-[10px] uppercase tracking-[0.22em] mt-2 text-[#2a2a2a]">
              Los pedidos de preps.cl aparecen aquí automáticamente
            </p>
          </div>
        ) : (
          pedidos.map(p => (
            <OrderCard key={p.id} pedido={p}
              onAccept={handleAccept} onReject={handleReject}
              onRefresh={fetch_} loading={actionL} />
          ))
        )}
      </div>

      {modal && <NuevoPedidoModal onClose={() => setModal(false)} onCreated={fetch_} />}
      <Navbar pendientes={pendientes} />
    </>
  );
}
