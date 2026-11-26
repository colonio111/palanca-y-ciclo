// Portada del artículo 2: el colchón de capital sobre el mínimo legal, mes a mes.
import datos from '../../content/articulo-2/panel.json';
import { ARTICULOS } from '../articulos';
import { escenaColchon } from '../components/colchon';
import { tapiz } from '../components/tapiz';
import { lineaTiempo } from '../components/tiempo';
import type { PanelCapital } from '../tipos';
import { fmt, h, mes } from '../util';
import { firma, investigacion } from './inicio';

export function inicioCapital(): HTMLElement {
  const panel = datos as PanelCapital;
  const ratio = panel.sistema.capital as number[];
  const limite = panel.sistema.limite as number[];

  const escena = escenaColchon(Math.max(...ratio));
  const cifra = h('strong');
  const detalle = h('p', { class: 'palanca-detalle' });
  const tiempo = lineaTiempo({
    fechas: panel.fechas,
    valores: ratio,
    guia: limite,
    texto: i => `${fmt(ratio[i], 1)} de capital, mínimo ${fmt(limite[i], 1)}`,
    alCambiar: i => {
      cifra.textContent = fmt(ratio[i], 1);
      detalle.textContent = `En ${mes(panel.fechas[i])}. La ley pedía ${fmt(limite[i], limite[i] % 1 ? 1 : 0)}; los otros ${fmt(ratio[i] - limite[i], 1)} eran colchón.`;
      escena.pintar(ratio[i], limite[i]);
    },
  });

  const t = tapiz({
    fechas: panel.fechas,
    filas: panel.bancos.map(b => ({ nombre: b.nombre, valores: b.excedente })),
    unidad: 'puntos',
    rango: [0, 12],
    aniosCompletos: true,
    alElegir: banco => {
      location.hash = `#/articulo-2/panel/${encodeURIComponent(banco)}`;
    },
  });

  return h('div', { class: 'inicio' },
    h('section', { class: 'palanca' },
      h('div', { class: 'palanca-texto' },
        h('h1', {}, h('span', {}, 'De cada 100 soles en riesgo, la banca peruana respalda'), ' ', cifra, ' ', h('span', {}, 'con capital propio')),
        detalle,
        h('div', { class: 'acciones' },
          h('a', { class: 'boton primario', href: '#/articulo-2/estudio' }, 'Leer el estudio'),
          h('a', { class: 'boton', href: '#/articulo-2/panel' }, 'Explorar los bancos')),
        h('p', { class: 'palanca-autora' }, firma())),
      escena.svg,
      tiempo),
    h('div', { class: 'inicio-resto' },
      h('section', { class: 'portada', 'aria-labelledby': 'titulo-colchon' },
        h('div', { class: 'portada-texto' },
          h('h2', { id: 'titulo-colchon' }, 'El colchón de cada banco'),
          h('p', {}, 'Puntos de capital por encima del mínimo legal, promedio de cada año. Cuanto más intensa la celda, más holgura.')),
        t.elemento,
        h('p', { class: 'hallazgo-portada' }, 'Entre 2023 y 2025 el ratio de capital subió porque el patrimonio efectivo creció 23,2 %, no porque los bancos redujeran su riesgo o su balance.')),
      h('section', { class: 'investigaciones', 'aria-labelledby': 'titulo-inv' },
        h('h2', { id: 'titulo-inv' }, 'Investigaciones'),
        ...ARTICULOS.map(investigacion))));
}
