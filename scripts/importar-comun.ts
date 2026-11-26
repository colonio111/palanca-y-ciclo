// Importación común a los dos artículos. La carpeta de origen solo se lee.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cierre, enLinea, leerBib, leerCsv, type Refs } from './typst.ts';

export interface Config {
  id: string;
  variable: string;
  comas?: boolean;
  capitulos: [string, string, string][];
  ecuaciones: Record<string, string>;
  ejes: Record<string, number[]>;
  mecanismo?: string[];
  flujo: { paso: string; archivo: string; detalle: string }[];
}

export const num = (s: string | number) => Number(Number(s).toFixed(4));

/** Punto decimal → coma y signo menos tipográfico, como hace el artículo con sus CSV. */
const aComa = (c: string) => c.replace(/(\d)\.(\d)/g, '$1,$2').replace(/(^|[\s(=<])-(\d)/g, '$1−$2');

export function preparar(cfg: Config) {
  const FUENTE = process.env[cfg.variable] ?? '';
  if (!FUENTE) throw new Error(`Define ${cfg.variable} en .env.local (ver .env.example).`);

  const carpeta = (prefijo: string) => {
    const n = readdirSync(FUENTE).find(d => d.startsWith(prefijo));
    if (!n) throw new Error(`No se encontró la carpeta ${prefijo}* en ${FUENTE}`);
    return join(FUENTE, n);
  };
  const N1 = carpeta('N1_'), N2 = carpeta('N2_'), N3 = carpeta('N3_');
  // los espacios duros de Typst (\u{a0}) se convierten al leer
  const leer = (...p: string[]) =>
    readFileSync(join(...p), 'utf8').replace(/\r/g, '').split('\\u{a0}').join('\u00a0');
  const csv = (nombre: string) => leerCsv(leer(N3, 'salidas', nombre));

  const CONTENIDO = `content/${cfg.id}`;
  const PUBLICO = `public/${cfg.id}`;
  for (const d of [CONTENIDO, `${PUBLICO}/figuras`, `${PUBLICO}/documentos/posteres`, 'public/logos'])
    mkdirSync(d, { recursive: true });
  const guardar = (nombre: string, dato: unknown) => writeFileSync(join(CONTENIDO, nombre), JSON.stringify(dato));
  const datosProcesados = () => {
    const dir = join(N3, 'datos_procesados');
    const archivo = readdirSync(dir).find(f => f.startsWith('datos_procesados'))!;
    return leerCsv(leer(dir, archivo));
  };

  /** Artículo, antecedentes, documentos y logos. */
  function documentos() {
    const typ = leer(N2, 'articulo', 'main.typ');
    const bib = leerBib(leer(N2, 'articulo', 'referencias.bib'));
    const cuerpo = typ.slice(typ.indexOf('\n= Introducción'));

    // numeración de figuras, tablas y ecuaciones en orden de aparición
  const refs: Refs = { bib, etiquetas: {}, citadas: new Set() };
  {
    const anexoA = cuerpo.indexOf('\n= Anexo A');
    const anexoB = cuerpo.indexOf('\n= Anexo B');
    const n = { fig: 0, tab: 0, eq: 0, figB: 0, tabA: 0 };
    // las definiciones van tras ")" o "$": así no se confunden con las claves de #cite(<...>)
    for (const m of cuerpo.matchAll(/[)$]\s*<((fig|tab|eq)-[\w-]+)>/g)) {
      const [, etiqueta, tipo] = m;
      if (tipo === 'fig') refs.etiquetas[etiqueta] = m.index > anexoB ? `Figura B${++n.figB}` : `Figura ${++n.fig}`;
      else if (tipo === 'tab') refs.etiquetas[etiqueta] = m.index > anexoA ? `Tabla A${++n.tabA}` : `Tabla ${++n.tab}`;
      else refs.etiquetas[etiqueta] = `Ecuación ${++n.eq}`;
    }
  }

  type Bloque = Record<string, unknown> & { tipo: string };

  const textos = (s: string) => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);

  /** Contenido de cada [celda] de nivel superior. */
  function celdas(s: string): string[] {
    const salida: string[] = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '[') {
        const fin = cierre(s, i);
        salida.push(s.slice(i + 1, fin));
        i = fin;
      }
    }
    return salida;
  }

  /** Convierte una llamada #figura-tabla / #figura-imagen / #figure en un bloque. */
  function figura(llamada: string, etiqueta: string | undefined): Bloque {
    const numero = etiqueta ? (refs.etiquetas[etiqueta] ?? '') : '';
    const contenidoTras = (marca: string) => {
      const i = llamada.indexOf(marca);
      if (i < 0) return '';
      const abre = i + marca.length - 1;
      return llamada.slice(abre + 1, cierre(llamada, abre));
    };
    const esFigure = llamada.startsWith('#figure(');
    let leyenda: string;
    if (esFigure) leyenda = contenidoTras('caption: [');
    else {
      const abre = llamada.indexOf('[');
      leyenda = llamada.slice(abre + 1, cierre(llamada, abre));
    }
    const base = {
      numero,
      leyenda: enLinea(leyenda, refs),
      nota: esFigure ? '' : enLinea(contenidoTras('nota-al-pie: ['), refs),
    };

    if (llamada.startsWith('#figura-imagen')) {
      const archivo = llamada.match(/"\/salidas\/(\w+\.svg)"/)![1];
      copyFileSync(join(N3, 'salidas', archivo), `${PUBLICO}/figuras/${archivo}`);
      return { tipo: 'figura', archivo, ...base };
    }
    if (esFigure) return { tipo: 'diagrama', cual: etiqueta!.replace('fig-', ''), ...base };

    // tablas: una o varias leídas de CSV, o escritas a mano
    const partes: { cabecera: string[]; filas: string[][] }[] = [];
    const encabezadoDe = (args: string) => {
      const i = args.indexOf('encabezado: (');
      if (i < 0) return null;
      const abre = i + 'encabezado: '.length;
      const fin = cierre(args, abre);
      return { cabecera: textos(args.slice(abre, fin + 1)), fin };
    };
    const argumentos = (desde: number) => {
      const abre = llamada.indexOf('(', desde);
      return llamada.slice(abre + 1, cierre(llamada, abre));
    };
    for (const m of llamada.matchAll(/tabla-csv\("\/salidas\/(\w+\.csv)"/g)) {
      const [cab, ...filas] = csv(m[1]);
      partes.push({
        cabecera: encabezadoDe(argumentos(m.index))?.cabecera ?? cab,
        filas: filas.map(f => f.map(c => enLinea((cfg.comas ? aComa(c) : c).replace(/\*/g, '\\*'), refs))),
      });
    }
    if (!partes.length) {
      const args = argumentos(llamada.indexOf('tabla-lineas('));
      const enc = encabezadoDe(args)!;
      let resto = args.slice(enc.fin + 1).replace(/letra: [\d.]+em,/, '');
      // #veredicto([texto], color) \ #text(..)[(aclaración)]  →  celda de texto
      resto = resto.replace(
        /\[#veredicto\(\[([^\]]+)\], rgb\("#\w+"\)\)(?: \\ #text\(size: 0\.9em\)\[([^\]]+)\])?\]/g,
        (_, v, extra) => `[${v}${extra ? ` ${extra}` : ''}]`,
      );
      const filas: string[][] = [];
      const lista = celdas(resto);
      for (let i = 0; i < lista.length; i += enc.cabecera.length)
        filas.push(lista.slice(i, i + enc.cabecera.length).map(c => enLinea(c, refs)));
      partes.push({ cabecera: enc.cabecera.map(c => enLinea(c, refs)), filas });
    }
    return { tipo: 'tabla', partes, ...base };
  }

  function bloques(texto: string): Bloque[] {
    const salida: Bloque[] = [];
    let parrafo: string[] = [];
    let lista: string[] = [];
    const cerrar = () => {
      if (parrafo.length) salida.push({ tipo: 'p', html: enLinea(parrafo.join(' '), refs) });
      if (lista.length) salida.push({ tipo: 'lista', items: lista.map(i => enLinea(i, refs)) });
      parrafo = [];
      lista = [];
    };
    let i = 0;
    while (i < texto.length) {
      const salto = texto.indexOf('\n', i);
      const finLinea = salto < 0 ? texto.length : salto;
      const linea = texto.slice(i, finLinea).trim();
      const llamada = linea.match(/^#(figura-tabla|figura-imagen|figure|hallazgo|counter|set|show|pagebreak|let|\[)/)?.[1];

      if (llamada === 'figura-tabla' || llamada === 'figura-imagen' || llamada === 'figure') {
        cerrar();
        const inicio = texto.indexOf('#', i);
        const fin = cierre(texto, texto.indexOf('(', inicio));
        const etiqueta = texto.slice(fin + 1).match(/^\s*<([\w-]+)>/);
        salida.push(figura(texto.slice(inicio, fin + 1), etiqueta?.[1]));
        i = fin + 1 + (etiqueta?.[0].length ?? 0);
        continue;
      }
      if (llamada === 'hallazgo') {
        cerrar();
        const abre = texto.indexOf('[', i);
        const fin = cierre(texto, abre);
        salida.push({ tipo: 'hallazgo', html: enLinea(texto.slice(abre + 1, fin), refs) });
        i = fin + 1;
        continue;
      }
      if (llamada === '[') { // bloque de formato (lista de referencias): se genera aparte
        cerrar();
        i = cierre(texto, texto.indexOf('[', i)) + 1;
        continue;
      }
      if (llamada || linea.startsWith('//')) cerrar();
      else if (linea.startsWith('== ')) {
        cerrar();
        salida.push({ tipo: 'h3', texto: linea.slice(3) });
      } else if (linea.startsWith('$ ')) {
        // ecuación en bloque: termina en "$ <etiqueta>"
        cerrar();
        const m = /\$ <(eq-[\w-]+)>/.exec(texto.slice(i))!;
        salida.push({ tipo: 'ecuacion', tex: cfg.ecuaciones[m[1]], numero: refs.etiquetas[m[1]] });
        i += m.index + m[0].length;
        continue;
      } else if (linea.startsWith('- ')) {
        if (parrafo.length) cerrar();
        lista.push(linea.slice(2));
      } else if (!linea) cerrar();
      else {
        if (lista.length) cerrar();
        // capitular del primer párrafo: #inicio[E][l patrimonio]
        parrafo.push(linea.replace(/^#inicio\[([^\]]*)\]\[([^\]]*)\]/, '$1$2'));
      }
      i = finLinea + 1;
    }
    cerrar();
    return salida;
  }

  const titulos = [...cuerpo.matchAll(/^= (.+)$/gm)];
  const capitulos = cfg.capitulos.map(([id, original, corto]) => {
    const k = titulos.findIndex(t => t[1] === original);
    if (k < 0) throw new Error(`No se encontró la sección "${original}" en main.typ`);
    const desde = titulos[k].index + titulos[k][0].length;
    const hasta = titulos[k + 1]?.index ?? cuerpo.length;
    return { id, titulo: corto, bloques: bloques(cuerpo.slice(desde, hasta)) };
  });

  // resumen, abstract y palabras clave de la portada
  const resumenes = [...typ.matchAll(/titulo: "(Resumen|Abstract)",\s*contenido: (?:text\(lang: "en"\))?\[\s*([\s\S]*?)\s*\],[\s\S]*?claves: \(([^)]*)\)/g)]
    .map(m => ({ titulo: m[1], texto: enLinea(m[2], refs), claves: textos(m[3]) }));
  if (resumenes.length !== 2) throw new Error('No se leyeron el resumen y el abstract.');

  // referencias citadas, en orden alfabético
  const referencias = [...refs.citadas]
    .map(k => bib[k])
    .sort((a, b) => (a.author ?? '').localeCompare(b.author ?? '', 'es'))
    .map(e => ({
      autores: (e.author ?? '').split(/\s+and\s+/).join('; '),
      anio: e.year,
      titulo: e.title,
      fuente: [e.journal ?? e.institution ?? e.publisher ?? e.booktitle, e.volume && `${e.volume}${e.number ? `(${e.number})` : ''}`, e.pages]
        .filter(Boolean).join(', '),
      url: e.doi ? `https://doi.org/${e.doi}` : (e.url ?? ''),
    }));

    const diagramas = {
      mecanismo: cfg.mecanismo ?? [],
      hitos: [...typ.matchAll(/\(\d{4}\.\d+, \[([^\]]+)\], \[([^\]]+)\], "(?:arriba|abajo)", \d\)/g)]
        .map(m => ({ fecha: m[1], texto: m[2] })),
      flujo: cfg.flujo,
    };
    if (!diagramas.hitos.length) throw new Error('No se leyeron los hitos de la línea de tiempo.');
  guardar('estudio.json', { resumenes, capitulos, referencias, diagramas });
  console.log(`estudio: ${capitulos.map(c => `${c.id}(${c.bloques.length})`).join(' ')}, ${referencias.length} referencias`);

    // literatura
  const dirPosteres = join(N2, 'posteres_literatura');
  const pdfPosteres = readdirSync(join(N1, 'Posteres_literatura_ES'));
  const literatura = readdirSync(dirPosteres)
    .filter(f => /^poster_\d\d_.*\.typ$/.test(f))
    .sort()
    .map(archivo => {
      const t = leer(dirPosteres, archivo);
      const campo = (n: string) => t.match(new RegExp(`^\\s*${n}: "((?:[^"\\\\]|\\\\.)*)",`, 'm'))?.[1] ?? '';
      const seccion = (n: string) => {
        const m = t.match(new RegExp(`^\\s*${n}: \\[`, 'm'));
        if (!m) throw new Error(`${archivo}: falta la sección ${n}`);
        const abre = m.index! + m[0].length - 1;
        return bloques(t.slice(abre + 1, cierre(t, abre)).split('\n').map(l => l.trim()).join('\n'));
      };
      const numero = Number(campo('numero'));
      const ficha = textos(t.match(/ficha: \((.*)\),/)![1]);
      const g = t.indexOf('grafico: (');
      const grafico = t.slice(g, cierre(t, g + 'grafico: '.length) + 1);
      // una o varias series: ("etiqueta", 1.2)  o  ("etiqueta", (1.2, 3.4))
      const datos = [...grafico.matchAll(/\("([^"]+)", (?:(-?[\d.]+)|\(([-\d., ]+)\))\)/g)]
        .map(m => ({ etiqueta: m[1], valores: (m[2] ?? m[3]).split(',').map(Number) }));
      const series = textos(grafico.match(/series: \((.*)\),/)?.[1] ?? '');
      const texto = (n: string) => (grafico.match(new RegExp(n + ': "([^"]+)"'))?.[1] ?? '').replace(/\u\{a0\}/g, ' ');
      const pdf = pdfPosteres.find(f => f.startsWith(`Poster_${campo('numero')}_`));
      if (!pdf) throw new Error(`${archivo}: no hay PDF del póster`);
      copyFileSync(join(N1, 'Posteres_literatura_ES', pdf), `${PUBLICO}/documentos/posteres/${pdf}`);
      return {
        numero,
        eje: Object.keys(cfg.ejes).find(e => cfg.ejes[e].includes(numero))!,
        titulo: campo('titulo-es'),
        tituloOriginal: campo('titulo-en'),
        autores: campo('autores'),
        anio: Number(campo('anio')),
        revista: campo('revista'),
        cuartil: campo('cuartil'),
        enlace: campo('enlace'),
        pais: ficha[0],
        periodo: ficha[1],
        muestra: ficha[2],
        metodo: ficha[3],
        grafico: {
          titulo: texto('titulo'),
          nota: texto('nota'),
          unidad: texto('unidad'),
          sufijo: texto('sufijo'),
          decimales: Number(grafico.match(/decimales: (\d+)/)?.[1] ?? 2),
          series,
          datos,
        },
        secciones: Object.fromEntries(
          ['contexto', 'problema', 'objetivo', 'metodologia', 'resultados', 'conclusiones', 'vinculo'].map(n => [n, seccion(n)]),
        ),
        poster: `${cfg.id}/documentos/posteres/${pdf}`,
      };
    });
  guardar('literatura.json', literatura);
  console.log(`literatura: ${literatura.length} fichas, sin gráfico: ${literatura.filter(l => !l.grafico.datos.length || l.grafico.datos.some(d => d.valores.some(Number.isNaN))).map(l => l.numero).join(',') || 'ninguna'}`);

    // documentos propios y logos
    for (const [prefijo, destino] of [['Articulo_', 'articulo.pdf'], ['Beamer_', 'diapositivas.pdf'], ['Poster_articulo_', 'poster.pdf']]) {
      const n = readdirSync(N1).find(f => f.startsWith(prefijo))!;
      copyFileSync(join(N1, n), `${PUBLICO}/documentos/${destino}`);
    }
    for (const logo of ['logo_uncp.png', 'logo_economia.png'])
      copyFileSync(join(N2, 'articulo', 'logos', logo), `public/logos/${logo}`);
    console.log('Listo.');
  }

  return { csv, guardar, datosProcesados, documentos };
}
