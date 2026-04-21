'use client';

import { useEffect, useState } from 'react';
import { formatCLP, calcularCostoPlato } from '@/lib/calculations';

// ── Types ─────────────────────────────────────────────────────
interface Cliente {
  id: number; nombre: string; email: string; telefono: string;
  count_pedidos: number; total_gastado: number;
}

// ── Menu items ────────────────────────────────────────────────
const MENU_ITEMS: { tipo: string; label: string; precio: number; sub?: string }[] = [
  { tipo: 'low_carb',  label: 'LOW CARB',  precio: 4990,   sub: '200p · 150a · 100b' },
  { tipo: 'high_carb', label: 'HIGH CARB', precio: 5690,   sub: '200p · 300a · 200b' },
  { tipo: 'pack_5',    label: 'PACK X5',   precio: 24900,  sub: '5 platos' },
  { tipo: 'pack_15',   label: 'PACK X15',  precio: 72900,  sub: '15 platos' },
  { tipo: 'pack_28',   label: 'PACK X28',  precio: 129000, sub: '28 platos' },
];

// ── Cliente autocomplete ──────────────────────────────────────
function ClienteFields({
  cliente, email, telefono,
  setCliente, setEmail, setTelefono,
}: {
  cliente: string; email: string; telefono: string;
  setCliente: (v: string) => void;
  setEmail:   (v: string) => void;
  setTelefono:(v: string) => void;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(setClientes).catch(() => {});
  }, []);

  const q = cliente.trim().toLowerCase();
  const sug = q.length >= 1
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  function pick(c: Cliente) {
    setCliente(c.nombre);
    setEmail(c.email ?? '');
    setTelefono(c.telefono ?? '');
    setShow(false);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <p className="label mb-1.5">Cliente</p>
        <input className="input" placeholder="Nombre (opcional)"
          value={cliente}
          onChange={e => { setCliente(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 180)} />
        {show && sug.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-black z-20 max-h-56 overflow-y-auto"
               style={{ border: '1px solid #1a1a1a' }}>
            {sug.map(c => (
              <button key={c.id} type="button" onMouseDown={() => pick(c)}
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
          <input className="input" placeholder="cliente@mail.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <p className="label mb-1.5">Teléfono</p>
          <input className="input" placeholder="+569..."
            value={telefono} onChange={e => setTelefono(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ── Menu tab ──────────────────────────────────────────────────
function MenuVentaTab({ conIva, cliente, email, telefono, onDone, onError }: {
  conIva: boolean;
  cliente: string; email: string; telefono: string;
  onDone: () => void; onError: (msg: string) => void;
}) {
  const [cant, setCant] = useState<Record<string, number>>({});
  const [variante, setVariante] = useState<Record<string, 'low_carb' | 'high_carb'>>({});
  const [labsOn, setLabsOn] = useState(false);
  const [labsPollo, setLabsPollo]     = useState('0');
  const [labsArroz, setLabsArroz]     = useState('0');
  const [labsBrocoli, setLabsBrocoli] = useState('0');
  const [labsCant, setLabsCant] = useState(1);
  const [saving, setSaving] = useState(false);

  function inc(tipo: string, d: number) {
    setCant(c => ({ ...c, [tipo]: Math.max(0, (c[tipo] ?? 0) + d) }));
  }

  const lp = parseInt(labsPollo)   || 0;
  const la = parseInt(labsArroz)   || 0;
  const lb = parseInt(labsBrocoli) || 0;
  const labsPrecio = Math.round(3 + lp * 22.47 + la * 2.08 + lb * 5.69);

  let total = 0;
  for (const it of MENU_ITEMS) total += (cant[it.tipo] ?? 0) * it.precio;
  if (labsOn) total += labsPrecio * labsCant;

  async function save() {
    const items: Array<{
      tipo: string; cantidad: number; variante?: string;
      g_pollo?: number; g_arroz?: number; g_brocoli?: number;
    }> = [];

    for (const it of MENU_ITEMS) {
      const q = cant[it.tipo] ?? 0;
      if (q > 0) {
        const entry: { tipo: string; cantidad: number; variante?: string } = { tipo: it.tipo, cantidad: q };
        if (it.tipo.startsWith('pack_')) entry.variante = variante[it.tipo] ?? 'low_carb';
        items.push(entry);
      }
    }
    if (labsOn && labsCant > 0 && (lp + la + lb) > 0) {
      items.push({ tipo: 'labs', cantidad: labsCant, g_pollo: lp, g_arroz: la, g_brocoli: lb });
    }
    if (items.length === 0) { onError('Selecciona al menos 1 ítem'); return; }

    setSaving(true);
    // Descripción con cliente si existe
    const descripcion = cliente
      ? `${cliente}${email ? ' (' + email + ')' : ''}`
      : '';
    const res = await fetch('/api/ventas/menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, con_iva: conIva, descripcion }),
    });
    // Guardar cliente en historial
    if (cliente.trim()) {
      fetch('/api/clientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: cliente, email, telefono, montoPedido: total }),
      }).catch(() => {});
    }
    setSaving(false);
    if (res.ok) onDone();
    else onError('Error al guardar');
  }

  return (
    <div className="space-y-3">
      {MENU_ITEMS.map(it => {
        const q = cant[it.tipo] ?? 0;
        const isPack = it.tipo.startsWith('pack_');
        const v = variante[it.tipo] ?? 'low_carb';
        return (
          <div key={it.tipo} className="p-3" style={{ border: '1px solid #1a1a1a' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-barlow font-800 text-[11px] uppercase tracking-[0.22em] text-white">{it.label}</p>
                <p className="font-barlow text-[9px] text-[#555] mt-0.5 uppercase tracking-wider">
                  {formatCLP(it.precio)}{it.sub ? ` · ${it.sub}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => inc(it.tipo, -1)} disabled={q === 0}
                        className="w-7 h-7 font-bebas text-lg disabled:opacity-20"
                        style={{ border: '1px solid #2a2a2a', color: '#fff' }}>−</button>
                <span className="font-bebas text-xl text-white w-6 text-center">{q}</span>
                <button onClick={() => inc(it.tipo, +1)}
                        className="w-7 h-7 font-bebas text-lg"
                        style={{ border: '1px solid #FFD600', color: '#FFD600' }}>+</button>
              </div>
            </div>
            {isPack && q > 0 && (
              <div className="grid grid-cols-2 gap-0 mt-2" style={{ border: '1px solid #1a1a1a' }}>
                {(['low_carb','high_carb'] as const).map((k, i) => (
                  <button key={k} onClick={() => setVariante(V => ({ ...V, [it.tipo]: k }))}
                    className="py-1.5 font-barlow font-800 text-[9px] tracking-[0.22em] uppercase transition-all"
                    style={{
                      background: v === k ? '#FFD600' : 'transparent',
                      color:      v === k ? '#000'    : '#555',
                      borderLeft: i === 1 ? '1px solid #1a1a1a' : 'none',
                    }}>
                    {k === 'low_carb' ? 'LOW' : 'HIGH'}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Labs */}
      <div className="p-3" style={{ border: '1px solid #1a1a1a' }}>
        <button onClick={() => setLabsOn(o => !o)} className="w-full flex items-center justify-between">
          <p className="font-barlow font-800 text-[11px] uppercase tracking-[0.22em] text-white">LABS (PERSONALIZADO)</p>
          <span className="font-bebas text-sm text-[#FFD600]">{labsOn ? '−' : '+'}</span>
        </button>
        {labsOn && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="label mb-1 text-[9px]">Pollo g</p>
                <input type="number" className="input py-2" value={labsPollo}
                  onChange={e => setLabsPollo(e.target.value)} />
              </div>
              <div>
                <p className="label mb-1 text-[9px]">Arroz g</p>
                <input type="number" className="input py-2" value={labsArroz}
                  onChange={e => setLabsArroz(e.target.value)} />
              </div>
              <div>
                <p className="label mb-1 text-[9px]">Brócoli g</p>
                <input type="number" className="input py-2" value={labsBrocoli}
                  onChange={e => setLabsBrocoli(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="font-bebas text-lg text-white">{formatCLP(labsPrecio)} <span className="text-[10px] text-[#555] font-barlow tracking-wider">C/U</span></p>
              <div className="flex items-center gap-2">
                <button onClick={() => setLabsCant(c => Math.max(1, c - 1))}
                        className="w-7 h-7 font-bebas text-lg"
                        style={{ border: '1px solid #2a2a2a', color: '#fff' }}>−</button>
                <span className="font-bebas text-xl text-white w-6 text-center">{labsCant}</span>
                <button onClick={() => setLabsCant(c => c + 1)}
                        className="w-7 h-7 font-bebas text-lg"
                        style={{ border: '1px solid #FFD600', color: '#FFD600' }}>+</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="p-3 flex items-center justify-between animate-fade-in" style={{ border: '1px solid #FFD600' }}>
          <span className="label">TOTAL</span>
          <span className="font-bebas text-2xl text-[#FFD600]">{formatCLP(total)}</span>
        </div>
      )}

      <button onClick={save} disabled={saving || total === 0}
              className="btn-brand w-full py-3 disabled:opacity-30">
        {saving ? 'GUARDANDO' : 'REGISTRAR VENTA'}
      </button>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────
export default function VentaModal({
  onClose, onSaved, title = 'Registrar Venta',
}: {
  onClose: () => void; onSaved: () => void; title?: string;
}) {
  const [mode, setMode] = useState<'menu' | 'manual'>('menu');
  const [monto, setMonto] = useState('');
  const [conIva, setConIva] = useState(true);
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Manual: insumos para descuento automático
  const [mPollo, setMPollo]     = useState('0');
  const [mArroz, setMArroz]     = useState('0');
  const [mBrocoli, setMBrocoli] = useState('0');
  const [mTapers, setMTapers]   = useState('1');

  // Cliente
  const [cliente, setCliente]   = useState('');
  const [email, setEmail]       = useState('');
  const [telefono, setTelefono] = useState('');

  const m = parseInt(monto.replace(/\D/g, '')) || 0;
  const gP = parseInt(mPollo)   || 0;
  const gA = parseInt(mArroz)   || 0;
  const gB = parseInt(mBrocoli) || 0;
  const tap = parseInt(mTapers) || 0;
  const c = Math.round(calcularCostoPlato(gP, gA, gB));
  const iva = conIva ? Math.round(m - m / 1.19) : 0;
  const neto = conIva ? Math.round(m / 1.19) : m;
  const gan = neto - c;

  async function saveManual() {
    if (m <= 0) { setError('Ingresa un monto válido'); return; }
    setSaving(true);
    const desc = descripcion || (cliente ? `${cliente}${email ? ' (' + email + ')' : ''}` : '');
    const res = await fetch('/api/ventas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto: m, con_iva: conIva, descripcion: desc,
        insumos: { g_pollo: gP, g_arroz: gA, g_brocoli: gB },
        tapers: tap,
      }),
    });
    if (cliente.trim()) {
      fetch('/api/clientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: cliente, email, telefono, montoPedido: m }),
      }).catch(() => {});
    }
    if (res.ok) { onSaved(); onClose(); }
    else setError('Error al guardar');
    setSaving(false);
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
            <span className="preps-logo">PREPS</span>
            <span className="eyebrow">{title}</span>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 pb-28 space-y-5">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-0" style={{ border: '1px solid #1a1a1a' }}>
            {(['menu', 'manual'] as const).map((k, i) => (
              <button key={k} onClick={() => setMode(k)}
                className="py-2.5 font-barlow font-800 text-[10px] tracking-[0.22em] uppercase transition-all"
                style={{
                  background: mode === k ? '#fff' : 'transparent',
                  color:      mode === k ? '#000' : '#555',
                  borderLeft: i === 1 ? '1px solid #1a1a1a' : 'none',
                }}>
                {k === 'menu' ? 'MENÚ' : 'MANUAL'}
              </button>
            ))}
          </div>

          {/* IVA toggle */}
          <div className="grid grid-cols-2 gap-0" style={{ border: '1px solid #1a1a1a' }}>
            {[
              { v: true,  label: 'CON BOLETA', sub: 'Incluye IVA' },
              { v: false, label: 'SIN BOLETA', sub: 'Es neto' },
            ].map(({ v, label, sub }, i) => (
              <button key={String(v)} onClick={() => setConIva(v)}
                className="flex flex-col items-start p-3 transition-all"
                style={{
                  background: conIva === v ? '#FFD600' : 'transparent',
                  color:      conIva === v ? '#000'    : '#fff',
                  borderLeft: i === 1 ? '1px solid #1a1a1a' : 'none',
                }}>
                <span className="font-barlow font-800 text-[10px] tracking-[0.22em]">{label}</span>
                <span className="text-[10px] mt-0.5 opacity-60">{sub}</span>
              </button>
            ))}
          </div>

          {/* Cliente */}
          <ClienteFields
            cliente={cliente} email={email} telefono={telefono}
            setCliente={setCliente} setEmail={setEmail} setTelefono={setTelefono}
          />

          {mode === 'menu' ? (
            <>
              <MenuVentaTab
                conIva={conIva}
                cliente={cliente} email={email} telefono={telefono}
                onDone={() => { onSaved(); onClose(); }}
                onError={setError}
              />
              {error && <p className="text-xs text-white font-barlow">{error}</p>}
            </>
          ) : (
            <>
              <div>
                <p className="label mb-2">Monto {conIva ? '(con IVA)' : '(neto)'}</p>
                <input type="number" className="input font-bebas text-3xl"
                  style={{ letterSpacing: '0.05em' }} placeholder="0"
                  value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
              </div>

              <div>
                <p className="label mb-2">Insumos (gramos cocidos)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="label mb-1 text-[9px]">Pollo g</p>
                    <input type="number" className="input py-2" value={mPollo}
                      onChange={e => setMPollo(e.target.value)} min={0} step={50} />
                  </div>
                  <div>
                    <p className="label mb-1 text-[9px]">Arroz g</p>
                    <input type="number" className="input py-2" value={mArroz}
                      onChange={e => setMArroz(e.target.value)} min={0} step={50} />
                  </div>
                  <div>
                    <p className="label mb-1 text-[9px]">Brócoli g</p>
                    <input type="number" className="input py-2" value={mBrocoli}
                      onChange={e => setMBrocoli(e.target.value)} min={0} step={50} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="label mb-2">Tápers</p>
                  <input type="number" className="input" value={mTapers}
                    onChange={e => setMTapers(e.target.value)} min={0} />
                </div>
                <div>
                  <p className="label mb-2">Descripción</p>
                  <input className="input" placeholder="Ej: Entrega..." value={descripcion}
                    onChange={e => setDescripcion(e.target.value)} />
                </div>
              </div>

              {m > 0 && (
                <div className="grid grid-cols-4 gap-0 animate-fade-in" style={{ border: '1px solid #1a1a1a' }}>
                  {[
                    { label: 'NETO',     value: formatCLP(neto) },
                    { label: 'IVA',      value: formatCLP(iva)  },
                    { label: 'COSTO',    value: formatCLP(c)    },
                    { label: 'GANANCIA', value: formatCLP(gan)  },
                  ].map(({ label, value }, i) => (
                    <div key={label} className="p-3 text-center"
                         style={{ borderLeft: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
                      <p className="label mb-1">{label}</p>
                      <p className="font-bebas text-base text-white">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-white font-barlow">{error}</p>}

              <div className="flex gap-2 pb-2">
                <button onClick={onClose} className="btn-dark flex-1">CANCELAR</button>
                <button onClick={saveManual} disabled={saving || m <= 0}
                  className="btn-brand flex-1 disabled:opacity-30">
                  {saving ? 'GUARDANDO' : 'REGISTRAR'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
