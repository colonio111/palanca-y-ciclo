// Portada: una palanca en la que 1 sol de patrimonio sostiene la pila de activos del sistema, mes a mes.
import type { Panel } from '../tipos';
import { fmt, h, mes } from '../util';
import { escenaPalanca } from './escena';
import { lineaTiempo } from './tiempo';

export function palanca(panel: Panel, acciones: HTMLElement, autora: string): HTMLElement {
  const valores = panel.sistema;
  const escena = escenaPalanca(Math.max(...valores));
  const cifra = h('strong');
  const detalle = h('p', { class: 'palanca-detalle' });

  const tiempo = lineaTiempo({
    fechas: panel.fechas,
    valores,
    texto: i => `${fmt(valores[i], 1)} soles`,
    alCambiar: i => {
      cifra.textContent = fmt(valores[i], 1);
      detalle.textContent = `En ${mes(panel.fechas[i])}. De ellos, ${fmt(valores[i] - 1, 1)} soles vienen de depósitos y deuda.`;
      escena.pintar(valores[i]);
    },
  });

  return h('section', { class: 'palanca' },
    h('div', { class: 'palanca-texto' },
      h('h1', {}, h('span', {}, 'Con 1 sol propio, la banca peruana sostiene'), ' ', cifra, ' ', h('span', {}, 'soles')),
      detalle,
      acciones,
      h('p', { class: 'palanca-autora' }, autora)),
    escena.svg,
    tiempo);
}
