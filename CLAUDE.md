# ManwhaView

Lector flotante de manhwa/manga para Windows: ventana siempre encima, modo fantasma, atajos globales.
Usa **Suwayomi-Server** como motor (las mismas extensiones de Mihon) y **Electron + React + TypeScript** como app.

**Fuente de verdad del proyecto: `PLAN.md`** (decisiones, fases y criterios de "listo"). Léelo antes de empezar.

## Reglas

- Interfaz y textos para el usuario **en español**.
- **Una fase del plan por sesión**; al terminar, marca su casilla en `PLAN.md`, commit y push.
- **No inventes campos de GraphQL.** Escribe las consultas en `src/renderer/src/api/documents/*.graphql`
  según `schema.graphql` y ejecuta `npm run codegen`. Si cambias de versión de Suwayomi, ejecuta `npm run schema` (con el motor en marcha).
- La interfaz no habla con el motor directamente: todo pasa por el proceso principal (IPC) porque el servidor
  no permite CORS desde `file://`. Usa `gql()` de `src/renderer/src/api/client.ts`.
- Seguridad de Electron: `contextIsolation`, `sandbox` y sin `nodeIntegration`. El preload solo importa `electron`.
- El archivo generado `src/renderer/src/api/gql/graphql.ts` y `schema.graphql` se versionan; no se editan a mano.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm run fetch-suwayomi` | Descarga Suwayomi (con Java) a `resources/suwayomi/` (versión fija en el script) |
| `npm run dev` | Arranca la app en desarrollo |
| `npm run typecheck` / `npm run lint` | Comprobaciones (obligatorias antes de cada commit) |
| `npm run codegen` | Genera tipos a partir de `schema.graphql` + documentos |
| `npm run schema` | Descarga el esquema de un Suwayomi en marcha (`SUWAYOMI_URL`, por defecto `http://127.0.0.1:4567`) |
| `npm run build` | Typecheck + compilación |
| `npm run dist` | Genera el instalador `.exe` (Fase 10) |

Variables útiles: `SUWAYOMI_URL` (usar un servidor ya en marcha, no arranca otro), `SUWAYOMI_DIR` (carpeta del motor).

## Estructura

```
src/main/        proceso principal (suwayomi.ts = arranque/parada del motor, index.ts = ventana e IPC)
src/preload/     API segura para la interfaz (window.api)
src/shared/      canales IPC y tipos compartidos
src/renderer/    React (routes/, hooks/, api/)
scripts/         fetch-suwayomi.mjs, fetch-schema.mjs
resources/       icono; resources/suwayomi/ (ignorado por git)
```

## Notas del motor (Suwayomi v2.4.x)

- Ajustes por propiedades de Java: `-Dsuwayomi.tachidesk.config.server.<ajuste>=<valor>` (no se edita `server.conf`).
- Los repositorios se gestionan con las mutaciones `addExtensionStore` / `removeExtensionStore` (`extensionRepos` está obsoleto).
  Se acepta tanto `index.pb` como `index.min.json`.
- Tras añadir un repositorio hay que ejecutar `fetchExtensions` para cargar su lista.
