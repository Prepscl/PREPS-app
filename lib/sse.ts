import { EventEmitter } from 'events';

const globalSSE = global as typeof globalThis & { sseEmitter: EventEmitter };

if (!globalSSE.sseEmitter) {
  globalSSE.sseEmitter = new EventEmitter();
  globalSSE.sseEmitter.setMaxListeners(200);
}

export const sseEmitter = globalSSE.sseEmitter;

export function emitNuevoPedido(pedido: unknown) {
  sseEmitter.emit('event', { tipo: 'NUEVO_PEDIDO', data: pedido });
}

export function emitPedidoActualizado(pedido: unknown) {
  sseEmitter.emit('event', { tipo: 'PEDIDO_ACTUALIZADO', data: pedido });
}
