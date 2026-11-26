// Conclusión de cada hipótesis: franja entera si se confirma, a medias si es parcial, vacía si no.
import type { Articulo } from '../articulos';
import { h } from '../util';

export const veredictos = (a: Articulo) =>
  h('ul', { class: 'veredictos' }, ...a.hipotesis.map(x =>
    h('li', { class: `veredicto ${x.estado}` },
      h('div', {},
        h('h3', {}, `${x.id}. ${x.nombre}`),
        h('strong', {}, x.veredicto),
        h('span', { class: 'franja', 'aria-hidden': 'true' })),
      h('p', {}, x.detalle))));
