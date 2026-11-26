# Palanca y ciclo

Sitio de las investigaciones de finanzas de Lucía Pamela Colonio Yaringaño
(Facultad de Economía, UNCP).

## Usar

```bash
npm install
npm run dev       # desarrollo
npm run build     # versión publicable en dist/
npm run preview   # revisar dist/
```

## Estructura

| Carpeta | Contenido |
|---|---|
| `content/` | Datos y textos que muestra el sitio |
| `public/` | PDF, figuras y logos |
| `scripts/` | Importadores desde los entregables originales |
| `src/` | Vistas, componentes y estilos |

## Actualizar los artículos

`content/articulo-N` y `public/articulo-N` se **generan**: no se editan a mano.
Copia `.env.example` como `.env.local`, indica las carpetas de entregables y ejecuta:

```bash
npm run importar:a1
npm run importar:a2
```

Lo común a los dos está en `scripts/importar-comun.ts`.

Las cifras destacadas, las hipótesis y los enlaces a GitHub se escriben en
`content/articulos.json`. Algunas cifras de texto están en `src/views/panel.ts`,
`panel-capital.ts` e `inicio-capital.ts`: si cambian los resultados, revísalas.
Si un artículo no tiene enlace en `repositorio`, sus botones de GitHub se ocultan.

No se publican los trabajos de terceros: cada antecedente enlaza a su fuente.

## Publicar

GitHub Pages sirve la rama `gh-pages`, que contiene la carpeta `dist/` compilada.
Después de cambiar algo: `npm run build` y subir el contenido de `dist/` a esa rama
(subir `main` no actualiza el sitio por sí solo).
