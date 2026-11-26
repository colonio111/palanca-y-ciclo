// Gráficos SVG: líneas (con banda opcional) y dispersión, con tooltip y descarga PNG / Excel.
import writeXlsxFile from 'write-excel-file/browser';
import { fmt, h, icono, ICONOS, mes, s } from '../util';

export interface Serie {
  nombre: string;
  color: 1 | 2 | 3;
  valores: (number | null)[];
}

export interface OpcionesLineas {
  titulo: string;
  subtitulo: string;
  archivo: string;
  fechas: string[];
  series: Serie[];
  banda?: { nombre: string; inferior: number[]; superior: number[] };
  referencia?: { valor: number; texto: string };
  decimales?: number;
  /** Para series que no van por meses (p. ej. horizontes). */
  ejeX?: { columna: string; texto: (valor: string) => string; marca: (valor: string) => string | null };
}

const ALTO = 280;
const M = { arriba: 12, derecha: 14, abajo: 26, izquierda: 44 };

function marcas(min: number, max: number, n = 4): number[] {
  const bruto = (max - min) / n;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map(m => m * pot).find(p => p >= bruto)!;
  const salida: number[] = [];
  for (let v = Math.floor(min / paso) * paso; v <= max + paso * 0.999; v += paso) salida.push(Number(v.toFixed(6)));
  return salida;
}
const decimalesDe = (t: number[]) => {
  const paso = Math.abs(t[1] - t[0]);
  return Number.isInteger(paso) ? 0 : Number.isInteger(paso * 10) ? 1 : 2;
};

type Leyenda = { nombre: string; color: number }[];

function botones(archivo: string, svg: () => SVGSVGElement, titulo: string, filas: () => (string | number)[][], leyenda: Leyenda) {
  return h('div', { class: 'grafico-acciones' },
    h('button', { type: 'button', class: 'boton-mini', onclick: () => descargarPng(svg(), titulo, archivo, leyenda) }, icono(ICONOS.descargar), 'PNG'),
    h('button', { type: 'button', class: 'boton-mini', onclick: () => descargarExcel(filas(), archivo) }, icono(ICONOS.descargar), 'Excel'),
  );
}

/** Redibuja al cambiar el ancho del contenedor. */
function adaptable(caja: HTMLElement, dibujar: (ancho: number) => void) {
  let previo = 0;
  new ResizeObserver(([e]) => {
    const ancho = Math.round(e.contentRect.width);
    if (ancho && ancho !== previo) dibujar((previo = ancho));
  }).observe(caja);
}

export function graficoLineas(o: OpcionesLineas): HTMLElement {
  const dec = o.decimales ?? 2;
  const lienzo = h('div', { class: 'grafico-lienzo' });
  const globo = h('div', { class: 'globo', hidden: true });
  let svg!: SVGSVGElement;

  const todos = [...o.series.flatMap(x => x.valores.filter((v): v is number => v !== null)), ...(o.banda ? [...o.banda.inferior, ...o.banda.superior] : []), ...(o.referencia ? [o.referencia.valor] : [])];
  const ticks = marcas(Math.min(...todos), Math.max(...todos));
  const [min, max] = [ticks[0], ticks[ticks.length - 1]];
  const n = o.fechas.length;

  adaptable(lienzo, ancho => {
    const x = (i: number) => M.izquierda + (i / (n - 1)) * (ancho - M.izquierda - M.derecha);
    const y = (v: number) => M.arriba + (1 - (v - min) / (max - min)) * (ALTO - M.arriba - M.abajo);
    const camino = (v: (number | null)[]) =>
      v.map((val, i) => (val === null ? '' : `${i && v[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`)).join('');

    svg = s('svg', { viewBox: `0 0 ${ancho} ${ALTO}`, width: ancho, height: ALTO, role: 'img', 'aria-label': `${o.titulo}. ${o.subtitulo}` });
    // pandemia: marzo 2020 a diciembre 2021
    const p0 = o.fechas.indexOf('2020-03');
    const p1 = o.fechas.indexOf('2021-12');
    if (p0 >= 0 && p1 >= 0) svg.append(
      s('rect', { x: x(p0), y: M.arriba, width: x(p1) - x(p0), height: ALTO - M.arriba - M.abajo, class: 'g-pandemia' }),
      s('text', { x: x(p0) + 4, y: M.arriba + 11, class: 'g-eje' }, 'pandemia'),
    );
    const d = decimalesDe(ticks);
    for (const t of ticks) svg.append(
      s('line', { x1: M.izquierda, x2: ancho - M.derecha, y1: y(t), y2: y(t), class: 'g-rejilla' }),
      s('text', { x: M.izquierda - 7, y: y(t) + 4, class: 'g-eje', 'text-anchor': 'end' }, fmt(t, d)),
    );
    const cadaAnios = ancho < 460 ? 3 : ancho < 700 ? 2 : 1;
    let k = 0;
    o.fechas.forEach((f, i) => {
      if (o.ejeX) {
        const marca = o.ejeX.marca(f);
        if (marca !== null) svg.append(s('text', { x: x(i), y: ALTO - 7, class: 'g-eje', 'text-anchor': i ? 'middle' : 'start' }, marca));
      } else if (f.endsWith('-01') && k++ % cadaAnios === 0)
        svg.append(s('text', { x: x(i), y: ALTO - 7, class: 'g-eje', 'text-anchor': i ? 'middle' : 'start' }, f.slice(0, 4)));
    });
    if (o.banda) {
      const abajo = o.banda.inferior.map((v, i) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`).reverse().join('');
      svg.append(s('path', { d: camino(o.banda.superior) + abajo + 'Z', class: 'g-banda g-c1' }));
    }
    if (o.referencia) svg.append(
      s('line', { x1: M.izquierda, x2: ancho - M.derecha, y1: y(o.referencia.valor), y2: y(o.referencia.valor), class: 'g-referencia' }),
      s('text', { x: M.izquierda + 4, y: y(o.referencia.valor) - 5, class: 'g-eje' }, o.referencia.texto),
    );
    for (const serie of o.series) svg.append(s('path', { d: camino(serie.valores), class: `g-linea g-c${serie.color}` }));

    const guia = s('line', { y1: M.arriba, y2: ALTO - M.abajo, class: 'g-guia', visibility: 'hidden' });
    const puntos = o.series.map(x => s('circle', { r: 4, class: `g-punto g-c${x.color}`, visibility: 'hidden' }));
    svg.append(guia, ...puntos);

    let actual = n - 1;
    const mostrar = (i: number) => {
      actual = i;
      guia.setAttribute('x1', String(x(i)));
      guia.setAttribute('x2', String(x(i)));
      guia.setAttribute('visibility', 'visible');
      o.series.forEach((serie, j) => {
        const v = serie.valores[i];
        puntos[j].setAttribute('cx', String(x(i)));
        puntos[j].setAttribute('cy', String(y(v ?? min)));
        puntos[j].setAttribute('visibility', v === null ? 'hidden' : 'visible');
      });
      globo.replaceChildren(
        h('strong', {}, o.ejeX ? o.ejeX.texto(o.fechas[i]) : mes(o.fechas[i])),
        ...o.series.map(serie => h('span', {}, h('i', { class: `llave g-c${serie.color}` }), `${serie.nombre} `, h('b', {}, serie.valores[i] === null ? 'sin dato' : fmt(serie.valores[i]!, dec)))),
        ...(o.banda ? [h('span', {}, `${o.banda.nombre}: ${fmt(o.banda.inferior[i], dec)} a ${fmt(o.banda.superior[i], dec)}`)] : []),
      );
      globo.hidden = false;
      const izquierda = x(i) > ancho / 2;
      globo.style.left = izquierda ? '' : `${x(i) + 12}px`;
      globo.style.right = izquierda ? `${ancho - x(i) + 12}px` : '';
    };
    const ocultar = () => {
      globo.hidden = true;
      for (const el of [guia, ...puntos]) el.setAttribute('visibility', 'hidden');
    };
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (ancho / r.width);
      mostrar(Math.max(0, Math.min(n - 1, Math.round(((px - M.izquierda) / (ancho - M.izquierda - M.derecha)) * (n - 1)))));
    });
    svg.addEventListener('pointerleave', ocultar);
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      mostrar(Math.max(0, Math.min(n - 1, actual + (e.key === 'ArrowLeft' ? -1 : 1))));
    });
    svg.addEventListener('blur', ocultar);
    lienzo.replaceChildren(svg, globo);
  });

  const filas = () => [
    [o.ejeX?.columna ?? 'Fecha', ...o.series.map(x => x.nombre), ...(o.banda ? [`${o.banda.nombre} inferior`, `${o.banda.nombre} superior`] : [])],
    ...o.fechas.map((f, i) => [f, ...o.series.map(x => x.valores[i] ?? ''), ...(o.banda ? [o.banda.inferior[i], o.banda.superior[i]] : [])]),
  ];

  return h('figure', { class: 'grafico' },
    h('figcaption', {}, h('h3', {}, o.titulo), h('p', {}, o.subtitulo)),
    o.series.length > 1 && h('div', { class: 'leyenda' }, ...o.series.map(x => h('span', {}, h('i', { class: `llave g-c${x.color}` }), x.nombre))),
    lienzo,
    botones(o.archivo, () => svg, o.titulo, filas, o.series),
  );
}

export function graficoDispersion(o: {
  titulo: string; subtitulo: string; archivo: string;
  puntos: { x: number; y: number; etiqueta: string; marcado: boolean }[];
  ejeX: string; ejeY: string;
}): HTMLElement {
  const lienzo = h('div', { class: 'grafico-lienzo' });
  const globo = h('div', { class: 'globo', hidden: true });
  let svg!: SVGSVGElement;
  const xs = marcas(Math.min(...o.puntos.map(p => p.x)), Math.max(...o.puntos.map(p => p.x)), 5);
  const ys = marcas(Math.min(...o.puntos.map(p => p.y)), Math.max(...o.puntos.map(p => p.y)));
  const [x0, x1, y0, y1] = [xs[0], xs.at(-1)!, ys[0], ys.at(-1)!];

  // recta de mínimos cuadrados de los puntos mostrados
  const n = o.puntos.length;
  const mx = o.puntos.reduce((a, p) => a + p.x, 0) / n;
  const my = o.puntos.reduce((a, p) => a + p.y, 0) / n;
  const pendiente = o.puntos.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / o.puntos.reduce((a, p) => a + (p.x - mx) ** 2, 0);

  adaptable(lienzo, ancho => {
    const alto = ALTO + 30;
    const X = (v: number) => M.izquierda + ((v - x0) / (x1 - x0)) * (ancho - M.izquierda - M.derecha);
    const Y = (v: number) => M.arriba + (1 - (v - y0) / (y1 - y0)) * (alto - M.arriba - M.abajo - 16);
    svg = s('svg', { viewBox: `0 0 ${ancho} ${alto}`, width: ancho, height: alto, role: 'img', 'aria-label': `${o.titulo}. ${o.subtitulo}` });
    for (const t of ys) svg.append(
      s('line', { x1: M.izquierda, x2: ancho - M.derecha, y1: Y(t), y2: Y(t), class: 'g-rejilla' }),
      s('text', { x: M.izquierda - 7, y: Y(t) + 4, class: 'g-eje', 'text-anchor': 'end' }, fmt(t, decimalesDe(ys))),
    );
    for (const t of xs) svg.append(s('text', { x: X(t), y: alto - 24, class: 'g-eje', 'text-anchor': 'middle' }, fmt(t, decimalesDe(xs))));
    svg.append(
      s('text', { x: (ancho + M.izquierda) / 2, y: alto - 5, class: 'g-eje', 'text-anchor': 'middle' }, o.ejeX),
      s('text', { x: 11, y: alto / 2 - 12, class: 'g-eje', 'text-anchor': 'middle', transform: `rotate(-90 11 ${alto / 2 - 12})` }, o.ejeY),
    );
    for (const p of o.puntos) {
      const c = s('circle', { cx: X(p.x), cy: Y(p.y), r: 4, class: `g-nube ${p.marcado ? 'g-c2' : 'g-c1'}` });
      c.addEventListener('pointerenter', () => {
        globo.replaceChildren(h('strong', {}, p.etiqueta), h('span', {}, `${o.ejeX}: ${fmt(p.x, 1)}`), h('span', {}, `${o.ejeY}: ${fmt(p.y, 1)}`));
        globo.hidden = false;
        const derecha = X(p.x) > ancho / 2;
        globo.style.left = derecha ? '' : `${X(p.x) + 10}px`;
        globo.style.right = derecha ? `${ancho - X(p.x) + 10}px` : '';
      });
      c.addEventListener('pointerleave', () => (globo.hidden = true));
      svg.append(c);
    }
    // la recta se corta donde sale del recuadro, suba o baje
    const [c1, c2] = [mx + (y0 - my) / pendiente, mx + (y1 - my) / pendiente];
    const a = Math.max(x0, Math.min(c1, c2));
    const b = Math.min(x1, Math.max(c1, c2));
    svg.append(s('line', { x1: X(a), x2: X(b), y1: Y(my + pendiente * (a - mx)), y2: Y(my + pendiente * (b - mx)), class: 'g-referencia g-ajuste' }));
    lienzo.replaceChildren(svg, globo);
  });

  return h('figure', { class: 'grafico' },
    h('figcaption', {}, h('h3', {}, o.titulo), h('p', {}, `${o.subtitulo} Pendiente de la recta mostrada: ${fmt(pendiente, 2)}.`)),
    h('div', { class: 'leyenda' }, h('span', {}, h('i', { class: 'llave g-c1' }), 'Resto del periodo'), h('span', {}, h('i', { class: 'llave g-c2' }), 'Pandemia (mar 2020 a dic 2021)')),
    lienzo,
    botones(o.archivo, () => svg, o.titulo, () => [['Mes', o.ejeX, o.ejeY], ...o.puntos.map(p => [p.etiqueta, p.x, p.y])],
      [{ nombre: 'Resto del periodo', color: 1 }, { nombre: 'Pandemia', color: 2 }]),
  );
}

function descargar(blob: Blob, nombre: string) {
  const a = h('a', { href: URL.createObjectURL(blob), download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function descargarExcel(filas: (string | number)[][], nombre: string) {
  const datos = filas.map((f, i) => f.map(v => ({ value: v, fontWeight: i === 0 ? ('bold' as const) : undefined })));
  void writeXlsxFile(datos, { columns: filas[0].map(() => ({ width: 24 })) }).toFile(`${nombre}.xlsx`);
}

/** Copia los estilos calculados al SVG y lo pinta en un canvas. */
function descargarPng(svg: SVGSVGElement, titulo: string, nombre: string, leyenda: Leyenda) {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  const origen = svg.querySelectorAll<SVGElement>('*');
  copia.querySelectorAll<SVGElement>('*').forEach((el, i) => {
    const cs = getComputedStyle(origen[i]);
    for (const p of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'fill-opacity', 'font-size', 'font-family'])
      el.style.setProperty(p, cs.getPropertyValue(p));
  });
  const { width, height } = svg.viewBox.baseVal;
  copia.setAttribute('width', String(width));
  copia.setAttribute('height', String(height));
  const img = new Image();
  img.onload = () => {
    const estilo = getComputedStyle(document.body);
    const lienzo = h('canvas', { width: (width + 32) * 2, height: (height + 80) * 2 });
    const c = lienzo.getContext('2d')!;
    c.scale(2, 2);
    c.fillStyle = estilo.getPropertyValue('--superficie');
    c.fillRect(0, 0, width + 32, height + 80);
    c.fillStyle = estilo.getPropertyValue('--tinta');
    c.font = '600 15px sans-serif';
    c.fillText(titulo, 16, 28);
    c.font = '12px sans-serif';
    let x = 16;
    for (const l of leyenda) {
      c.fillStyle = estilo.getPropertyValue(`--c${l.color}`);
      c.fillRect(x, 40, 11, 11);
      c.fillStyle = estilo.getPropertyValue('--tinta');
      c.fillText(l.nombre, x + 16, 50);
      x += c.measureText(l.nombre).width + 36;
    }
    c.drawImage(img, 16, 62);
    lienzo.toBlob(b => b && descargar(b, `${nombre}.png`));
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copia))}`;
}
