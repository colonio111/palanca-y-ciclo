import katex from 'katex';

type Hijo = Node | string | null | undefined | false;
type Atributos = Record<string, string | number | boolean | EventListener | undefined>;

function aplicar(el: Element, atributos: Atributos, hijos: Hijo[]) {
  for (const [k, v] of Object.entries(atributos)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const h of hijos) if (h || h === '') el.append(h);
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, atributos: Atributos = {}, ...hijos: Hijo[]) {
  const el = document.createElement(tag);
  aplicar(el, atributos, hijos);
  return el;
}

export function s<K extends keyof SVGElementTagNameMap>(tag: K, atributos: Atributos = {}, ...hijos: Hijo[]) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  aplicar(el, atributos, hijos);
  return el;
}

export const fmt = (v: number, decimales = 2) =>
  v.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const mes = (f: string) => `${MESES[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`;

/** Dibuja las fórmulas marcadas con data-tex dentro de un contenedor. */
export function formulas(raiz: HTMLElement) {
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-tex]'))
    katex.render(el.dataset.tex!, el, { throwOnError: false, displayMode: el.dataset.bloque === '1' });
}

export const icono = (d: string) =>
  s('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('path', { d }));

export const ICONOS = {
  descargar: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14',
  externo: 'M14 5h5v5m0-5-8 8M11 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-5',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  tema: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z',
  documento: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
};
