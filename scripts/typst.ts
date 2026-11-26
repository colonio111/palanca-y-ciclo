// Conversión de la porción de Typst que usan los artículos a bloques HTML.

export type Bib = Record<string, Record<string, string>>;

const limpiarBib = (s: string) =>
  s.replace(/\\&/g, '&').replace(/--/g, '–').replace(/[{}]/g, '').replace(/\\/g, '').trim();

export function leerBib(texto: string): Bib {
  const bib: Bib = {};
  for (const entrada of texto.split(/^@/m).slice(1)) {
    const clave = entrada.match(/^\w+\{([^,]+),/)?.[1];
    if (!clave) continue;
    const campos: Record<string, string> = {};
    for (const m of entrada.matchAll(/^\s*(\w+)\s*=\s*(.+?),?\s*$/gm)) {
      campos[m[1]] = limpiarBib(m[2]);
      if (m[1] === 'author' && m[2].startsWith('{{')) campos.institucion = 'si';
    }
    bib[clave] = campos;
  }
  return bib;
}

function apellidos(autor: string): string {
  const lista = autor.split(/\s+and\s+/).map(a => (a.includes(',') ? a.split(',')[0] : a).trim());
  if (lista.length === 1) return lista[0];
  if (lista.length === 2) return `${lista[0]} y ${lista[1]}`;
  return `${lista[0]} et al.`;
}

export const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function matematica(t: string): string {
  return t
    .replace(/bold\(delta\)/g, '\\boldsymbol{delta}')
    .replace(/bold\((\w+)\)/g, '\\mathbf{$1}')
    .replace(/"(\w+)"/g, '\\text{$1}')
    .replace(/tilde\((\w+)\)/g, '\\tilde{$1}')
    .replace(/bb\((\w+)\)/g, '\\mathbb{$1}')
    .replace(/\^top\b/g, '^{\\top}')
    .replace(/(?<!\\)\bin\b/g, '\\in ')
    .replace(/(?<!\\)\btimes\b/g, '\\times ')
    .replace(/_\(([^)]*)\)/g, '_{$1}')
    .replace(/(?<!\\)\b(Delta|alpha|beta|gamma|delta|rho|mu|theta|phi|epsilon|tau|approx)(?![a-zA-Z])/g, '\\$1 ')
    .replace(/(?<!\\)\bln\b/g, '\\ln ')
    .replace(/\bslash\b/g, '/')
    .replace(/\bdot\b/g, '\\cdot ')
    .replace(/_(\d\d+)/g, '_{$1}');
}

export interface Refs {
  bib: Bib;
  etiquetas: Record<string, string>;
  citadas: Set<string>;
}

/** Texto en línea de Typst → HTML seguro. Las fórmulas quedan en <span data-tex>. */
export function enLinea(texto: string, refs: Refs): string {
  const guardados: string[] = [];
  const guardar = (html: string) => `\u0001${guardados.push(html) - 1}\u0001`;
  const cita = (clave: string, prosa: boolean) => {
    const e = refs.bib[clave];
    if (!e) throw new Error(`Cita sin entrada en el .bib: ${clave}`);
    refs.citadas.add(clave);
    const quien = e.institucion ? e.author : apellidos(e.author ?? e.key ?? clave);
    return prosa ? `${quien} (${e.year})` : `${quien}, ${e.year}`;
  };
  const atributo = (s: string) => escapar(s).replace(/"/g, '&quot;');

  let t = texto
    .replace(/\\u\{a0\}/g, ' ')
    .replace(/\\\*/g, () => guardar('*'))
    .replace(/\\_/g, () => guardar('_'))
    .replace(/\\@/g, () => guardar('@'))
    .replace(/`([^`]+)`/g, (_, c) => guardar(`<code>${escapar(c)}</code>`))
    .replace(/\$([^$]+)\$/g, (_, m) => guardar(`<span data-tex="${atributo(matematica(m))}"></span>`))
    .replace(/#cite\(<([\w-]+)>,\s*form:\s*"prose"\)/g, (_, k) => guardar(escapar(cita(k, true))))
    .replace(/#link\("([^"]+)"\)(\[[^\]]*\])?/g, (_, u) =>
      guardar(`<a href="${atributo(u)}" target="_blank" rel="noopener">${escapar(u)}</a>`))
    // grupos de citas seguidas: @a @b → (A, 2024; B, 2025)
    .replace(/@(?!(?:fig|tab|eq)-)[a-z]\w*(?:\s+@(?!(?:fig|tab|eq)-)[a-z]\w*)*/g, grupo => {
      const claves = [...grupo.matchAll(/@(\w+)/g)].map(m => m[1]);
      return guardar(escapar(`(${claves.map(k => cita(k, false)).join('; ')})`));
    })
    .replace(/@((?:fig|tab|eq)-[\w-]+)/g, (_, k) => {
      const n = refs.etiquetas[k];
      if (!n) throw new Error(`Referencia cruzada desconocida: ${k}`);
      return guardar(n);
    });

  // miles y porcentajes sin salto de línea
  t = t.replace(/(\d) (?=\d{3}\b|%)/g, '$1\u00a0');

  t = escapar(t)
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/(?<![\w\\])_([^_]+)_(?!\w)/g, '<em>$1</em>');

  // restaurar (puede haber marcadores anidados)
  while (t.includes('\u0001')) t = t.replace(/\u0001(\d+)\u0001/g, (_, i) => guardados[Number(i)]);
  return t.trim();
}

/** Índice del cierre que corresponde al ( [ o { abierto en `desde`. */
export function cierre(s: string, desde: number): number {
  const abre = s[desde];
  const cierra = abre === '(' ? ')' : abre === '[' ? ']' : '}';
  let nivel = 0;
  let enTexto = false;
  for (let i = desde; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { i++; continue; }
    if (c === '"' && abre !== '[') enTexto = !enTexto;
    if (enTexto) continue;
    if (c === abre) nivel++;
    else if (c === cierra && --nivel === 0) return i;
  }
  throw new Error(`Sin cierre para ${abre} en: ${s.slice(desde, desde + 60)}`);
}

export function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  const t = texto.replace(/^﻿/, '').replace(/\r/g, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { celda += '"'; i++; } else comillas = false;
      } else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(celda); celda = ''; }
    else if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}
