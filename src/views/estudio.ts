import { autora, type Articulo } from '../articulos';
import { onda } from '../components/onda';
import { veredictos } from '../components/veredictos';
import { formulas, h } from '../util';
import { bloque } from './bloques';

export function vistaEstudio(articulo: Articulo, id?: string): HTMLElement {
  const estudio = articulo.estudio;
  const ruta = (c: string) => `#/${articulo.id}/estudio/${c}`;
  const CAPITULOS = [...estudio.capitulos.map(c => ({ id: c.id, titulo: c.titulo })), { id: 'referencias', titulo: 'Referencias' }];
  const posicion = CAPITULOS.findIndex(c => c.id === id);
  const raiz = h('div', { class: 'estudio' });

  if (posicion < 0) {
    // portada del estudio: título, onda de capítulos y resumen
    let idioma = 0;
    const resumen = h('div', { class: 'resumen' });
    const pintar = () => {
      const r = estudio.resumenes[idioma];
      resumen.replaceChildren(
        h('div', { class: 'pestanas', role: 'tablist' }, ...estudio.resumenes.map((x, i) =>
          h('button', { type: 'button', role: 'tab', 'aria-selected': String(i === idioma), onclick: () => { idioma = i; pintar(); } }, x.titulo))),
        h('p', { html: r.texto, lang: idioma ? 'en' : 'es' }),
        h('ul', { class: 'claves' }, ...r.claves.map(c => h('li', {}, c))));
      formulas(resumen);
    };
    pintar();
    raiz.append(
      h('header', { class: 'banda banda-estudio' },
        h('div', {},
          h('h1', {}, articulo.titulo),
          h('p', { class: 'banda-detalle' }, `${autora.nombre}. ${articulo.tema}.`)),
        h('p', { class: 'banda-hallazgo' },
          h('strong', {}, articulo.cifras[0].valor, h('small', {}, articulo.cifras[0].unidad ?? ' %')),
          h('span', {}, articulo.cifras[0].texto.replace(/^% /, ''))),
        onda(CAPITULOS, undefined, ruta)),
      h('section', { class: 'estudio-portada' },
        h('blockquote', { class: 'pregunta' }, articulo.pregunta),
        resumen,
        veredictos(articulo)),
    );
    return raiz;
  }

  const actual = CAPITULOS[posicion];
  const texto = h('article', { class: 'lectura' });
  const cabeza = h('header', { class: 'banda banda-capitulo' },
    h('strong', { 'aria-hidden': 'true' }, String(posicion + 1)),
    h('div', {}, h('h1', {}, actual.titulo), h('p', { class: 'banda-detalle' }, `Capítulo ${posicion + 1} de ${CAPITULOS.length}`)));
  if (actual.id === 'referencias') {
    texto.append(h('ol', { class: 'referencias' }, ...estudio.referencias.map(r =>
      h('li', {}, `${r.autores} (${r.anio}). ${r.titulo}. `, h('em', {}, r.fuente), '. ',
        r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.url) : null))));
  } else {
    const capitulo = estudio.capitulos.find(c => c.id === actual.id)!;
    texto.append(...capitulo.bloques.map(b => bloque(b, estudio.diagramas, articulo.id)));
    if (actual.id === 'anexo' && articulo.repositorio) {
      texto.append(h('p', {}, h('a', { href: articulo.repositorio, target: '_blank', rel: 'noopener' }, 'Ver el código y los datos en GitHub')));
    }
  }
  const [antes, despues] = [CAPITULOS[posicion - 1], CAPITULOS[posicion + 1]];
  texto.append(h('nav', { class: 'paso', 'aria-label': 'Capítulo anterior y siguiente' },
    antes ? h('a', { href: ruta(antes.id), class: 'boton' }, `Anterior: ${antes.titulo}`) : h('a', { href: `#/${articulo.id}/estudio`, class: 'boton' }, 'Volver al resumen'),
    despues ? h('a', { href: ruta(despues.id), class: 'boton primario' }, `Siguiente: ${despues.titulo}`) : h('a', { href: `#/${articulo.id}/antecedentes`, class: 'boton primario' }, 'Ver antecedentes')));
  formulas(texto);
  formulas(cabeza);
  raiz.append(onda(CAPITULOS, actual.id, ruta), cabeza, texto);
  return raiz;
}
