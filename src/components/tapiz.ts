// "Tapiz": un indicador medio anual de cada banco (15 × 10). Es portada y selector de panel.
import { fmt, h } from '../util';

const NIVELES = 7;

export interface OpcionesTapiz {
  fechas: string[];
  filas: { nombre: string; valores: number[] }[];
  unidad: string;
  /** Acota la escala de color; los valores negativos se rayan aparte. */
  rango?: [number, number];
  elegido?: string;
  aniosCompletos?: boolean;
  alElegir: (banco: string) => void;
}

export function tapiz({ fechas, filas, unidad, rango, elegido, aniosCompletos, alElegir }: OpcionesTapiz) {
  const anios = [...new Set(fechas.map(f => f.slice(0, 4)))];
  const medias = filas.map(b =>
    anios.map(a => {
      const v = b.valores.filter((_, i) => fechas[i].startsWith(a));
      return v.reduce((x, y) => x + y, 0) / v.length;
    }),
  );
  const plano = medias.flat();
  const [min, max] = rango ?? [Math.min(...plano), Math.max(...plano)];
  const nivel = (v: number) => 1 + Math.max(0, Math.min(NIVELES - 1, Math.floor(((v - min) / (max - min)) * NIVELES)));
  const clase = (v: number) => (rango && v < 0 ? 'bajo-cero' : `n${nivel(v)}`);

  const lectura = h('p', { class: 'tapiz-lectura', 'aria-live': 'polite' }, 'Pasa por una celda para leer el valor; pulsa para ver el banco.');
  const rejilla = h('div', { class: 'tapiz-rejilla', style: `--anios:${anios.length}` });
  rejilla.append(h('span'), ...anios.map(a => h('span', { class: 'tapiz-anio' }, aniosCompletos ? a : `’${a.slice(2)}`)));
  filas.forEach((b, i) => {
    rejilla.append(h('button', { type: 'button', class: 'tapiz-banco', 'data-banco': b.nombre, 'aria-pressed': String(b.nombre === elegido), onclick: () => alElegir(b.nombre) }, b.nombre));
    anios.forEach((a, j) => {
      const texto = `${b.nombre}, ${a}: ${fmt(medias[i][j], 1)} ${unidad}`;
      const leer = () => (lectura.textContent = texto);
      rejilla.append(h('button', {
        type: 'button', class: `celda ${clase(medias[i][j])}`, tabindex: -1, 'aria-label': texto, title: texto,
        'data-banco': b.nombre, style: `--col:${j}`,
        onpointerenter: leer, onfocus: leer, onclick: () => alElegir(b.nombre),
      }));
    });
  });

  const escala = h('div', { class: 'tapiz-escala' },
    rango && plano.some(v => v < 0) ? h('span', { class: 'tapiz-negativo' }, h('i', { class: 'bajo-cero' }), 'bajo el mínimo') : null,
    h('span', {}, `${fmt(min, rango ? 0 : 1)} ${unidad}`),
    ...Array.from({ length: NIVELES }, (_, i) => h('i', { class: `n${i + 1}` })),
    h('span', {}, rango ? `${fmt(max, 0)} o más` : `${fmt(max, 1)} ${unidad}`),
  );
  const elemento = h('div', { class: 'tapiz' }, rejilla, escala, lectura);
  const marcar = (nombre: string) => {
    for (const el of elemento.querySelectorAll<HTMLElement>('[data-banco]')) {
      el.classList.toggle('activo', el.dataset.banco === nombre);
      if (el.classList.contains('tapiz-banco')) el.setAttribute('aria-pressed', String(el.dataset.banco === nombre));
    }
  };
  if (elegido) marcar(elegido);
  return { elemento, marcar };
}
