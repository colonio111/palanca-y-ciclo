// Control de tiempo de las portadas: la serie completa es el riel y puede reproducirse.
import { h, mes, s } from '../util';

export interface OpcionesTiempo {
  fechas: string[];
  valores: number[];
  /** Segunda serie escalonada (p. ej. el mínimo legal). */
  guia?: number[];
  texto: (i: number) => string;
  alCambiar: (i: number) => void;
}

export function lineaTiempo({ fechas, valores, guia, texto, alCambiar }: OpcionesTiempo) {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ultimo = valores.length - 1;
  const todos = guia ? [...valores, ...guia] : valores;
  const [min, max] = [Math.min(...todos), Math.max(...todos)];

  const px = (i: number) => (i / ultimo) * 1000;
  const py = (v: number) => 56 - ((v - min) / (max - min)) * 48;
  const camino = (v: number[]) => v.map((x, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(x).toFixed(1)}`).join('');
  const desde = fechas.indexOf('2020-03');
  const hasta = fechas.indexOf('2021-12');
  const punto = h('i', { class: 'tiempo-punto' });
  const control = h('input', { type: 'range', min: 0, max: ultimo, step: 1, value: ultimo, 'aria-label': 'Mes, de 2016 a 2025' });
  const riel = h('div', { class: 'tiempo-riel' },
    s('svg', { viewBox: '0 0 1000 64', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      s('rect', { class: 'tiempo-pandemia', x: px(desde), y: 0, width: px(hasta) - px(desde), height: 64 }),
      guia ? s('path', { class: 'tiempo-guia', d: camino(guia) }) : null,
      s('path', { class: 'tiempo-linea', d: camino(valores) })),
    h('span', { class: 'tiempo-rotulo', style: `left:${px(desde) / 10}%` }, 'Pandemia'),
    punto, control);
  const anios = h('div', { class: 'tiempo-anios', 'aria-hidden': 'true' },
    ...[...new Set(fechas.map(f => f.slice(0, 4)))].map(a => h('span', {}, a)));
  const boton = h('button', { type: 'button', class: 'boton tiempo-boton', onclick: () => (reloj ? parar() : reproducir()) }, 'Ver los diez años');
  const elemento = h('div', { class: 'tiempo' }, boton, h('div', {}, riel, anios));

  function pintar(i: number) {
    alCambiar(i);
    punto.style.left = `${px(i) / 10}%`;
    punto.style.top = `${(py(valores[i]) / 64) * 100}%`;
    control.value = String(i);
    control.setAttribute('aria-valuetext', `${mes(fechas[i])}: ${texto(i)}`);
  }

  // reproducción: se detiene si la persona toma el control o cambia de página
  let reloj = 0;
  function parar() {
    clearInterval(reloj);
    reloj = 0;
    boton.textContent = 'Ver los diez años';
  }
  function reproducir() {
    let i = 0;
    pintar(i);
    boton.textContent = 'Detener';
    reloj = window.setInterval(() => {
      if (!elemento.isConnected) return parar();
      pintar(++i);
      if (i >= ultimo) parar();
    }, 70);
  }
  control.addEventListener('input', () => {
    parar();
    pintar(Number(control.value));
  });

  pintar(ultimo);
  if (!quieto) setTimeout(() => elemento.isConnected && reproducir(), 700);
  return elemento;
}
