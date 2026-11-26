import type { Articulo } from '../articulos';
import type { Ficha } from '../tipos';
import { canto } from '../components/escena';
import { fmt, formulas, h, icono, ICONOS, s } from '../util';
import { bloque } from './bloques';

// Las revistas traen cuartil; el resto son documentos de trabajo o notas institucionales.
const tipoDe = (f: Ficha) => (/^Q\d$/.test(f.cuartil) ? f.cuartil : f.cuartil.startsWith('Nota') ? 'ND' : 'DT');
const NOMBRES: Record<string, string> = { DT: 'Documento de trabajo', ND: 'Nota de discusión' };
const nombreDe = (t: string) => NOMBRES[t] ?? t;

const PESTANAS: [string, string][] = [
  ['general', 'Resumen general'],
  ['contexto', 'Contexto'],
  ['problema', 'Problema'],
  ['objetivo', 'Objetivo'],
  ['metodologia', 'Metodología'],
  ['resultados', 'Resultados'],
  ['conclusiones', 'Conclusiones'],
];

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function barras(g: Ficha['grafico']): HTMLElement {
  const maximo = Math.max(...g.datos.flatMap(d => d.valores.map(Math.abs))) || 1;
  const hayNegativos = g.datos.some(d => d.valores.some(v => v < 0));
  return h('figure', { class: 'barras' },
    h('figcaption', {}, g.unidad ? `${g.titulo} (${g.unidad})` : g.titulo),
    g.series.length > 1 && h('div', { class: 'leyenda' }, ...g.series.map((n, i) => h('span', {}, h('i', { class: `llave g-c${i + 1}` }), n))),
    h('dl', {}, ...g.datos.map(d =>
      h('div', {},
        h('dt', {}, d.etiqueta),
        ...d.valores.map((v, i) =>
          h('dd', {},
            h('span', { class: `pista ${hayNegativos ? 'centrada' : ''}` },
              h('i', { class: `g-c${i + 1} ${v < 0 ? 'negativo' : ''}`, style: `--v:${(Math.abs(v) / maximo) * (hayNegativos ? 50 : 100)}%` })),
            h('b', {}, fmt(v, g.decimales) + g.sufijo)))))),
    h('p', { class: 'nota' }, g.nota));
}

function tarjeta(f: Ficha): HTMLDetailsElement {
  const cuerpo = h('div', { class: 'ficha-cuerpo' });
  let abierta = false;
  const tipo = tipoDe(f);
  const detalle = h('details', { class: `ficha ${tipo.toLowerCase()}` },
    h('summary', {},
      h('span', { class: 'cuartil', title: NOMBRES[tipo] ?? `Revista ${tipo} en SJR` }, tipo),
      h('span', { class: 'ficha-titulo' }, h('strong', {}, f.titulo), h('span', {}, `${f.autores} (${f.anio})`), h('em', {}, f.revista)),
      h('span', { class: 'ficha-pais' }, f.pais)),
    cuerpo);

  const contenido = h('div', { class: 'ficha-texto', role: 'tabpanel' });
  const pestanas = h('div', { class: 'pestanas', role: 'tablist' });
  function mostrar(id: string) {
    pestanas.replaceChildren(...PESTANAS.map(([k, n]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === id), onclick: () => mostrar(k) }, n)));
    if (id === 'general') {
      contenido.replaceChildren(
        h('dl', { class: 'datos' }, ...([['País', f.pais], ['Periodo', f.periodo], ['Muestra', f.muestra], ['Método', f.metodo]] as const)
          .map(([t, v]) => h('div', {}, h('dt', {}, t), h('dd', {}, v)))),
        h('h4', {}, 'Relación con este estudio'),
        ...f.secciones.vinculo.map(b => bloque(b)),
        barras(f.grafico));
    } else contenido.replaceChildren(...f.secciones[id].map(b => bloque(b)));
    formulas(contenido);
  }

  // el contenido se construye al abrir por primera vez
  detalle.addEventListener('toggle', () => {
    if (!detalle.open || abierta) return;
    abierta = true;
    cuerpo.append(
      h('p', { class: 'original', lang: 'en' }, f.tituloOriginal),
      pestanas, contenido,
      h('div', { class: 'acciones' },
        h('a', { class: 'boton primario', href: f.enlace, target: '_blank', rel: 'noopener' }, icono(ICONOS.externo), f.enlace.includes('doi.org') ? 'Artículo original (DOI)' : 'Documento original'),
        h('a', { class: 'boton', href: f.poster, target: '_blank' }, icono(ICONOS.documento), 'Póster en español (PDF)')));
    mostrar('general');
  });
  return detalle;
}

/** Una moneda por estudio, apiladas por año; el color es el cuartil de la revista. */
function pilas(fichas: Ficha[]): HTMLElement {
  const anios = [...new Set(fichas.map(f => f.anio))].sort();
  const porAnio = anios.map(a => fichas.filter(f => f.anio === a).sort((x, y) => tipoDe(y).localeCompare(tipoDe(x))));
  const alto = Math.max(...porAnio.map(p => p.length));
  const paso = 30;
  const base = alto * paso + 20;
  const x = (i: number) => (i + 0.5) * (800 / anios.length);
  const tipos = [...new Set(fichas.map(tipoDe))].sort();
  return h('figure', { class: 'pilas' },
    s('svg', { viewBox: `0 0 800 ${base + 40}`, role: 'img', 'aria-label': `Estudios por año: ${anios.map((a, i) => `${a}, ${porAnio[i].length}`).join('; ')}` },
      ...porAnio.flatMap((grupo, i) => [
        ...grupo.map((f, k) => {
          const y = base - k * paso;
          return s('g', { class: tipoDe(f).toLowerCase() },
            s('path', { class: 'pila-lado', d: canto(x(i), y, paso - 4, 55) }),
            s('ellipse', { class: 'pila-cara', cx: x(i), cy: y - paso + 4, rx: 55, ry: 7 }));
        }),
        s('text', { class: 'rotulo', x: x(i), y: base + 32, 'text-anchor': 'middle' }, String(anios[i])),
      ])),
    h('figcaption', {}, 'Cada moneda es un estudio. Color según dónde se publicó:',
      ...tipos.map(c => h('span', { class: c.toLowerCase() }, h('i'), nombreDe(c)))));
}

export function vistaAntecedentes(articulo: Articulo): HTMLElement {
  const fichas = articulo.fichas;
  const anios = fichas.map(f => f.anio);
  const tarjetas = fichas.map(f => ({
    f,
    el: tarjeta(f),
    texto: plano([f.titulo, f.tituloOriginal, f.autores, f.revista, f.pais, f.metodo, f.anio].join(' ')),
  }));
  const total = h('p', { class: 'conteo', 'aria-live': 'polite' });
  const vacio = h('p', { class: 'vacio', hidden: true }, 'Ningún estudio coincide. Prueba con un autor, un país o un método, o quita el filtro de tema.');
  const buscar = h('input', { type: 'search', placeholder: 'Autor, título, revista, país o método', 'aria-label': 'Buscar antecedentes' });
  const eje = h('select', { 'aria-label': 'Filtrar por tema' },
    h('option', { value: '' }, 'Todos los temas'),
    ...[...new Set(fichas.map(f => f.eje))].map(e => h('option', { value: e }, e)));

  function filtrar() {
    const palabras = plano(buscar.value).split(/\s+/).filter(Boolean);
    let n = 0;
    for (const t of tarjetas) {
      const ver = (!eje.value || t.f.eje === eje.value) && palabras.every(p => t.texto.includes(p));
      t.el.hidden = !ver;
      if (ver) n++;
    }
    total.textContent = `${n} de ${fichas.length} estudios`;
    vacio.hidden = n > 0;
  }
  buscar.addEventListener('input', filtrar);
  eje.addEventListener('change', filtrar);
  filtrar();

  const cabeza = h('header', { class: 'banda' },
    h('div', {},
      h('h1', {}, h('strong', {}, String(fichas.length)), ' ', h('span', {}, 'estudios contrastan esta investigación')),
      h('p', { class: 'banda-detalle' }, `Antecedentes de acceso abierto, ${Math.min(...anios)}–${Math.max(...anios)}. Cada ficha es una síntesis en español; el trabajo completo se lee en su fuente original.`)),
    pilas(fichas));

  const lista = h('div', { class: 'antecedentes columna' },
    h('div', { class: 'buscador' }, h('div', { class: 'campo' }, icono(ICONOS.buscar), buscar), eje),
    total,
    ...tarjetas.map(t => t.el),
    vacio);
  return h('div', {}, cabeza, h('div', { class: 'contenedor' }, lista));
}
