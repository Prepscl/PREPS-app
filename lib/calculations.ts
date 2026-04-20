export const COSTOS_CRUDOS = {
  pollo: 9.27,
  arroz: 2.27,
  brocoli: 0.86,
} as const;

export const FACTORES_MERMA = {
  pollo: 0.75,
  arroz: 2.5,
  brocoli: 0.9,
} as const;

export const PRECIOS_VENTA: Record<string, number> = {
  low_carb: 4990,
  high_carb: 5690,
  pack_5: 24990,
  pack_15: 72900,
  pack_28: 129000,
};

export const LABELS_PRECIO: Record<string, string> = {
  low_carb: 'Low Carb',
  high_carb: 'High Carb',
  pack_5: 'Pack x5',
  pack_15: 'Pack x15',
  pack_28: 'Pack x28',
};

export function calcularCostoPlato(
  gPolloCocinado: number,
  gArrozCocinado: number,
  gBrocoliCocinado: number
): number {
  const costoPollo = (gPolloCocinado / FACTORES_MERMA.pollo) * COSTOS_CRUDOS.pollo;
  const costoArroz = (gArrozCocinado / FACTORES_MERMA.arroz) * COSTOS_CRUDOS.arroz;
  const costoBrocoli = (gBrocoliCocinado / FACTORES_MERMA.brocoli) * COSTOS_CRUDOS.brocoli;
  return costoPollo + costoArroz + costoBrocoli;
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
