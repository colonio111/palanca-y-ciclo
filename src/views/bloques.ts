// Pinta los bloques generados por el importador.
import type { Bloque, Estudio } from '../tipos';
import { h } from '../util';

function ampliar(src: string, alt: string) {
  const d = h('dialog', { class: 'visor' },
    h('form', { method: 'dialog' }, h('button', { class: 'boton' }, 'Cerrar')),
    h('img', { src, alt }));
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => e.target === d && d.close());
  document.body.append(d);
  d.showModal();
}

function diagrama(cual: string, d: Estudio['diagramas']): HTMLElement {
  if (cual === 'mecanismo')
    return h('div', {},
      h('ol', { class: 'circuito' }, ...d.mecanismo.map((t, i) => h('li', { class: i === 2 ? 'clave' : '' }, t))),
      h('p', { class: 'nota' }, 'El circuito vuelve al paso 1; en la contracción opera al revés. La regulación prudencial interviene en el paso 3.'));
  if (cual === 'linea-tiempo')
    return h('ol', { class: 'hitos' }, ...d.hitos.map(x => h('li', {}, h('strong', {}, x.fecha), h('span', {}, x.texto))));
  return h('ol', { class: 'flujo' }, ...d.flujo.map(x => h('li', {}, h('strong', {}, x.paso), h('code', {}, x.archivo), h('span', {}, x.detalle))));
}

export function bloque(b: Bloque, diagramas?: Estudio['diagramas'], base = ''): HTMLElement {
  switch (b.tipo) {
    case 'p': return h('p', { html: b.html });
    case 'h3': return h('h3', {}, b.texto);
    case 'hallazgo': return h('p', { class: 'hallazgo', html: b.html });
    case 'lista': return h('ul', {}, ...b.items.map(i => h('li', { html: i })));
    case 'ecuacion':
      return h('div', { class: 'ecuacion' },
        h('div', { 'data-tex': b.tex, 'data-bloque': '1' }),
        h('span', {}, b.numero));
    case 'figura': {
      const src = `${base}/figuras/${b.archivo}`;
      const alt = `${b.numero}. ${b.leyenda.replace(/<[^>]+>/g, '')}`;
      return h('figure', { class: 'ancho' },
        h('figcaption', {}, h('b', {}, `${b.numero}. `), h('span', { html: b.leyenda })),
        h('button', { type: 'button', class: 'lamina', 'aria-label': `Ampliar ${alt}`, onclick: () => ampliar(src, alt) },
          h('img', { src, alt, loading: 'lazy' })),
        h('p', { class: 'nota', html: b.nota }));
    }
    case 'diagrama':
      return h('figure', {},
        h('figcaption', {}, h('b', {}, `${b.numero}. `), h('span', { html: b.leyenda })),
        diagrama(b.cual, diagramas!));
    case 'tabla':
      return h('figure', { class: 'ancho' },
        h('figcaption', {}, h('b', {}, `${b.numero}. `), h('span', { html: b.leyenda })),
        ...b.partes.map(p =>
          h('div', { class: 'tabla', tabindex: 0 },
            h('table', {},
              h('thead', {}, h('tr', {}, ...p.cabecera.map(c => h('th', { scope: 'col', html: c })))),
              h('tbody', {}, ...p.filas.map(f => h('tr', {}, ...f.map(c => h('td', { html: c })))))))),
        h('p', { class: 'nota', html: b.nota }));
  }
}
