import datos from '../../content/articulo-1/panel.json';
import { ARTICULOS, autora, type Articulo } from '../articulos';
import { palanca } from '../components/palanca';
import { tapiz } from '../components/tapiz';
import type { Panel } from '../tipos';
import { h } from '../util';

export const firma = () => `Investigación de ${autora.nombre}, ${autora.facultad}, UNCP.`;

export function investigacion(a: Articulo): HTMLElement {
  const [, ...alcance] = a.cifras;
  return h('article', { class: 'investigacion' },
    h('p', {}, `Artículo ${a.numero}`),
    h('div', {},
      h('h3', {}, h('a', { href: a.numero === 1 ? '#/articulo-1/estudio' : `#/${a.id}` }, a.titulo)),
      h('p', { class: 'tema' }, `${a.tema}. ${alcance.map(c => `${c.valor} ${c.texto}`).join('; ')}.`),
      h('p', {}, a.pregunta),
      h('nav', { class: 'enlaces' },
        h('a', { href: `#/${a.id}/panel` }, 'Panel'),
        h('a', { href: `#/${a.id}/estudio` }, 'Estudio'),
        h('a', { href: `#/${a.id}/antecedentes` }, 'Antecedentes'),
        h('a', { href: `#/${a.id}/descargas` }, 'Descargas'))));
}

export function inicio(): HTMLElement {
  const uno = ARTICULOS[0];
  const panel = datos as Panel;
  const t = tapiz({
    fechas: panel.fechas,
    filas: panel.bancos.map(b => ({ nombre: b.nombre, valores: b.apalancamiento })),
    unidad: 'veces',
    aniosCompletos: true,
    alElegir: banco => {
      location.hash = `#/articulo-1/panel/${encodeURIComponent(banco)}`;
    },
  });
  const acciones = h('div', { class: 'acciones' },
    h('a', { class: 'boton primario', href: '#/articulo-1/estudio' }, 'Leer el estudio'),
    h('a', { class: 'boton', href: '#/articulo-1/panel' }, 'Explorar los bancos'));

  return h('div', { class: 'inicio' },
    palanca(panel, acciones, firma()),
    h('div', { class: 'inicio-resto' },
      h('section', { class: 'portada', 'aria-labelledby': 'titulo-bancos' },
        h('div', { class: 'portada-texto' },
          h('h2', { id: 'titulo-bancos' }, 'Diez años, banco por banco'),
          h('p', {}, 'Cuántos soles de activo sostiene cada banco por cada sol de patrimonio. Cuanto más intensa la celda, más larga la palanca.'),
        ),
        t.elemento,
        h('p', { class: 'hallazgo-portada' }, `Por cada 1 % que crece su activo, un banco peruano sube su apalancamiento ${uno.cifras[0].valor} %.`),
      ),
      h('section', { class: 'investigaciones', 'aria-labelledby': 'titulo-inv' },
        h('h2', { id: 'titulo-inv' }, 'Investigaciones'),
        ...ARTICULOS.map(investigacion),
      ),
    ),
  );
}
