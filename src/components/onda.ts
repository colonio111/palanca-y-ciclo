// Navegador de capítulos sobre una onda de ciclo: cada capítulo es un punto de la curva.
import { h, s } from '../util';

export function onda(capitulos: { id: string; titulo: string }[], activo: string | undefined, enlace: (id: string) => string) {
  const n = capitulos.length;
  const x = (i: number) => ((i + 0.5) / n) * 1000;
  const yDe = (px: number) => 50 - 28 * Math.sin((px / 1000) * Math.PI * 3);
  const d = Array.from({ length: 201 }, (_, k) => `${k ? 'L' : 'M'}${k * 5} ${yDe(k * 5).toFixed(2)}`).join('');

  return h('nav', { class: `onda ${activo ? 'compacta' : 'abierta'}`, 'aria-label': 'Capítulos del estudio' },
    s('svg', { viewBox: '0 0 1000 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, s('path', { d })),
    h('ol', {}, ...capitulos.map((c, i) =>
      h('li', { style: `--x:${x(i) / 10}%; --y:${yDe(x(i))}%; --i:${i}`, class: yDe(x(i)) < 50 ? 'cresta' : 'valle' },
        h('a', { href: enlace(c.id), 'aria-current': c.id === activo ? 'page' : undefined },
          h('span', { class: 'onda-nodo' }, String(i + 1)),
          h('span', { class: 'onda-texto' }, c.titulo))),
    )),
  );
}
