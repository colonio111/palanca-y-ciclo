// Todo lo que cambia de un artículo a otro.
import catalogo from '../content/articulos.json';
import estudio1 from '../content/articulo-1/estudio.json';
import literatura1 from '../content/articulo-1/literatura.json';
import estudio2 from '../content/articulo-2/estudio.json';
import literatura2 from '../content/articulo-2/literatura.json';
import type { Estudio, Ficha } from './tipos';

export const autora = catalogo.autora;

export interface Articulo {
  id: string;
  numero: number;
  tema: string;
  titulo: string;
  corto: string;
  pregunta: string;
  repositorio: string;
  descargas: string;
  cifras: { valor: string; unidad?: string; texto: string }[];
  hipotesis: { id: string; nombre: string; veredicto: string; estado: string; detalle: string }[];
  estudio: Estudio;
  fichas: Ficha[];
}

const contenido = [
  [estudio1, literatura1],
  [estudio2, literatura2],
];

export const ARTICULOS: Articulo[] = catalogo.articulos.map((a, i) => ({
  ...(a as Omit<Articulo, 'numero' | 'estudio' | 'fichas'>),
  numero: i + 1,
  estudio: contenido[i][0] as unknown as Estudio,
  fichas: contenido[i][1] as unknown as Ficha[],
}));
