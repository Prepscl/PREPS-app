// Precio por gramo COCIDO (así es como se calcula el costo del plato)
export const COSTOS_COCIDOS = {
  pollo: 9.06,
  arroz: 2.27,
  brocoli: 0.86,
} as const;

// Mantengo COSTOS_CRUDOS como alias por compatibilidad (mismos valores cocido)
export const COSTOS_CRUDOS = COSTOS_COCIDOS;

// Costo fijo de envase por plato
export const COSTO_ENVASE = 350;

// Merma SOLO para convertir g cocido → g crudo (stock y producción)
export const FACTORES_MERMA = {
  pollo: 0.75,
  arroz: 2.5,
  brocoli: 0.9,
} as const;

export const PRECIOS_VENTA: Record<string, number> = {
  low_carb: 4990,
  high_carb: 5690,
  pack_5: 24900,
  pack_15: 72900,
  pack_28: 129900,
};

export const LABELS_PRECIO: Record<string, string> = {
  low_carb: 'Low Carb',
  high_carb: 'High Carb',
  pack_5: 'Pack x5',
  pack_15: 'Pack x15',
  pack_28: 'Pack x28',
};

// Costo del plato: precio por g cocido × gramos cocidos + envase
export function calcularCostoPlato(
  gPolloCocinado: number,
  gArrozCocinado: number,
  gBrocoliCocinado: number
): number {
  const costoPollo   = gPolloCocinado   * COSTOS_COCIDOS.pollo;
  const costoArroz   = gArrozCocinado   * COSTOS_COCIDOS.arroz;
  const costoBrocoli = gBrocoliCocinado * COSTOS_COCIDOS.brocoli;
  return costoPollo + costoArroz + costoBrocoli + COSTO_ENVASE;
}

export function calcularPrecioLabs(
  gPollo: number,
  gArroz: number,
  gBrocoli: number
): number {
  return 3 + gPollo * 22.47 + gArroz * 2.08 + gBrocoli * 5.69;
}

export function gramosCrudosDesdeCocinados(
  tipo: keyof typeof FACTORES_MERMA,
  gramosCocinados: number
): number {
  return gramosCocinados / FACTORES_MERMA[tipo];
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function calcularIVA(montoConIva: number): number {
  return montoConIva - montoConIva / 1.19;
}

export function calcularNetoSinIVA(montoConIva: number): number {
  return montoConIva / 1.19;
}

export function calcularGananciaNeta(ventaBruta: number, costoInsumos: number): number {
  return ventaBruta / 1.19 - costoInsumos;
}

export function calcularMargen(ventaBruta: number, costoInsumos: number): number {
  const neto = ventaBruta / 1.19;
  if (neto <= 0) return 0;
  return ((neto - costoInsumos) / neto) * 100;
}
