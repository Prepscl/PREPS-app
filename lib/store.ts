import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

const DB_FILE = path.join(process.cwd(), 'preps-data.json');
const REDIS_KEY = 'preps:store';

// ── Types ────────────────────────────────────────────────────────

export interface Pedido {
  id: number;
  numero: string;
  tipo: string;
  cliente: string;
  telefono: string;
  email?: string;
  items: string;
  total: number;
  costo: number;
  estado: 'PENDIENTE_PAGO' | 'ACEPTADO' | 'RECHAZADO' | 'CANCELADO';
  origen: string;
  notas: string;
  created_at: string;
  accepted_at?: string;
}

export interface Venta {
  id: number;
  pedido_id: number | null;
  monto: number;
  costo: number;
  iva: number;
  ganancia: number;
  con_iva: boolean;
  tipo_venta: 'PEDIDO' | 'MANUAL';
  descripcion: string;
  created_at: string;
}

export interface DespensaItem {
  ingrediente: string;
  stock_g: number;
  updated_at: string;
}

export interface Inversion {
  id: number;
  descripcion: string;
  monto: number;
  categoria: 'EQUIPOS' | 'INGREDIENTES' | 'EMPAQUES' | 'MARKETING' | 'OTROS';
  created_at: string;
}

export interface TaperesStock {
  stock: number;
  updated_at: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  count_pedidos: number;
  total_gastado: number;
  last_pedido_at: string;
  created_at: string;
}

interface Store {
  pedidos: Pedido[];
  ventas: Venta[];
  despensa: DespensaItem[];
  inversiones: Inversion[];
  taperes: TaperesStock;
  clientes: Cliente[];
  _seq: number;
}

// ── Helpers ──────────────────────────────────────────────────────

export function nowStr(): string {
  return new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const TAPERES_POR_TIPO: Record<string, number> = {
  low_carb: 1,
  high_carb: 1,
  pack_5: 5,
  pack_15: 15,
  pack_28: 28,
};

export function calcularTaperesDesdeItems(itemsStr: string): number {
  try {
    const items = JSON.parse(itemsStr) as Array<{
      tipo?: string;
      cantidad?: number;
    }>;
    return items.reduce((sum, item) => {
      const por_tipo = TAPERES_POR_TIPO[item.tipo ?? 'low_carb'] ?? 1;
      return sum + por_tipo * (item.cantidad ?? 1);
    }, 0);
  } catch {
    return 1;
  }
}

// ── Persistence ──────────────────────────────────────────────────

function defaultStore(): Store {
  const ts = nowStr();
  return {
    pedidos: [],
    ventas: [],
    inversiones: [],
    clientes: [],
    taperes: { stock: 100, updated_at: ts },
    despensa: [
      { ingrediente: 'pollo', stock_g: 50000, updated_at: ts },
      { ingrediente: 'arroz', stock_g: 50000, updated_at: ts },
      { ingrediente: 'brocoli', stock_g: 50000, updated_at: ts },
    ],
    _seq: 1,
  };
}

function normalizeStore(parsed: Partial<Store>): Store {
  const def = defaultStore();
  return {
    pedidos: parsed.pedidos ?? [],
    ventas: (parsed.ventas ?? []).map(v => {
      const base = v as Partial<Venta>;
      return {
        ...base,
        tipo_venta: base.tipo_venta ?? ('PEDIDO' as const),
        descripcion: base.descripcion ?? '',
        con_iva: base.con_iva ?? true,
      } as Venta;
    }),
    despensa: parsed.despensa ?? def.despensa,
    inversiones: parsed.inversiones ?? [],
    clientes: parsed.clientes ?? [],
    taperes: parsed.taperes ?? def.taperes,
    _seq: parsed._seq ?? 1,
  };
}

let _redis: Redis | null = null;
function useRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

async function read(): Promise<Store> {
  if (useRedis()) {
    try {
      const data = await getRedis().get<Partial<Store>>(REDIS_KEY);
      if (!data) {
        const initial = defaultStore();
        await getRedis().set(REDIS_KEY, initial);
        return initial;
      }
      return normalizeStore(data);
    } catch {
      return defaultStore();
    }
  }

  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = defaultStore();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Store>;
    return normalizeStore(parsed);
  } catch {
    return defaultStore();
  }
}

async function write(store: Store): Promise<void> {
  if (useRedis()) {
    await getRedis().set(REDIS_KEY, store);
    return;
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
}

// ── Pedidos ──────────────────────────────────────────────────────

export async function getPedidos(estado?: string): Promise<Pedido[]> {
  const store = await read();
  const list = estado
    ? store.pedidos.filter(p => p.estado === estado)
    : store.pedidos;
  return [...list].sort((a, b) => b.id - a.id).slice(0, 200);
}

export async function getPedidoById(id: number): Promise<Pedido | undefined> {
  return (await read()).pedidos.find(p => p.id === id);
}

export async function createPedido(data: Omit<Pedido, 'id' | 'created_at'>): Promise<Pedido> {
  const store = await read();
  const pedido: Pedido = { ...data, id: store._seq++, created_at: nowStr() };
  store.pedidos.push(pedido);
  await write(store);
  return pedido;
}

export async function updatePedidoEstado(
  id: number,
  estado: Pedido['estado'],
  acceptedAt?: string
): Promise<Pedido | null> {
  const store = await read();
  const idx = store.pedidos.findIndex(p => p.id === id);
  if (idx === -1) return null;
  store.pedidos[idx].estado = estado;
  if (acceptedAt) store.pedidos[idx].accepted_at = acceptedAt;
  await write(store);
  return store.pedidos[idx];
}

// ── Ventas ───────────────────────────────────────────────────────

export async function getVentas(): Promise<Venta[]> {
  return (await read()).ventas;
}

export async function createVentaManual(data: {
  monto: number;
  costo: number;
  con_iva: boolean;
  descripcion: string;
}): Promise<Venta> {
  const store = await read();
  const iva = data.con_iva ? Math.round(data.monto - data.monto / 1.19) : 0;
  const neto = data.con_iva ? data.monto / 1.19 : data.monto;
  const ganancia = Math.round(neto - data.costo);

  const venta: Venta = {
    id: store._seq++,
    pedido_id: null,
    monto: Math.round(data.monto),
    costo: Math.round(data.costo),
    iva,
    ganancia,
    con_iva: data.con_iva,
    tipo_venta: 'MANUAL',
    descripcion: data.descripcion,
    created_at: nowStr(),
  };
  store.ventas.push(venta);
  await write(store);
  return venta;
}

export async function createVentaMenu(data: {
  monto: number;
  costo: number;
  con_iva: boolean;
  descripcion: string;
  stockDelta: { pollo: number; arroz: number; brocoli: number }; // gramos crudos a descontar
  taperesDelta: number;
}): Promise<Venta> {
  const store = await read();
  const ts = nowStr();

  for (const ing of ['pollo','arroz','brocoli'] as const) {
    const item = store.despensa.find(d => d.ingrediente === ing);
    const delta = data.stockDelta[ing];
    if (item && delta > 0) {
      item.stock_g = Math.max(0, item.stock_g - Math.round(delta));
      item.updated_at = ts;
    }
  }
  if (data.taperesDelta > 0) {
    store.taperes.stock = Math.max(0, store.taperes.stock - data.taperesDelta);
    store.taperes.updated_at = ts;
  }

  const iva = data.con_iva ? Math.round(data.monto - data.monto / 1.19) : 0;
  const neto = data.con_iva ? data.monto / 1.19 : data.monto;
  const venta: Venta = {
    id: store._seq++,
    pedido_id: null,
    monto: Math.round(data.monto),
    costo: Math.round(data.costo),
    iva,
    ganancia: Math.round(neto - data.costo),
    con_iva: data.con_iva,
    tipo_venta: 'MANUAL',
    descripcion: data.descripcion,
    created_at: ts,
  };
  store.ventas.push(venta);
  await write(store);
  return venta;
}

export async function deleteVenta(id: number): Promise<boolean> {
  const store = await read();
  const idx = store.ventas.findIndex(v => v.id === id);
  if (idx === -1) return false;
  store.ventas.splice(idx, 1);
  await write(store);
  return true;
}

export async function updateVenta(id: number, data: {
  monto?: number; costo?: number; con_iva?: boolean; descripcion?: string;
}): Promise<Venta | null> {
  const store = await read();
  const idx = store.ventas.findIndex(v => v.id === id);
  if (idx === -1) return null;
  const v = store.ventas[idx];
  const monto   = data.monto   !== undefined ? Math.round(data.monto)   : v.monto;
  const costo   = data.costo   !== undefined ? Math.round(data.costo)   : v.costo;
  const con_iva = data.con_iva !== undefined ? data.con_iva             : v.con_iva;
  const iva  = con_iva ? Math.round(monto - monto / 1.19) : 0;
  const neto = con_iva ? monto / 1.19 : monto;
  store.ventas[idx] = {
    ...v,
    monto, costo, con_iva, iva,
    ganancia: Math.round(neto - costo),
    descripcion: data.descripcion !== undefined ? data.descripcion : v.descripcion,
  };
  await write(store);
  return store.ventas[idx];
}

// ── Despensa ─────────────────────────────────────────────────────

export async function getDespensa(): Promise<DespensaItem[]> {
  return (await read()).despensa;
}

export async function setStock(ingrediente: string, stock_g: number): Promise<DespensaItem | null> {
  const store = await read();
  const item = store.despensa.find(d => d.ingrediente === ingrediente);
  if (!item) return null;
  item.stock_g = Math.max(0, Math.round(stock_g));
  item.updated_at = nowStr();
  await write(store);
  return item;
}

// ── Taperes ──────────────────────────────────────────────────────

export async function getTaperes(): Promise<TaperesStock> {
  return (await read()).taperes;
}

export async function setTaperes(stock: number): Promise<TaperesStock> {
  const store = await read();
  store.taperes = { stock: Math.max(0, stock), updated_at: nowStr() };
  await write(store);
  return store.taperes;
}

// ── Inversiones ──────────────────────────────────────────────────

export async function getInversiones(): Promise<Inversion[]> {
  return [...(await read()).inversiones].sort((a, b) => b.id - a.id);
}

export async function createInversion(data: Omit<Inversion, 'id' | 'created_at'>): Promise<Inversion> {
  const store = await read();
  const inv: Inversion = { ...data, id: store._seq++, created_at: nowStr() };
  store.inversiones.push(inv);
  await write(store);
  return inv;
}

export async function deleteInversion(id: number): Promise<boolean> {
  const store = await read();
  const idx = store.inversiones.findIndex(i => i.id === id);
  if (idx === -1) return false;
  store.inversiones.splice(idx, 1);
  await write(store);
  return true;
}

export async function updateInversion(id: number, data: {
  descripcion?: string; monto?: number; categoria?: Inversion['categoria'];
}): Promise<Inversion | null> {
  const store = await read();
  const idx = store.inversiones.findIndex(i => i.id === id);
  if (idx === -1) return null;
  const cur = store.inversiones[idx];
  store.inversiones[idx] = {
    ...cur,
    ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
    ...(data.monto       !== undefined && { monto: Math.round(data.monto) }),
    ...(data.categoria   !== undefined && { categoria: data.categoria }),
  };
  await write(store);
  return store.inversiones[idx];
}

// ── Reset ────────────────────────────────────────────────────────

export async function resetData(opcion: 'todo' | 'solo_ventas'): Promise<void> {
  const store = await read();
  store.ventas  = [];
  store.pedidos = [];
  if (opcion === 'todo') {
    store.inversiones = [];
    store.taperes = { stock: 100, updated_at: nowStr() };
    store.despensa = [
      { ingrediente: 'pollo',   stock_g: 50000, updated_at: nowStr() },
      { ingrediente: 'arroz',   stock_g: 50000, updated_at: nowStr() },
      { ingrediente: 'brocoli', stock_g: 50000, updated_at: nowStr() },
    ];
  }
  store._seq = 1;
  await write(store);
}

// ── Update pedido (edición manual) ───────────────────────────────

export async function updatePedido(
  id: number,
  data: Partial<Pick<Pedido, 'total' | 'costo' | 'cliente' | 'telefono' | 'notas' | 'items' | 'tipo'>>
): Promise<Pedido | null> {
  const store = await read();
  const idx = store.pedidos.findIndex(p => p.id === id);
  if (idx === -1) return null;
  Object.assign(store.pedidos[idx], data);
  await write(store);
  return store.pedidos[idx];
}

export async function deletePedido(id: number): Promise<boolean> {
  const store = await read();
  const idx = store.pedidos.findIndex(p => p.id === id);
  if (idx === -1) return false;
  store.pedidos.splice(idx, 1);
  await write(store);
  return true;
}

// ── Transaction: aceptar pedido ──────────────────────────────────

export async function aceptarPedido(
  id: number,
  ventaData: {
    monto: number;
    costo: number;
    iva: number;
    ganancia: number;
    con_iva: boolean;
  },
  stockDeltas: { pollo: number; arroz: number; brocoli: number },
  taperesDelta: number
): Promise<{ pedido: Pedido; venta: Venta }> {
  const store = await read();
  const idx = store.pedidos.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Pedido not found');

  const ts = nowStr();
  store.pedidos[idx].estado = 'ACEPTADO';
  store.pedidos[idx].accepted_at = ts;

  const pedido = store.pedidos[idx];

  const venta: Venta = {
    id: store._seq++,
    pedido_id: id,
    monto: ventaData.monto,
    costo: ventaData.costo,
    iva: ventaData.iva,
    ganancia: ventaData.ganancia,
    con_iva: ventaData.con_iva,
    tipo_venta: 'PEDIDO',
    descripcion: `Pedido ${pedido.numero}`,
    created_at: ts,
  };
  store.ventas.push(venta);

  for (const ing of ['pollo', 'arroz', 'brocoli'] as const) {
    const item = store.despensa.find(d => d.ingrediente === ing);
    if (item && stockDeltas[ing] > 0) {
      item.stock_g = Math.max(0, item.stock_g - Math.round(stockDeltas[ing]));
      item.updated_at = ts;
    }
  }

  if (taperesDelta > 0) {
    store.taperes.stock = Math.max(0, store.taperes.stock - taperesDelta);
    store.taperes.updated_at = ts;
  }

  await write(store);
  return { pedido: store.pedidos[idx], venta };
}

// ── Clientes ─────────────────────────────────────────────────────

function clienteKey(c: { email?: string; nombre: string; telefono?: string }): string {
  const email = (c.email ?? '').trim().toLowerCase();
  if (email) return 'e:' + email;
  const nombre = (c.nombre ?? '').trim().toLowerCase();
  const tel = (c.telefono ?? '').replace(/\D/g, '');
  return 'n:' + nombre + '|t:' + tel;
}

export async function getClientes(): Promise<Cliente[]> {
  const store = await read();
  return [...store.clientes].sort((a, b) => b.total_gastado - a.total_gastado);
}

export async function upsertCliente(data: {
  nombre: string;
  email?: string;
  telefono?: string;
  montoPedido?: number;
}): Promise<Cliente | null> {
  const nombre = (data.nombre ?? '').trim();
  if (!nombre) return null;
  const store = await read();
  const key = clienteKey({ nombre, email: data.email, telefono: data.telefono });
  const ts = nowStr();
  const idx = store.clientes.findIndex(c =>
    clienteKey({ nombre: c.nombre, email: c.email, telefono: c.telefono }) === key
  );

  if (idx === -1) {
    const nuevo: Cliente = {
      id: store._seq++,
      nombre,
      email: (data.email ?? '').trim(),
      telefono: (data.telefono ?? '').trim(),
      count_pedidos: data.montoPedido ? 1 : 0,
      total_gastado: Math.round(data.montoPedido ?? 0),
      last_pedido_at: data.montoPedido ? ts : '',
      created_at: ts,
    };
    store.clientes.push(nuevo);
    await write(store);
    return nuevo;
  }

  const cur = store.clientes[idx];
  // Actualizar campos vacíos con nuevos datos si vienen
  if (!cur.email    && data.email)    cur.email    = data.email.trim();
  if (!cur.telefono && data.telefono) cur.telefono = data.telefono.trim();
  if (data.montoPedido && data.montoPedido > 0) {
    cur.count_pedidos += 1;
    cur.total_gastado += Math.round(data.montoPedido);
    cur.last_pedido_at = ts;
  }
  await write(store);
  return cur;
}

export async function deleteCliente(id: number): Promise<boolean> {
  const store = await read();
  const idx = store.clientes.findIndex(c => c.id === id);
  if (idx === -1) return false;
  store.clientes.splice(idx, 1);
  await write(store);
  return true;
}
