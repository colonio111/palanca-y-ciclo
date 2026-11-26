// La palanca dibujada: 1 sol de patrimonio sostiene una pila de soles en activos.
import { fmt, s } from '../util';

const BASE = 418; // cara superior de la barra
const APOYO = 470; // posición del punto de apoyo
const CARGA = 640; // centro de la pila

/** Moneda vista de lado, apoyada en `base`. */
export const canto = (x: number, base: number, alto: number, rx = 85) =>
  `M${x - rx} ${base - alto}V${base - 7}A${rx} 7 0 0 0 ${x + rx} ${base - 7}V${base - alto}Z`;

export function escenaPalanca(maximo: number) {
  const cuantas = Math.ceil(maximo);
  const ALTO = Math.min(34, 374 / cuantas); // alto de cada sol apilado
  const monedas = Array.from({ length: cuantas }, () => {
    const lado = s('path', { class: 'moneda-lado' });
    const cara = s('ellipse', { class: 'moneda-cara', cx: CARGA, rx: 85, ry: 7 });
    return { g: s('g', {}, lado, cara), lado, cara };
  });
  const brazo = s('g', {},
    s('rect', { class: 'barra-palanca', x: 40, y: BASE, width: 710, height: 14 }),
    s('path', { class: 'propio-lado', d: canto(130, BASE, ALTO) }),
    s('ellipse', { class: 'propio-cara', cx: 130, cy: BASE - ALTO, rx: 85, ry: 7 }),
    ...monedas.map(m => m.g));
  const pie = s('text', { class: 'rotulo', x: CARGA, y: 540, 'text-anchor': 'middle' });
  const svg = s('svg', { viewBox: '0 30 800 530', class: 'palanca-escena', 'aria-hidden': 'true' },
    brazo,
    s('path', { class: 'apoyo', d: `M${APOYO} ${BASE + 14}L${APOYO + 46} 500H${APOYO - 46}Z` }),
    s('path', { class: 'suelo', d: 'M20 500H780' }),
    s('text', { class: 'rotulo', x: 130, y: 540, 'text-anchor': 'middle' }, '1 sol de patrimonio'),
    pie);

  function pintar(v: number) {
    pie.textContent = `${fmt(v, 1)} soles en activos`;
    monedas.forEach((m, k) => {
      const alto = Math.max(0, Math.min(1, v - k)) * ALTO;
      const base = BASE - k * ALTO;
      m.g.style.display = alto > 0 ? '' : 'none';
      m.lado.setAttribute('d', canto(CARGA, base, alto));
      m.cara.setAttribute('cy', String(base - alto));
    });
    // la inclinación solo acompaña: crece con la pila
    brazo.setAttribute('transform', `rotate(${Math.min(9, (v - 1) * 0.8).toFixed(2)} ${APOYO} ${BASE + 14})`);
  }
  return { svg, pintar };
}
