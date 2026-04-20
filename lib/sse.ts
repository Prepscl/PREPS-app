// Stubs: emits son no-op porque ya no usamos SSE (el cliente hace polling).
// Se mantienen las funciones exportadas para no romper imports existentes.

export function emitNuevoPedido(_pedido: unknown): void {
  // no-op
}

export function emitPedidoActualizado(_pedido: unknown): void {
  // no-op
}
