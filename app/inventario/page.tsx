'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { formatCLP } from '@/lib/calculations';
import { Pencil, Check, X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface DespensaItem { ingrediente: string; stock_g: number; updated_at: string }
interface Inversion { id: number; descripcion: string; monto: number; categoria: string; created_at: string }
interface TaperesStock { stock: number; updated_at: string }

const CATEGORIAS = ['EQUIPOS', 'INGREDIENTES', 'EMPAQUES', 'MARKETING', 'OTROS'] as const;

// ── Taperes ───────────────────────────────────────────────────────
function TaperesSection() {
  const [data, setData] = useState<TaperesStock | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    setData(await (await fetch('/api/taperes')).json());
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  async function save() {
    setSaving(true);
    await fetch('/api/taperes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: parseInt(value) || 0 }),
    });
    await fetch_();
    setEditing(false);
    setSaving(false);
  }

  const stock = data?.stock ?? 0;
  const pct = Math.min(100, (stock / 200) * 100);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="label mb-1">Tápers</p>
          <p className="font-barlow text-[10px] text-[#555] uppercase tracking-wider">Se descuentan al aceptar pedidos</p>
        </div>
        {!editing ? (
          <button onClick={() => { setValue(String(stock)); setEditing(true); }} className="btn-ghost px-3 py-1.5">
            <Pencil size={10} className="mr-1" /> AJUSTAR
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input type="number" className="input w-20 text-center font-bebas text-xl py-1.5" value={value}
              onChange={e => setValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
            <button onClick={save} disabled={saving} className="p-2 bg-[#2EE5C2]">
              <Check size={13} className="text-black" />
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost p-2">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <p className="font-bebas leading-none text-[64px] text-white">{stock}</p>
        <p className="font-bebas text-xl text-[#555] tracking-widest">UN.</p>
      </div>

      <div className="h-[2px] mb-1" style={{ background: '#1a1a1a' }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: '#2EE5C2' }} />
      </div>
      <p className="font-barlow text-[10px] text-[#333] uppercase tracking-wider">Referencia 200 unidades</p>
    </section>
  );
}

// ── Despensa ──────────────────────────────────────────────────────
function DespensaSection() {
  const [items, setItems] = useState<DespensaItem[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setItems(await (await fetch('/api/despensa')).json());
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  async function save(ing: string) {
    const val = parseFloat(editing[ing]) * 1000;
    if (isNaN(val)) return;
    setSaving(ing);
    await fetch('/api/despensa', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingrediente: ing, stock_g: val }),
    });
    await fetch_();
    setEditing(e => { const n = { ...e }; delete n[ing]; return n; });
    setSaving(null);
  }

  return (
    <section>
      <p className="label mb-3">Despensa</p>
      <div className="space-y-0" style={{ border: '1px solid #1a1a1a' }}>
        {items.map((item, idx) => {
          const kg = item.stock_g / 1000;
          const pct = Math.min(100, (item.stock_g / 50000) * 100);
          const isEditing = editing[item.ingrediente] !== undefined;

          return (
            <div key={item.ingrediente} className="p-4"
                 style={{ borderTop: idx > 0 ? '1px solid #1a1a1a' : 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-barlow font-800 text-[11px] uppercase tracking-[0.22em] text-white">
                  {item.ingrediente}
                </span>
                {!isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="font-bebas text-xl text-white">{kg.toFixed(2)} KG</span>
                    <button onClick={() => setEditing(e => ({ ...e, [item.ingrediente]: kg.toFixed(3) }))}
                            className="btn-ghost p-1.5">
                      <Pencil size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input type="number" className="input w-20 text-center font-bebas text-base py-1.5"
                      value={editing[item.ingrediente]}
                      onChange={e => setEditing(ed => ({ ...ed, [item.ingrediente]: e.target.value }))}
                      step="0.1" autoFocus onKeyDown={e => e.key === 'Enter' && save(item.ingrediente)} />
                    <span className="font-barlow text-xs text-[#555]">kg</span>
                    <button onClick={() => save(item.ingrediente)} disabled={saving === item.ingrediente}
                            className="p-1.5 bg-[#2EE5C2]">
                      <Check size={12} className="text-black" />
                    </button>
                    <button onClick={() => setEditing(e => { const n = { ...e }; delete n[item.ingrediente]; return n; })}
                            className="btn-ghost p-1.5">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div className="h-[2px] mb-1" style={{ background: '#1a1a1a' }}>
                <div className="h-full transition-all" style={{ width: `${pct}%`, background: '#2EE5C2' }} />
              </div>
              <p className="font-barlow text-[10px] text-[#333] tracking-wider">{item.stock_g.toLocaleString()} g</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Inversiones ───────────────────────────────────────────────────
function InversionesSection() {
  const [items, setItems] = useState<Inversion[]>([]);
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descripcion: '', monto: '', categoria: 'OTROS' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ descripcion: '', monto: '', categoria: 'OTROS' });

  const fetch_ = useCallback(async () => {
    setItems(await (await fetch('/api/inversiones')).json());
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  async function saveEdit() {
    if (editing == null) return;
    await fetch('/api/inversiones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing,
        descripcion: editForm.descripcion,
        monto: parseInt(editForm.monto) || 0,
        categoria: editForm.categoria,
      }),
    });
    setEditing(null);
    await fetch_();
  }

  function startEdit(inv: Inversion) {
    setEditing(inv.id);
    setEditForm({ descripcion: inv.descripcion, monto: String(inv.monto), categoria: inv.categoria });
  }

  const total = items.reduce((s, i) => s + i.monto, 0);

  async function add() {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    await fetch('/api/inversiones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monto: parseInt(form.monto) }),
    });
    await fetch_();
    setForm({ descripcion: '', monto: '', categoria: 'OTROS' });
    setShowForm(false);
    setSaving(false);
  }

  async function remove(id: number) {
    setDeleting(id);
    await fetch('/api/inversiones', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetch_();
    setDeleting(null);
  }

  return (
    <section>
      <button onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <p className="label">Inversión Inicial</p>
          <span className="font-bebas text-2xl text-white">{formatCLP(total)}</span>
          <span className="eyebrow">{items.length} ítems</span>
        </div>
        {open ? <ChevronDown size={14} className="text-[#555]" /> : <ChevronRight size={14} className="text-[#555]" />}
      </button>

      {open && (
        <div style={{ border: '1px solid #1a1a1a' }}>
          {items.length === 0 ? (
            <p className="font-barlow text-[10px] text-[#444] text-center uppercase tracking-[0.22em] py-8">
              SIN INVERSIONES REGISTRADAS
            </p>
          ) : (
            items.map((inv, i) => (
              <div key={inv.id} style={{ borderTop: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
                {editing === inv.id ? (
                  <div className="p-4 space-y-3 animate-fade-in">
                    <input className="input" placeholder="Descripción"
                      value={editForm.descripcion}
                      onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} autoFocus />
                    <input type="number" className="input font-bebas text-xl" placeholder="Monto ($)"
                      value={editForm.monto}
                      onChange={e => setEditForm(f => ({ ...f, monto: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-0" style={{ border: '1px solid #1a1a1a' }}>
                      {CATEGORIAS.map((cat, j) => (
                        <button key={cat} onClick={() => setEditForm(f => ({ ...f, categoria: cat }))}
                          className="py-2 font-barlow font-800 text-[10px] tracking-[0.22em] uppercase transition-all"
                          style={{
                            background: editForm.categoria === cat ? '#2EE5C2' : 'transparent',
                            color:      editForm.categoria === cat ? '#000'    : '#555',
                            borderLeft: j % 3 !== 0 ? '1px solid #1a1a1a' : 'none',
                            borderTop:  j >= 3     ? '1px solid #1a1a1a' : 'none',
                          }}>
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)} className="btn-dark flex-1 text-xs py-2.5">CANCELAR</button>
                      <button onClick={saveEdit} disabled={!editForm.descripcion || !editForm.monto}
                              className="btn-brand flex-1 py-2.5 disabled:opacity-30">
                        GUARDAR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-barlow font-700 text-sm text-white truncate">{inv.descripcion}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-barlow text-[9px] uppercase tracking-[0.22em] text-[#666]">
                          {inv.categoria}
                        </span>
                        <span className="font-barlow text-[9px] text-[#333]">{inv.created_at.split(',')[0]}</span>
                      </div>
                    </div>
                    <span className="font-bebas text-lg text-white flex-shrink-0">
                      {formatCLP(inv.monto)}
                    </span>
                    <button onClick={() => startEdit(inv)}
                            className="p-1.5 text-[#333] hover:text-white transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => remove(inv.id)} disabled={deleting === inv.id}
                            className="p-1.5 text-[#333] hover:text-white transition-colors disabled:opacity-30">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {showForm ? (
            <div className="p-4 space-y-3 animate-fade-in" style={{ borderTop: '1px solid #1a1a1a' }}>
              <input className="input" placeholder="Descripción (ej: Ollas, tápers iniciales...)"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} autoFocus />
              <input type="number" className="input font-bebas text-xl" placeholder="Monto ($)"
                value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
              <div className="grid grid-cols-3 gap-0" style={{ border: '1px solid #1a1a1a' }}>
                {CATEGORIAS.map((cat, i) => (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, categoria: cat }))}
                    className="py-2 font-barlow font-800 text-[10px] tracking-[0.22em] uppercase transition-all"
                    style={{
                      background: form.categoria === cat ? '#2EE5C2' : 'transparent',
                      color:      form.categoria === cat ? '#000'    : '#555',
                      borderLeft: i % 3 !== 0 ? '1px solid #1a1a1a' : 'none',
                      borderTop:  i >= 3     ? '1px solid #1a1a1a' : 'none',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="btn-dark flex-1 text-xs py-2.5">CANCELAR</button>
                <button onClick={add} disabled={saving || !form.descripcion || !form.monto}
                        className="btn-brand flex-1 py-2.5 disabled:opacity-30">
                  {saving ? '...' : 'AGREGAR'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 font-barlow font-800 text-[10px] tracking-[0.22em] uppercase transition-all text-[#555] hover:text-white"
              style={{ borderTop: '1px solid #1a1a1a' }}>
              <Plus size={12} /> AGREGAR INVERSIÓN
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function InventarioPage() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-black px-4 py-4 divider" style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-3">
          <img src="/logo-preps.png" alt="PREPS" className="h-7 w-auto" />
          <div>
            <p className="font-barlow font-800 text-[10px] uppercase tracking-[0.22em] text-white">Stock</p>
            <p className="font-barlow text-[9px] uppercase tracking-wider text-[#555]">
              Tápers · Despensa · Inversión
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6 pb-32 max-w-lg mx-auto space-y-8">
        <TaperesSection />
        <DespensaSection />
        <InversionesSection />
        <p className="text-center font-barlow text-[9px] tracking-[0.28em] text-[#222] uppercase pt-6 pb-2">
          DISEÑADO PARA TU RENDIMIENTO
        </p>
      </div>

      <Navbar />
    </>
  );
}
