// Genera content/articulo-1 y public/articulo-1 a partir de los entregables originales.
// Uso: npm run importar:a1
import { num, preparar } from './importar-comun.ts';

const CAPITULOS: [string, string, string][] = [
  ['introduccion', 'Introducción', 'Introducción'],
  ['antecedentes', 'Antecedentes', 'Marco teórico'],
  ['metodos', 'Materiales y métodos', 'Materiales y métodos'],
  ['resultados', 'Resultados', 'Resultados'],
  ['discusion', 'Discusión', 'Discusión'],
  ['conclusiones', 'Conclusiones', 'Conclusiones'],
  ['declaracion-ia', 'Declaración sobre el uso de inteligencia artificial', 'Uso de IA'],
  ['anexo', 'Anexo A. Datos y código', 'Datos y código'],
];
const ECUACIONES: Record<string, string> = {
  'eq-hamilton': String.raw`y_{t+h} = \beta_0 + \sum_{j=1}^{p} \beta_j\, y_{t-j+1} + v_{t+h}`,
  'eq-prociclicidad': String.raw`\Delta \ln L_{it} = \alpha_i + \beta\, \Delta \ln A_{it} + \boldsymbol{\delta}^{\top} \mathbf{X}_{i,t-1} + \varepsilon_{it}`,
  'eq-dinamico': String.raw`\ln L_{it} = \rho \ln L_{i,t-1} + \gamma_1 BC_t + \gamma_2 BY_t + \theta r_t + \boldsymbol{\delta}^{\top} \mathbf{X}_{i,t-1} + \mu_i + \varepsilon_{it}`,
  'eq-doce': String.raw`\Delta_{12} \ln L_{it} = \alpha_i + \gamma_1 BC_t + \gamma_2 BY_t + \theta r_t + \phi P_t + \boldsymbol{\delta}^{\top} \mathbf{X}_{i,t-12} + \varepsilon_{it}`,
};

const EJES: Record<string, number[]> = {
  'Colchones y provisiones': [1, 2, 3, 4, 5, 6, 19],
  'Ciclo del crédito': [7, 8, 9, 10],
  'Política macroprudencial y monetaria': [11, 12, 13, 14, 15, 16, 20],
  'Riesgo y evidencia regional': [17, 18],
};
const { csv, guardar, datosProcesados, documentos } = preparar({
  id: 'articulo-1',
  variable: 'FUENTE_ARTICULO_1',
  capitulos: CAPITULOS,
  ecuaciones: ECUACIONES,
  ejes: EJES,
  mecanismo: [
    'Choque favorable: suben el precio de los activos y la demanda de crédito.',
    'El activo del banco crece; el patrimonio casi no se mueve.',
    'La expansión se financia con deuda: el apalancamiento sube.',
    'Mayor oferta de crédito.',
    'Más actividad y precios de los activos más altos.',
  ],
  flujo: [
    { paso: 'API REST del BCRP', archivo: '01_extraccion_api.py', detalle: '4 series mensuales (crédito, PBI, tasa de referencia, IPC), 2010–2025.' },
    { paso: 'Descarga programática de la SBS', archivo: '02_scraping_web.py', detalle: '360 reportes B-2201, B-2401 y B-2402; nombres de bancos armonizados.' },
    { paso: 'Integración y limpieza', archivo: '03_limpieza_datos.py', detalle: 'Llave entidad y fecha; 15 bancos × 120 meses; huella SHA-256.' },
    { paso: 'Análisis', archivo: '04_analisis.py', detalle: 'Filtro de Hamilton, efectos fijos con errores de Driscoll–Kraay, raíz unitaria y System GMM.' },
  ],
});

// ---------------------------------------------------------------- datos del panel
{
  const [cab, ...filas] = datosProcesados();
  const col = (n: string) => {
    const i = cab.indexOf(n);
    if (i < 0) throw new Error(`Falta la columna ${n}`);
    return i;
  };
  const fechas = [...new Set(filas.map(f => f[col('fecha')]))].sort();
  const bancos: Record<string, { apalancamiento: number[]; capital: number[]; morosidad: number[]; activo: number[] }> = {};
  const sistema = fechas.map(() => ({ activo: 0, patrimonio: 0 }));
  for (const f of filas) {
    const t = fechas.indexOf(f[col('fecha')]);
    const b = (bancos[f[col('entidad')]] ??= { apalancamiento: [], capital: [], morosidad: [], activo: [] });
    b.apalancamiento[t] = num(f[col('apalancamiento_w')]);
    b.capital[t] = num(f[col('ratio_capital_global')]);
    b.morosidad[t] = num(f[col('morosidad')]);
    b.activo[t] = num(f[col('activo_total')]);
    sistema[t].activo += Number(f[col('activo_total')]);
    sistema[t].patrimonio += Number(f[col('patrimonio')]);
  }
  const [, ...brechas] = csv('brechas_ciclo.csv');
  const [, ...movil] = csv('beta_movil.csv');
  const lista = Object.entries(bancos)
    .map(([nombre, s]) => ({ nombre, ...s }))
    .sort((a, b) => b.activo[b.activo.length - 1] - a.activo[a.activo.length - 1]);
  guardar('panel.json', {
    fechas,
    observaciones: filas.length,
    bancos: lista,
    sistema: sistema.map(s => num(s.activo / s.patrimonio)),
    brechas: {
      fechas: brechas.map(f => f[0]),
      credito: brechas.map(f => num(f[3])),
      pbi: brechas.map(f => num(f[6])),
      tasa: brechas.map(f => num(f[7])),
    },
    betaMovil: {
      fechas: movil.map(f => f[0]),
      beta: movil.map(f => num(f[1])),
      inferior: movil.map(f => num(f[2])),
      superior: movil.map(f => num(f[3])),
    },
  });
  console.log(`panel: ${lista.length} bancos, ${fechas.length} meses, ${filas.length} filas`);
  console.log(`sistema: ${(sistema[0].activo / sistema[0].patrimonio).toFixed(2)} → ${(sistema.at(-1)!.activo / sistema.at(-1)!.patrimonio).toFixed(2)} veces`);
}

documentos();
