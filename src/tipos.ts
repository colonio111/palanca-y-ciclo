export interface Banco {
  nombre: string;
  apalancamiento: number[];
  capital: number[];
  morosidad: number[];
  activo: number[];
}

export interface Panel {
  fechas: string[];
  observaciones: number;
  bancos: Banco[];
  sistema: number[];
  brechas: { fechas: string[]; credito: number[]; pbi: number[]; tasa: number[] };
  betaMovil: { fechas: string[]; beta: number[]; inferior: number[]; superior: number[] };
}

export interface BancoCapital {
  nombre: string;
  capital: number[];
  excedente: number[];
  densidad: number[];
  activo: number[];
  crecimiento: (number | null)[];
}

export interface PanelCapital {
  fechas: string[];
  observaciones: number;
  bancos: BancoCapital[];
  sistema: Record<'capital' | 'cet1' | 'limite' | 'excedente' | 'densidad' | 'crecimiento' | 'tasa' | 'tamn' | 'tipmn', (number | null)[]>;
  proyecciones: { h: number; coef: number; inferior: number; superior: number }[];
  descomposicion: { periodo: string; grupo: string; inicial: number; final: number; total: number; capital: number; densidad: number; tamano: number; credito: number }[];
}

export type Bloque =
  | { tipo: 'p' | 'hallazgo'; html: string }
  | { tipo: 'h3'; texto: string }
  | { tipo: 'lista'; items: string[] }
  | { tipo: 'ecuacion'; tex: string; numero: string }
  | { tipo: 'figura'; archivo: string; numero: string; leyenda: string; nota: string }
  | { tipo: 'diagrama'; cual: string; numero: string; leyenda: string }
  | { tipo: 'tabla'; numero: string; leyenda: string; nota: string; partes: { cabecera: string[]; filas: string[][] }[] };

export interface Estudio {
  resumenes: { titulo: string; texto: string; claves: string[] }[];
  capitulos: { id: string; titulo: string; bloques: Bloque[] }[];
  referencias: { autores: string; anio: string; titulo: string; fuente: string; url: string }[];
  diagramas: {
    mecanismo: string[];
    hitos: { fecha: string; texto: string }[];
    flujo: { paso: string; archivo: string; detalle: string }[];
  };
}

export interface Ficha {
  numero: number;
  eje: string;
  titulo: string;
  tituloOriginal: string;
  autores: string;
  anio: number;
  revista: string;
  cuartil: string;
  enlace: string;
  pais: string;
  periodo: string;
  muestra: string;
  metodo: string;
  grafico: {
    titulo: string;
    nota: string;
    unidad: string;
    sufijo: string;
    decimales: number;
    series: string[];
    datos: { etiqueta: string; valores: number[] }[];
  };
  secciones: Record<string, Bloque[]>;
  poster: string;
}
