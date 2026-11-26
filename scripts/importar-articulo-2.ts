// Genera content/articulo-2 y public/articulo-2 a partir de los entregables originales.
// Uso: npm run importar:a2
import { num, preparar } from './importar-comun.ts';

const { csv, guardar, datosProcesados, documentos } = preparar({
  id: 'articulo-2',
  variable: 'FUENTE_ARTICULO_2',
  comas: true,
  capitulos: [
    ['introduccion', 'Introducción', 'Introducción'],
    ['antecedentes', 'Antecedentes', 'Marco teórico'],
    ['metodos', 'Materiales y métodos', 'Materiales y métodos'],
    ['resultados', 'Resultados', 'Resultados'],
    ['discusion', 'Discusión', 'Discusión'],
    ['conclusiones', 'Conclusiones', 'Conclusiones'],
    ['declaracion-ia', 'Declaración sobre el uso de inteligencia artificial', 'Uso de IA'],
    ['anexo', 'Anexo A. Datos y código', 'Datos y código'],
    ['figuras', 'Anexo B. Figuras complementarias', 'Más figuras'],
  ],
  ecuaciones: {
    'eq-excedente': String.raw`E_{it} = \text{RCG}_{it} - \text{LG}_t`,
    'eq-h1': String.raw`\Delta_{12} \ln C_{it} = \alpha_i + \tau_t + \beta\, E_{i,t-12} + \boldsymbol{\delta}^{\top} \mathbf{X}_{i,t-12} + \varepsilon_{it}`,
    'eq-h2': String.raw`\begin{aligned} \ln C_{i,t+h} - \ln C_{i,t-1} = \; & \alpha_i^h + \tau_t^h + \phi_h (\Delta r_t \times \tilde{E}_{i,t-1}) \\ & + \kappa_h \tilde{E}_{i,t-1} + \boldsymbol{\delta}_h^{\top} \mathbf{X}_{i,t-1} + \varepsilon_{i,t+h} \end{aligned}`,
    'eq-h3': String.raw`y_{it} = \alpha_i + \tau_t + \theta\, (B_i \times \text{Post}_t) + \varepsilon_{it}`,
    'eq-h4': String.raw`\Delta \ln \text{RCG} = \Delta \ln \text{PE} - \Delta \ln (\text{APR}/A) - \Delta \ln A`,
  },
  ejes: {
    'Requisitos y oferta de crédito': [1, 2, 3, 10],
    'Holgura sobre los colchones': [4, 5],
    'Ajuste ante más requisitos': [6, 7],
    'Capital y política monetaria': [8, 9],
  },
  flujo: [
    { paso: 'API REST del BCRP', archivo: '01_extraccion_api.py', detalle: '6 series mensuales (tasa de referencia, TAMN, TIPMN, IPC, PBI, crédito), 2010–2025.' },
    { paso: 'Descarga programática de la SBS', archivo: '02_scraping_web.py', detalle: '360 reportes B-2201, B-2401 y B-2402, con tres formatos del reporte de capital.' },
    { paso: 'Integración y limpieza', archivo: '03_limpieza_datos.py', detalle: 'Llave entidad y fecha; límite global de cada mes; 15 bancos × 120 meses; huella SHA-256.' },
    { paso: 'Análisis', archivo: '04_analisis.py', detalle: 'Efectos fijos con errores de Driscoll–Kraay, proyecciones locales, estudio de eventos y descomposición del ratio.' },
  ],
});

// ---------------------------------------------------------------- datos del panel
const opcional = (s: string) => (s === '' ? null : num(s));
const [cab, ...filas] = datosProcesados();
const col = (n: string) => {
  const i = cab.indexOf(n);
  if (i < 0) throw new Error(`Falta la columna ${n}`);
  return i;
};
const fechas = [...new Set(filas.map(f => f[col('fecha')]))].sort();

interface Serie { capital: number[]; excedente: number[]; densidad: number[]; activo: number[]; credito: number[] }
const bancos: Record<string, Serie> = {};
for (const f of filas) {
  const t = fechas.indexOf(f[col('fecha')]);
  const b = (bancos[f[col('entidad')]] ??= { capital: [], excedente: [], densidad: [], activo: [], credito: [] });
  b.capital[t] = num(f[col('ratio_capital_global')]);
  b.excedente[t] = num(f[col('excedente_capital')]);
  b.densidad[t] = num(f[col('densidad_apr')]);
  b.activo[t] = num(f[col('activo_total')]);
  b.credito[t] = num(f[col('credito_real')]);
}
const lista = Object.entries(bancos)
  .map(([nombre, { credito, ...s }]) => ({
    nombre,
    ...s,
    // variación a 12 meses del log del crédito real, como en el artículo
    crecimiento: credito.map((v, i) => (i < 12 ? null : num(100 * Math.log(v / credito[i - 12])))),
  }))
  .sort((a, b) => b.activo[b.activo.length - 1] - a.activo[a.activo.length - 1]);

const [cabS, ...serie] = csv('serie_sistema.csv');
const columna = (n: string) => {
  const i = cabS.indexOf(n);
  if (i < 0) throw new Error(`serie_sistema.csv: falta ${n}`);
  return serie.map(f => opcional(f[i]));
};
if (serie.length !== fechas.length) throw new Error('La serie del sistema no cubre el mismo periodo que el panel.');

const [, ...h2] = csv('tabla_h2_proyecciones.csv');
// la tabla trae el coeficiente por punto y ya multiplicado por una desviación estándar del excedente
const proyecciones = h2.map(f => {
  const [h, , , , dif, ee, , t90, , porDe] = f.map(Number);
  const de = porDe / dif;
  return { h, coef: num(porDe), inferior: num(porDe - t90 * ee * de), superior: num(porDe + t90 * ee * de) };
});

const [, ...h4] = csv('tabla_h4_descomposicion.csv');
const descomposicion = h4.map(f => ({
  periodo: f[0], grupo: f[1], inicial: num(f[2]), final: num(f[3]), total: num(f[4]),
  capital: num(f[5]), densidad: num(f[6]), tamano: num(f[7]), credito: num(f[8]),
}));

guardar('panel.json', {
  fechas,
  observaciones: filas.length,
  bancos: lista,
  sistema: {
    capital: columna('ratio_capital_global'),
    cet1: columna('ratio_cet1'),
    limite: columna('limite_global'),
    excedente: columna('excedente_sistema'),
    densidad: columna('densidad_apr'),
    crecimiento: columna('crec_credito'),
    tasa: columna('tasa_referencia'),
    tamn: columna('tamn'),
    tipmn: columna('tipmn'),
  },
  proyecciones,
  descomposicion,
});
console.log(`panel: ${lista.length} bancos, ${fechas.length} meses, ${filas.length} filas`);

documentos();
