// Descargas, acerca de y página no encontrada.
import { autora, type Articulo } from '../articulos';
import { h, icono, ICONOS } from '../util';

export function vistaDescargas(articulo: Articulo): HTMLElement {
  const docs = [
    ['Artículo completo', 'El manuscrito con tablas, figuras y anexos.', 'articulo.pdf'],
    ['Diapositivas', 'La presentación para exponer la investigación.', 'diapositivas.pdf'],
    ['Póster', 'La investigación en una sola lámina.', 'poster.pdf'],
  ];
  return h('div', { class: 'columna' },
    h('h1', {}, 'Descargas'),
    h('p', { class: 'entrada' }, articulo.titulo),
    h('ul', { class: 'documentos' }, ...docs.map(([t, d, archivo]) =>
      h('li', {},
        icono(ICONOS.documento),
        h('div', {}, h('h2', {}, t), h('p', {}, d)),
        h('div', { class: 'acciones' },
          h('a', { class: 'boton', href: `${articulo.id}/documentos/${archivo}`, target: '_blank' }, 'Abrir'),
          h('a', { class: 'boton primario', href: `${articulo.id}/documentos/${archivo}`, download: `${articulo.descargas}_${archivo}` }, icono(ICONOS.descargar), 'Descargar'))))),
    h('p', {}, 'Los pósters de cada estudio revisado están en ', h('a', { href: `#/${articulo.id}/antecedentes` }, 'Antecedentes'), '.',
      articulo.repositorio ? h('span', {}, ' El código y los datos están en ', h('a', { href: articulo.repositorio, target: '_blank', rel: 'noopener' }, 'GitHub'), '.') : null));
}

export function vistaAcerca(): HTMLElement {
  const a = autora;
  return h('div', { class: 'columna' },
    h('h1', {}, 'Acerca de'),
    h('p', { class: 'entrada' }, `${a.nombre} desarrolla estas investigaciones en el curso ${a.curso} de la ${a.facultad}.`),
    h('dl', { class: 'ficha-autora' }, ...([
      ['Autora', a.nombre], ['Universidad', `${a.universidad}, ${a.ciudad}`], ['Facultad', a.facultad],
      ['Curso', `${a.curso}, ${a.periodo}`], ['Docente', a.docente],
    ] as const).map(([t, v]) => h('div', {}, h('dt', {}, t), h('dd', {}, v))),
      h('div', {}, h('dt', {}, 'Correo'), h('dd', {}, h('a', { href: `mailto:${a.correo}` }, a.correo)))),
    h('div', { class: 'logos' },
      h('img', { src: 'logos/logo_uncp.png', alt: 'Universidad Nacional del Centro del Perú' }),
      h('img', { src: 'logos/logo_economia.png', alt: 'Facultad de Economía' })));
}

export function vistaNoEncontrada(): HTMLElement {
  return h('div', { class: 'columna' },
    h('h1', {}, 'Esta página no existe'),
    h('p', {}, 'El enlace puede estar incompleto o haber cambiado.'),
    h('a', { class: 'boton primario', href: '#/' }, 'Ir al inicio'));
}
