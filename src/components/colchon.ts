// El capital de cada 100 soles en riesgo, en monedas: bajo la línea, lo que exige la ley; encima, el colchón.
import { fmt, s } from '../util';
import { canto } from './escena';

const BASE = 500;
const X = 430;

export function escenaColchon(maximo: number) {
  const cuantas = Math.ceil(maximo);
  const ALTO = Math.min(28, 440 / cuantas); // alto de cada sol
  const monedas = Array.from({ length: cuantas }, () => {
    const lado = s('path', { class: 'moneda-lado' });
    const cara = s('ellipse', { cx: X, rx: 130, ry: 7 });
    return { g: s('g', {}, lado, cara), lado, cara };
  });
  const rotuloMinimo = s('text', { class: 'rotulo minimo', x: 20, y: -12 });
  const minimo = s('g', { class: 'colchon-minimo' },
    s('path', { d: `M20 0H${X + 160}` }),
    rotuloMinimo);
  const llave = s('path', { class: 'colchon-llave' });
  const rotuloColchon = s('text', { class: 'rotulo', x: X + 188 });
  const valorColchon = s('text', { class: 'rotulo colchon-valor', x: X + 188 });
  const pie = s('text', { class: 'rotulo', x: X, y: 540, 'text-anchor': 'middle' });
  const svg = s('svg', { viewBox: '0 30 800 530', class: 'palanca-escena colchon', 'aria-hidden': 'true' },
    ...monedas.map(m => m.g),
    s('path', { class: 'suelo', d: `M20 ${BASE}H780` }),
    minimo, llave, rotuloColchon, valorColchon, pie);

  /** v: ratio de capital; limite: mínimo legal; ambos en % de los activos en riesgo. */
  function pintar(v: number, limite: number) {
    monedas.forEach((m, k) => {
      const alto = Math.max(0, Math.min(1, v - k)) * ALTO;
      const base = BASE - k * ALTO;
      m.g.style.display = alto > 0 ? '' : 'none';
      m.g.setAttribute('class', k < limite - 0.25 ? 'exigido' : 'sobrante');
      m.lado.setAttribute('d', canto(X, base, alto, 130));
      m.cara.setAttribute('cy', String(base - alto));
    });
    const yMin = BASE - limite * ALTO;
    const yTope = BASE - v * ALTO;
    minimo.style.transform = `translateY(${yMin}px)`;
    rotuloMinimo.textContent = `Mínimo legal: ${fmt(limite, limite % 1 ? 1 : 0)}`;
    const hay = v > limite;
    const [a, b] = [Math.min(yTope, yMin), Math.max(yTope, yMin)];
    llave.setAttribute('d', `M${X + 150} ${a}h18V${b}h-18`);
    rotuloColchon.textContent = hay ? 'Colchón' : 'Falta';
    rotuloColchon.setAttribute('y', String((a + b) / 2 - 6));
    valorColchon.textContent = fmt(Math.abs(v - limite), 1);
    valorColchon.setAttribute('y', String((a + b) / 2 + 26));
    pie.textContent = `${fmt(v, 1)} de capital por cada 100 en riesgo`;
  }
  return { svg, pintar };
}
