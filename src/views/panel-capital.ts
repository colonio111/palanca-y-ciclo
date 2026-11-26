import datos from '../../content/articulo-2/panel.json';
import { ARTICULOS } from '../articulos';
import { escenaColchon } from '../components/colchon';
import { graficoDispersion, graficoLineas } from '../components/grafico';
import { tapiz } from '../components/tapiz';
import { veredictos } from '../components/veredictos';
import type { PanelCapital } from '../tipos';
import { fmt, h, mes } from '../util';
import { barras } from './antecedentes';

const panel = datos as PanelCapital;
const articulo = ARTICULOS[1];
const SISTEMA = 'Sistema (15 bancos)';
const U = panel.fechas.length - 1;
const limite = panel.sistema.limite as number[];

const VISTAS = [
  { id: 'banco', nombre: 'Banco' },
  { id: 'transicion', nombre: 'Transición' },
  { id: 'hipotesis', nombre: 'Hipótesis' },
] as const;

const INDICADORES = {
  excedente: { nombre: 'Excedente de capital', unidad: 'puntos porcentuales', explica: 'Ratio de capital global menos el mínimo legal del mes.' },
  capital: { nombre: 'Ratio de capital global', unidad: '%', explica: 'Patrimonio efectivo entre activos ponderados por riesgo.' },
  densidad: { nombre: 'Densidad de riesgo', unidad: '%', explica: 'Activos ponderados por riesgo entre activo total.' },
  crecimiento: { nombre: 'Crecimiento del crédito', unidad: '% anual', explica: 'Variación a 12 meses del crédito real.' },
};
type Indicador = keyof typeof INDICADORES;

const signo = (v: number) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v), 1)}`;

export function vistaPanelCapital(bancoInicial?: string): HTMLElement {
  let vista: (typeof VISTAS)[number]['id'] = 'banco';
  let banco = panel.bancos.find(b => b.nombre === bancoInicial)?.nombre ?? panel.bancos[0].nombre;
  let comparar = SISTEMA;
  let indicador: Indicador = 'excedente';
  const buscar = (nombre: string) => panel.bancos.find(b => b.nombre === nombre)!;

  const cuerpo = h('div', { class: 'panel-cuerpo' });
  const mapa = tapiz({
    fechas: panel.fechas,
    filas: panel.bancos.map(b => ({ nombre: b.nombre, valores: b.excedente })),
    unidad: 'puntos',
    rango: [0, 12],
    elegido: banco,
    alElegir: nombre => elegir(nombre),
  });

  // banda superior: el colchón del banco elegido en el último mes
  const escena = escenaColchon(Math.max(...panel.bancos.map(b => b.capital[U])));
  const quien = h('span');
  const cifra = h('strong');
  function encabezar() {
    const b = buscar(banco);
    quien.textContent = `${banco} guarda`;
    cifra.textContent = fmt(b.excedente[U], 1);
    escena.pintar(b.capital[U], limite[U]);
  }

  function elegir(nombre: string) {
    banco = nombre;
    if (comparar === nombre) comparar = SISTEMA;
    vista = 'banco';
    mapa.marcar(nombre);
    encabezar();
    dibujar();
  }

  const selector = (etiqueta: string, valor: string, opciones: [string, string][], cambio: (v: string) => void) => {
    const sel = h('select', { onchange: () => cambio(sel.value) }, ...opciones.map(([v, t]) => h('option', { value: v, selected: v === valor }, t)));
    return h('label', { class: 'selector' }, h('span', {}, etiqueta), sel);
  };

  const metricas = (lista: [string, string, string?][]) =>
    h('dl', { class: 'metricas' }, ...lista.map(([t, v, extra]) => h('div', {}, h('dt', {}, t), h('dd', {}, v, extra ? h('small', {}, extra) : null))));

  function vistaBanco(): Node[] {
    const b = buscar(banco);
    const info = INDICADORES[indicador];
    // el crecimiento a 12 meses empieza en 2017
    const desde = indicador === 'crecimiento' ? 12 : 0;
    const referencia = comparar === SISTEMA
      ? { nombre: 'Sistema', valores: panel.sistema[indicador] }
      : { nombre: comparar, valores: buscar(comparar)[indicador] };
    const puntos = panel.fechas.slice(12).map((f, k) => ({
      x: b.excedente[k],
      y: b.crecimiento[k + 12]!,
      etiqueta: mes(f),
      marcado: f >= '2020-03' && f <= '2021-12',
    }));

    return [
      h('div', { class: 'filtros' },
        selector('Banco', banco, panel.bancos.map(x => [x.nombre, x.nombre]), elegir),
        selector('Indicador', indicador, Object.entries(INDICADORES).map(([k, v]) => [k, v.nombre]), v => { indicador = v as Indicador; dibujar(); }),
        selector('Comparar con', comparar, [SISTEMA, ...panel.bancos.map(x => x.nombre).filter(x => x !== banco)].map(x => [x, x]), v => { comparar = v; dibujar(); })),
      metricas([
        [`Excedente, ${mes(panel.fechas[U])}`, `${fmt(b.excedente[U], 1)} pts`, `${signo(b.excedente[U] - b.excedente[0])} desde 2016`],
        ['Capital global', `${fmt(b.capital[U], 1)} %`, `mínimo legal ${fmt(limite[U], 0)} %`],
        ['Densidad de riesgo', `${fmt(b.densidad[U], 1)} %`, `${signo(b.densidad[U] - b.densidad[0])} desde 2016`],
        ['Crédito real, 12 meses', `${signo(b.crecimiento[U]!)} %`],
      ]),
      graficoLineas({
        titulo: `${info.nombre}: ${banco}`,
        subtitulo: `${info.explica} En ${info.unidad}, mensual.`,
        archivo: `${indicador}-${banco}`,
        fechas: panel.fechas.slice(desde),
        series: [
          { nombre: banco, color: 1, valores: b[indicador].slice(desde) },
          { nombre: referencia.nombre, color: 2, valores: referencia.valores.slice(desde) },
          ...(indicador === 'capital' ? [{ nombre: 'Mínimo legal', color: 3 as const, valores: limite }] : []),
        ],
        referencia: indicador === 'excedente' || indicador === 'crecimiento' ? { valor: 0, texto: indicador === 'excedente' ? 'mínimo legal' : 'sin crecimiento' } : undefined,
        decimales: 1,
      }),
      graficoDispersion({
        titulo: '¿Más colchón hoy, más crédito después?',
        subtitulo: `${banco}: excedente de un mes y crecimiento del crédito 12 meses más tarde.`,
        archivo: `excedente-credito-${banco}`,
        puntos,
        ejeX: 'Excedente 12 meses antes (puntos)',
        ejeY: 'Crecimiento del crédito (%)',
      }),
      h('p', { class: 'nota' }, 'La recta es un ajuste simple de un solo banco y puede tener cualquier signo. Las estimaciones del estudio comparan los 15 bancos con efectos fijos y controles.'),
    ];
  }

  function vistaTransicion(): Node[] {
    const s = panel.sistema;
    return [
      metricas([
        ['Mínimo legal más bajo', '8 %', 'abril 2021 a agosto 2022'],
        ['Salto del ratio, enero 2023', '+2,03', 'por los nuevos ponderadores'],
        ['Patrimonio efectivo, 2023–2025', '+23,2 %', 'sostuvo el alza del ratio'],
      ]),
      graficoLineas({
        titulo: 'Capital del sistema frente al mínimo legal',
        subtitulo: 'En % de los activos ponderados por riesgo. El CET1 se publica desde 2023.',
        archivo: 'capital-sistema',
        fechas: panel.fechas,
        series: [{ nombre: 'Ratio de capital global', color: 1, valores: s.capital }, { nombre: 'CET1', color: 2, valores: s.cet1 }, { nombre: 'Mínimo legal', color: 3, valores: s.limite }],
      }),
      graficoLineas({
        titulo: 'Tasas de interés en moneda nacional',
        subtitulo: 'Referencia del BCRP, tasa activa (TAMN) y pasiva (TIPMN), en %.',
        archivo: 'tasas',
        fechas: panel.fechas,
        series: [{ nombre: 'TAMN', color: 1, valores: s.tamn }, { nombre: 'Referencia', color: 2, valores: s.tasa }, { nombre: 'TIPMN', color: 3, valores: s.tipmn }],
      }),
      graficoLineas({
        titulo: 'Densidad de riesgo del sistema',
        subtitulo: 'Activos ponderados por riesgo entre activo total, en %.',
        archivo: 'densidad-sistema',
        fechas: panel.fechas,
        series: [{ nombre: 'Sistema', color: 1, valores: s.densidad }],
        decimales: 1,
      }),
      graficoLineas({
        titulo: 'Crecimiento real del crédito',
        subtitulo: 'Variación a 12 meses del crédito de los 15 bancos, en %.',
        archivo: 'credito-sistema',
        fechas: panel.fechas.slice(12),
        series: [{ nombre: 'Sistema', color: 1, valores: s.crecimiento.slice(12) }],
        referencia: { valor: 0, texto: 'sin crecimiento' },
        decimales: 1,
      }),
    ];
  }

  function vistaHipotesis(): Node[] {
    const p = panel.proyecciones;
    const sistema = panel.descomposicion.filter(d => d.grupo === 'Sistema');
    return [
      veredictos(articulo),
      graficoLineas({
        titulo: 'Tras un alza de la tasa, ¿protege su crédito el banco con más capital?',
        subtitulo: 'Diferencia de crédito entre un banco con una desviación estándar más de excedente y el banco promedio. Banda: intervalo al 90 %.',
        archivo: 'proyecciones-locales',
        fechas: p.map(x => String(x.h)),
        ejeX: { columna: 'Meses después', texto: v => `${v} meses después`, marca: v => (Number(v) % 6 === 0 ? `${v} m` : null) },
        series: [{ nombre: 'Diferencia', color: 1, valores: p.map(x => x.coef) }],
        banda: { nombre: 'IC 90 %', inferior: p.map(x => x.inferior), superior: p.map(x => x.superior) },
        referencia: { valor: 0, texto: 'sin diferencia' },
        decimales: 1,
      }),
      barras({
        titulo: 'Qué movió el ratio de capital del sistema',
        unidad: 'log × 100',
        nota: 'Un valor positivo eleva el ratio. Los tres aportes suman el cambio total. 14 bancos comparables, sin Alfin Banco.',
        sufijo: '',
        decimales: 2,
        series: ['Flexibilización, mar 2021 a mar 2023', 'Alza, mar 2023 a dic 2025'],
        datos: ([['Más patrimonio efectivo', 'capital'], ['Densidad de riesgo', 'densidad'], ['Tamaño del balance', 'tamano'], ['Cambio total del ratio', 'total']] as const)
          .map(([etiqueta, clave]) => ({ etiqueta, valores: sistema.map(d => d[clave]) })),
      }),
    ];
  }

  const pestanas = h('div', { class: 'pestanas', role: 'tablist' });
  function dibujar() {
    pestanas.replaceChildren(...VISTAS.map(v =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(v.id === vista), onclick: () => { vista = v.id; dibujar(); } }, v.nombre)));
    cuerpo.replaceChildren(...(vista === 'banco' ? vistaBanco() : vista === 'transicion' ? vistaTransicion() : vistaHipotesis()));
  }
  dibujar();
  encabezar();

  const banda = h('header', { class: 'banda' },
    h('div', {},
      h('h1', { 'aria-live': 'polite' }, quien, ' ', cifra, ' ', h('span', {}, 'puntos sobre el mínimo legal')),
      h('p', { class: 'banda-detalle' }, `En ${mes(panel.fechas[U])}. Elige otro banco en el mapa o en la lista.`)),
    escena.svg);

  const rejilla = h('div', { class: 'panel' },
    h('aside', { class: 'panel-mapa' },
      h('h2', {}, 'El mapa del colchón'),
      h('p', {}, 'Excedente medio anual, en puntos. Bancos ordenados por tamaño a diciembre de 2025.'),
      mapa.elemento),
    h('section', { class: 'panel-detalle' }, pestanas, cuerpo,
      h('div', { class: 'acciones' },
        h('a', { class: 'boton primario', href: '#/articulo-2/estudio' }, 'Ver la investigación'),
        articulo.repositorio ? h('a', { class: 'boton', href: articulo.repositorio, target: '_blank', rel: 'noopener' }, 'Código y datos en GitHub') : null)));
  return h('div', {}, banda, h('div', { class: 'contenedor' }, rejilla));
}
