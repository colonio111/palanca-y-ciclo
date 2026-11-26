import '@fontsource-variable/archivo/standard.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/400-italic.css';
import '@fontsource/spectral/600.css';
import 'katex/dist/katex.min.css';
import './styles/base.css';
import './styles/vistas.css';
import { ARTICULOS, autora } from './articulos';
import { h, icono, ICONOS } from './util';
import { vistaAntecedentes } from './views/antecedentes';
import { vistaEstudio } from './views/estudio';
import { inicio } from './views/inicio';
import { inicioCapital } from './views/inicio-capital';
import { vistaAcerca, vistaDescargas, vistaNoEncontrada } from './views/paginas';
import { vistaPanel } from './views/panel';
import { vistaPanelCapital } from './views/panel-capital';

const barra = document.querySelector<HTMLElement>('.barra')!;
const principal = document.querySelector<HTMLElement>('#contenido')!;

const SECCIONES = [
  ['panel', 'Panel'],
  ['estudio', 'Estudio'],
  ['antecedentes', 'Antecedentes'],
  ['descargas', 'Descargas'],
] as const;

function alternarTema() {
  const raiz = document.documentElement;
  const oscuro = raiz.dataset.tema ? raiz.dataset.tema === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
  raiz.dataset.tema = oscuro ? 'claro' : 'oscuro';
  try { localStorage.setItem('tema', raiz.dataset.tema); } catch { /* sin almacenamiento */ }
}

function cabecera(articulo: string | undefined, seccion: string | undefined) {
  const enlace = (href: string, texto: string, activo: boolean) => h('a', { href, 'aria-current': activo ? 'page' : undefined }, texto);
  const actual = ARTICULOS.find(a => a.id === articulo) ?? ARTICULOS[0];
  const enArticulo = articulo !== 'acerca';
  barra.replaceChildren(
    h('a', { class: 'marca', href: '#/' }, h('img', { src: 'favicon.svg', alt: '', width: 28, height: 28 }), 'Palanca y ciclo'),
    h('div', { class: 'cambio', role: 'group', 'aria-label': 'Artículo' }, ...ARTICULOS.map(a =>
      h('a', { href: a.numero === 1 ? '#/' : `#/${a.id}`, title: a.corto, 'aria-current': enArticulo && a === actual ? 'true' : undefined }, `Artículo ${a.numero}`))),
    h('nav', { 'aria-label': 'Principal' },
      ...SECCIONES.map(([id, t]) => enlace(`#/${actual.id}/${id}`, t, articulo === actual.id && seccion === id)),
      enlace('#/acerca', 'Acerca de', articulo === 'acerca')),
    h('button', { type: 'button', class: 'tema-boton', 'aria-label': 'Cambiar entre tema claro y oscuro', onclick: alternarTema }, icono(ICONOS.tema)));
}

function resolver(partes: string[]): HTMLElement {
  const [a, seccion, extra] = partes;
  if (!a) return inicio();
  if (a === 'acerca') return vistaAcerca();
  const articulo = ARTICULOS.find(x => x.id === a);
  if (!articulo) return vistaNoEncontrada();
  if (!seccion) return articulo.numero === 1 ? vistaEstudio(articulo) : inicioCapital();
  if (seccion === 'panel') return articulo.numero === 1 ? vistaPanel(extra) : vistaPanelCapital(extra);
  if (seccion === 'estudio') return vistaEstudio(articulo, extra);
  if (seccion === 'antecedentes') return vistaAntecedentes(articulo);
  if (seccion === 'descargas') return vistaDescargas(articulo);
  return vistaNoEncontrada();
}

function navegar(primera = false) {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  document.querySelectorAll('dialog').forEach(d => d.remove());
  cabecera(partes[0], partes[1]);
  principal.replaceChildren(resolver(partes));
  const nombre = SECCIONES.find(s => s[0] === partes[1])?.[1];
  document.title = nombre ? `${nombre} · Palanca y ciclo` : 'Palanca y ciclo';
  if (!primera) {
    window.scrollTo(0, 0);
    principal.focus({ preventScroll: true });
  }
}

document.querySelector('.pie')!.append(
  h('p', {}, `${autora.nombre}. ${autora.facultad}, ${autora.universidad}.`),
  h('p', {}, 'Datos: BCRPData y Superintendencia de Banca, Seguros y AFP.'));
document.querySelector<HTMLAnchorElement>('.saltar')!.addEventListener('click', e => {
  e.preventDefault();
  principal.focus();
});
window.addEventListener('hashchange', () => navegar());
navegar(true);
