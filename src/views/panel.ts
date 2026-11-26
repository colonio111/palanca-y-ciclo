import datos from '../../content/articulo-1/panel.json';
import { ARTICULOS } from '../articulos';
import { escenaPalanca } from '../components/escena';
import { graficoDispersion, graficoLineas } from '../components/grafico';
import { tapiz } from '../components/tapiz';
import { veredictos } from '../components/veredictos';
import type { Panel } from '../tipos';
import { fmt, h, mes } from '../util';

const panel = datos as Panel;
const SISTEMA = 'Sistema (15 bancos)';

const VISTAS = [
  { id: 'banco', nombre: 'Banco' },
  { id: 'ciclo', nombre: 'Ciclo' },
  { id: 'beta', nombre: 'Prociclicidad' },
] as const;

const INDICADORES = {
  apalancamiento: { nombre: 'Apalancamiento', unidad: 'veces', explica: 'Activo total entre patrimonio.' },
  capital: { nombre: 'Ratio de capital global', unidad: '%', explica: 'Patrimonio efectivo entre activos ponderados por riesgo.' },
  morosidad: { nombre: 'Morosidad', unidad: '%', explica: 'Créditos atrasados entre créditos directos.' },
};
type Indicador = keyof typeof INDICADORES;

/** Mediana entre bancos, mes a mes. */
const mediana = (clave: Indicador) =>
  panel.fechas.map((_, i) => {
    const v = panel.bancos.map(b => b[clave][i]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  });

export function vistaPanel(bancoInicial?: string): HTMLElement {
  let vista: (typeof VISTAS)[number]['id'] = 'banco';
  let banco = panel.bancos.find(b => b.nombre === bancoInicial)?.nombre ?? panel.bancos[0].nombre;
  let comparar = SISTEMA;
  let indicador: Indicador = 'apalancamiento';

  const cuerpo = h('div', { class: 'panel-cuerpo' });
  const mapa = tapiz({
    fechas: panel.fechas,
    filas: panel.bancos.map(b => ({ nombre: b.nombre, valores: b.apalancamiento })),
    unidad: 'veces',
    elegido: banco,
    alElegir: nombre => elegir(nombre),
  });

  // banda superior: la palanca del banco elegido en el último mes
  const escena = escenaPalanca(Math.max(...panel.bancos.map(b => b.apalancamiento[panel.fechas.length - 1])));
  const quien = h('span');
  const cifra = h('strong');
  function encabezar() {
    const v = panel.bancos.find(x => x.nombre === banco)!.apalancamiento[panel.fechas.length - 1];
    quien.textContent = `${banco} sostiene`;
    cifra.textContent = fmt(v, 1);
    escena.pintar(v);
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
    const b = panel.bancos.find(x => x.nombre === banco)!;
    const u = panel.fechas.length - 1;
    const info = INDICADORES[indicador];
    const total = panel.bancos.reduce((a, x) => a + x.activo[u], 0);
    const cambio = (v: number[]) => `${v[u] - v[0] >= 0 ? '+' : '−'}${fmt(Math.abs(v[u] - v[0]), 1)} desde 2016`;
    const referencia = comparar === SISTEMA
      ? indicador === 'apalancamiento'
        ? { nombre: 'Sistema', valores: panel.sistema }
        : { nombre: 'Mediana de los 15', valores: mediana(indicador) }
      : { nombre: comparar, valores: panel.bancos.find(x => x.nombre === comparar)![indicador] };

    // variación a 12 meses (en %) de activo y apalancamiento
    const puntos = panel.fechas.slice(12).map((f, k) => {
      const i = k + 12;
      return {
        x: 100 * Math.log(b.activo[i] / b.activo[i - 12]),
        y: 100 * Math.log(b.apalancamiento[i] / b.apalancamiento[i - 12]),
        etiqueta: mes(f),
        marcado: f >= '2020-03' && f <= '2021-12',
      };
    });

    return [
      h('div', { class: 'filtros' },
        selector('Banco', banco, panel.bancos.map(x => [x.nombre, x.nombre]), elegir),
        selector('Indicador', indicador, Object.entries(INDICADORES).map(([k, v]) => [k, v.nombre]), v => { indicador = v as Indicador; dibujar(); }),
        selector('Comparar con', comparar, [SISTEMA, ...panel.bancos.map(x => x.nombre).filter(x => x !== banco)].map(x => [x, x]), v => { comparar = v; dibujar(); }),
      ),
      metricas([
        [`Apalancamiento, ${mes(panel.fechas[u])}`, `${fmt(b.apalancamiento[u], 1)} veces`, cambio(b.apalancamiento)],
        ['Capital global', `${fmt(b.capital[u], 1)} %`, cambio(b.capital)],
        ['Morosidad', `${fmt(b.morosidad[u], 1)} %`, cambio(b.morosidad)],
        ['Peso en el activo', `${fmt((100 * b.activo[u]) / total, 1)} %`, `de los 15 bancos`],
      ]),
      graficoLineas({
        titulo: `${info.nombre}: ${banco}`,
        subtitulo: `${info.explica} En ${info.unidad}, mensual, 2016–2025.`,
        archivo: `${indicador}-${banco}`,
        fechas: panel.fechas,
        series: [{ nombre: banco, color: 1, valores: b[indicador] }, { ...referencia, color: 2 }],
      }),
      graficoDispersion({
        titulo: 'Cuando el activo crece, ¿qué hace la palanca?',
        subtitulo: `${banco}, variación a 12 meses.`,
        archivo: `activo-apalancamiento-${banco}`,
        puntos,
        ejeX: 'Crecimiento del activo (%)',
        ejeY: 'Crecimiento del apalancamiento (%)',
      }),
      h('p', { class: 'nota' }, 'El apalancamiento está acotado en los percentiles 1 y 99 del panel, como en el artículo. La recta es un ajuste simple de lo que se ve; las estimaciones del estudio usan efectos fijos.'),
    ];
  }

  function vistaCiclo(): Node[] {
    const { fechas, credito, pbi, tasa } = panel.brechas;
    return [
      metricas([
        ['Brecha del PBI, abril 2020', '−49,3 %', 'su punto más bajo'],
        ['Brecha del crédito, agosto 2020', '12,5 %', 'su punto más alto'],
        ['Correlación entre ambas', '−0,41', 'se movieron en sentidos opuestos'],
      ]),
      graficoLineas({
        titulo: 'Brechas del crédito y del producto',
        subtitulo: 'Desviación respecto de la tendencia (filtro de Hamilton), en %.',
        archivo: 'brechas-ciclo',
        fechas,
        series: [{ nombre: 'Crédito', color: 1, valores: credito }, { nombre: 'PBI', color: 2, valores: pbi }],
        referencia: { valor: 0, texto: 'tendencia' },
        decimales: 1,
      }),
      graficoLineas({
        titulo: 'Tasa de referencia del BCRP',
        subtitulo: 'Política monetaria, en %.',
        archivo: 'tasa-referencia',
        fechas,
        series: [{ nombre: 'Tasa de referencia', color: 3, valores: tasa }],
      }),
      graficoLineas({
        titulo: 'Apalancamiento del sistema',
        subtitulo: 'Activo total entre patrimonio total de los 15 bancos, en veces.',
        archivo: 'apalancamiento-sistema',
        fechas: panel.fechas,
        series: [{ nombre: 'Sistema', color: 1, valores: panel.sistema }],
      }),
    ];
  }

  function vistaBeta(): Node[] {
    const m = panel.betaMovil;
    return [
      metricas([
        ['Antes de la pandemia', 'β 0,887', '2016 a febrero 2020'],
        ['Pandemia', 'β 0,957', 'marzo 2020 a 2021'],
        ['Después', 'β 0,983', '2022 a 2025'],
        ['Colchón de capital', '0,911 vs 0,996', 'alto vs bajo (p = 0,059)'],
      ]),
      graficoLineas({
        titulo: 'Prociclicidad en ventanas móviles de 36 meses',
        subtitulo: 'Pendiente β: cuánto sube el apalancamiento (%) cuando el activo sube 1 %. Banda: intervalo de confianza al 95 %.',
        archivo: 'beta-movil',
        fechas: m.fechas,
        series: [{ nombre: 'β', color: 1, valores: m.beta }],
        banda: { nombre: 'IC 95 %', inferior: m.inferior, superior: m.superior },
        referencia: { valor: 1, texto: 'β = 1: todo el crecimiento se financia con deuda' },
        decimales: 3,
      }),
      veredictos(ARTICULOS[0]),
    ];
  }

  const pestanas = h('div', { class: 'pestanas', role: 'tablist' });
  function dibujar() {
    pestanas.replaceChildren(...VISTAS.map(v =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(v.id === vista), onclick: () => { vista = v.id; dibujar(); } }, v.nombre)));
    cuerpo.replaceChildren(...(vista === 'banco' ? vistaBanco() : vista === 'ciclo' ? vistaCiclo() : vistaBeta()));
  }
  dibujar();
  encabezar();

  const bandaBanco = h('header', { class: 'banda' },
    h('div', {},
      h('h1', { 'aria-live': 'polite' }, quien, ' ', cifra, ' ', h('span', {}, 'soles por cada sol propio')),
      h('p', { class: 'banda-detalle' }, `En ${mes(panel.fechas[panel.fechas.length - 1])}. Elige otro banco en el mapa o en la lista.`)),
    escena.svg);

  const rejilla = h('div', { class: 'panel' },
    h('aside', { class: 'panel-mapa' },
      h('h2', {}, 'El mapa de la banca'),
      h('p', {}, 'Apalancamiento medio anual. Bancos ordenados por tamaño a diciembre de 2025.'),
      mapa.elemento,
    ),
    h('section', { class: 'panel-detalle' }, pestanas, cuerpo,
      h('div', { class: 'acciones' },
        h('a', { class: 'boton primario', href: '#/articulo-1/estudio' }, 'Ver la investigación'),
        h('a', { class: 'boton', href: ARTICULOS[0].repositorio, target: '_blank', rel: 'noopener' }, 'Código y datos en GitHub'))),
  );
  return h('div', {}, bandaBanco, h('div', { class: 'contenedor' }, rejilla));
}
