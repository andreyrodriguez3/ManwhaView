# PLAN.md: ManwhaView, lector flotante de manhwa para Windows

> Este documento es la fuente de verdad del proyecto. Antes de cada sesión, lee este archivo y el `CLAUDE.md`.
> Trabaja **una fase por sesión**, en Claude Desktop (local), sobre Windows.
> Al terminar una fase: marca su casilla, haz commit y push.

## Estado actual y traspaso (léelo primero)

**Hecho:** fases 0 a 3, escritas en una sesión en la nube (Linux). Todo compila, `typecheck` y `lint` pasan, y la app se ejecutó
de verdad con un Suwayomi de Linux (arranca el motor, muestra la versión, las pantallas cargan y los errores se ven).

**Sin probar (hazlo primero en Windows, antes de empezar la Fase 4):**
1. `npm install`, `npm run fetch-suwayomi` y `npm run dev`: debe verse "Iniciando motor…" y luego "Motor v2.4.2366".
   El script descarga `Suwayomi-Server-v2.4.2366-windows-x64.zip` y usa `tar` para descomprimirlo (en Windows 10+ viene incluido).
2. Ajustes → Añadir (el repo de Keiyoushi ya viene puesto) → pestaña Extensiones → "Refrescar lista" → instalar Olympus Scans, ManhwaWeb y Webtoons.
   En la nube la red bloqueó la descarga del repositorio (error 403 del motor), así que **esto no se ha probado nunca**.
3. Cerrar la app y comprobar en el Administrador de tareas que no queda ningún `java.exe` (se usa `taskkill /T /F`; no probado en Windows).
4. Si algo falla, el registro del motor está en `%APPDATA%/manwhaview/logs/suwayomi.log` (botón "Ver registro" en la app).
   Corrige el fallo antes de seguir. Si algo requiere cambiar este plan, cámbialo aquí.

**Datos fijos del entorno del usuario:**
- Repo de extensiones (el mismo de Mihon): `https://github.com/keiyoushi/extensions/raw/repo/index.pb` (constante `DEFAULT_EXTENSION_STORE` en `src/shared/ipc.ts`).
- Fuentes que le interesan: Olympus Scans, ManhwaWeb, Webtoons (inglés) y otras de Keiyoushi.
- Trabaja en español, en Claude Desktop (local, Windows), con Sonnet esfuerzo medio para ahorrar créditos. No uses la nube salvo que lo pida.
- Rama de trabajo: `main-b91vks`; el PR hacia `main` lo crea el usuario o se pide explícitamente.

**Lo que ya se verificó en el esquema real (Suwayomi v2.4.2366, `schema.graphql`):**
- Mutaciones disponibles para las próximas fases: `fetchSourceManga`, `fetchManga`, `fetchChapters`, `fetchChapterPages`, `updateManga`,
  `updateChapter(s)`, `updateMangaCategories`, `updateLibrary`, `updateLibraryManga`, `createBackup`, `restoreBackup`, `setSettings`.
- Consultas: `manga`, `mangas`, `chapter`, `chapters`, `categories`, `restoreStatus`, `sources`, `extensions`, `extensionStores`, `aboutServer`.
- Los ids de fuente son `LongString` (cadena). Para instalar/actualizar/desinstalar una extensión, el `id` es su `pkgName`.
- No inventes campos: lee el tipo en `schema.graphql`, escribe el `.graphql` y ejecuta `npm run codegen`.

**Trampas conocidas:**
- Suwayomi solo permite CORS desde `http://localhost:*`; por eso las consultas pasan por IPC (`gql()` en el renderer).
  Las imágenes (`<img>`) sí se cargan directo desde `http://127.0.0.1:<puerto>` (la CSP de `index.html` ya lo permite).
- No ejecutes `prettier --write .` sobre todo el repo: reformatea `PLAN.md`. Ya está en `.prettierignore`, pero formatea solo lo que toques.
- `schema.graphql` y `src/renderer/src/api/gql/graphql.ts` están versionados y generados; no se editan a mano.
- `onlyOperationTypes` / el plugin `typescript` de codegen duplicaban tipos: la configuración actual (solo `typescript-operations` y `typed-document-node`) es la que funciona.
- Ajustes del motor: por propiedades de Java (`-Dsuwayomi.tachidesk.config.server.*`), no por `server.conf`.

## Idea

Un "Mihon de escritorio": una app de Windows para leer manhwa/manga desde las mismas fuentes que el usuario
usa en Mihon (Olympus Scans, ManhwaWeb, Webtoons…), sin abrir el navegador.
Es una **ventana flotante** que puede quedarse encima de lo que el usuario esté haciendo mientras trabaja.

## Decisiones tomadas (no volver a discutirlas)

| Tema | Decisión |
|---|---|
| Motor de fuentes | **Suwayomi-Server**: ejecuta las mismas extensiones de Mihon (el mismo repo de extensiones). No se escriben scrapers propios. |
| App de escritorio | **Electron** + electron-vite + React + TypeScript. No Tauri: el modo fantasma necesita `setIgnoreMouseEvents(true, {forward:true})`. |
| Datos/API | API GraphQL de Suwayomi. Tipos generados con graphql-codegen. Peticiones con TanStack Query. |
| Estado de la interfaz | Zustand. Ajustes persistentes con electron-store. |
| Sincronización con el teléfono | **Copias de seguridad Mihon (.tachibk)** en ambos sentidos, de forma manual. Sin sincronización automática en la v1. |
| Idioma de la interfaz | Español. |
| Instalador | electron-builder (NSIS .exe), con Suwayomi y Java incluidos. Sin actualizaciones automáticas en la v1. |

## Requisitos del usuario (de la conversación)

- **Ventana redimensionable a voluntad:** el usuario decide el tamaño arrastrando bordes y esquinas, desde una tira pequeña hasta pantalla completa.
  Tamaño mínimo aproximado de 260×320. Se recuerdan tamaño y posición.
- **Fijada (📌):** siempre encima y **no se puede minimizar**.
  Si está desfijada, se comporta como una ventana normal y sí se puede minimizar.
- **Modo fantasma (👻):** los clics atraviesan la ventana y solo queda el scroll.
  Implementación aprobada: una franja/asa en el borde derecho que reacciona al ratón (detalle en la Fase 7).
- **Auto-scroll** con un botón para activarlo o desactivarlo, y velocidad ajustable.
- **Atajos globales** de teclado.
- **Buscar manhwas nuevos** en las fuentes (por ejemplo en Olympus) y añadirlos a la biblioteca.
- **Iniciar con Windows** (oculta en la bandeja del sistema).
- Fuera de la v1: notificaciones de capítulos nuevos, descargas offline, sincronización con AniList/MAL.

## Arquitectura

```
ManwhaView (Electron)
 ├─ main/       proceso principal: ventana, bandeja, atajos, arranque de Suwayomi, IPC
 ├─ preload/    contextBridge: API segura y tipada para la interfaz
 └─ renderer/   React: Biblioteca · Buscar · Detalle · Lector · Ajustes
        │  HTTP/GraphQL → http://127.0.0.1:<puerto>/api/graphql
        ▼
Suwayomi-Server (proceso hijo, Java incluido, datos en %APPDATA%/ManwhaView/suwayomi)
        │  extensiones de Mihon desde el repo que configure el usuario
        ▼
Fuentes (Olympus, ManhwaWeb, Webtoons, …)
```

Estructura de carpetas prevista:

```
src/main/index.ts          arranque, ciclo de vida, instancia única
src/main/window.ts         ventana flotante, fijar/fantasma/opacidad, guardar posición y tamaño
src/main/suwayomi.ts       descarga/arranque/parada del servidor, puerto, health check
src/main/tray.ts           bandeja del sistema
src/main/shortcuts.ts      atajos globales
src/main/settings.ts       electron-store (esquema tipado)
src/preload/index.ts       window.api (tipado en src/shared/ipc.ts)
src/shared/ipc.ts          nombres de canales y tipos compartidos
src/renderer/src/api/      cliente GraphQL, consultas .graphql y tipos generados
src/renderer/src/routes/   Library, Browse, Search, Manga, Reader, Settings
src/renderer/src/components/
scripts/fetch-suwayomi.mjs descarga de Suwayomi (versión fija)
resources/suwayomi/        (ignorado por git) binarios de Suwayomi
```

Seguridad de Electron: `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true` en la interfaz.
Todo acceso al sistema pasa por el preload. El servidor solo escucha en `127.0.0.1`.

---

## Fases

### [x] Fase 0: Limpieza y base
- Borra el prototipo anterior: `index.html`, `style.css`, `app.js` y `.github/workflows/pages.yml`.
- Crea el proyecto con electron-vite (plantilla react-ts). Añade ESLint, Prettier y `.gitignore` (node_modules, out, dist, resources/suwayomi).
- Crea `CLAUDE.md` con: los comandos (`npm run dev`, `build`, `lint`, `typecheck`, `dist`), la estructura, el enlace a este PLAN y las reglas:
  - Interfaz en español.
  - No inventar campos de GraphQL: usar `schema.graphql`.
  - Una fase por sesión.
- Actualiza `README.md`.
- **Listo cuando:** `npm run dev` abre una ventana con "ManwhaView" y pasan `lint` y `typecheck`.

### [x] Fase 1: Suwayomi como proceso hijo
- `scripts/fetch-suwayomi.mjs`:
  - Descarga una **versión fija** (constante en el script) del release de Suwayomi-Server para Windows x64 que trae Java.
  - Lo descomprime en `resources/suwayomi/`. Si ya existe, no hace nada.
  - Antes de fijar la versión, mira los releases de `github.com/Suwayomi/Suwayomi-Server` y elige la última estable.
- `src/main/suwayomi.ts`:
  - Busca un puerto libre, empezando por el 4567.
  - Usa como directorio raíz de datos `app.getPath('userData')/suwayomi`.
  - (Implementado) En vez de editar `server.conf`, pasa los ajustes como propiedades Java `-Dsuwayomi.tachidesk.config.server.<ajuste>=<valor>`:
    - `server.ip = "127.0.0.1"` y el puerto elegido.
    - Bandeja de Suwayomi desactivada.
    - No abrir el navegador al arrancar.
    - No usar la web propia de Suwayomi.
  - Lanza el Java incluido con `-Xmx512m -jar Suwayomi-Server.jar` (con el argumento de directorio raíz que corresponda a esa versión).
  - Health check: consulta GraphQL `aboutServer` (o el campo equivalente del esquema) cada 500 ms, hasta 60 s.
  - Guarda los logs en `userData/logs/suwayomi.log`.
  - Al salir de la app (`before-quit`), cierra todo el árbol de procesos: en Windows, `taskkill /pid <pid> /T /F`.
  - En desarrollo, si existe la variable `SUWAYOMI_URL`, se usa ese servidor externo y no se arranca ninguno.
- Interfaz: pantalla "Iniciando motor…" con spinner. Si falla, muestra el error, un botón "Reintentar" y la ruta del log.
- **Listo cuando:** al abrir la app se ve la versión de Suwayomi en la interfaz, y al cerrarla no queda ningún `java.exe` vivo.

### [x] Fase 2: Cliente GraphQL tipado
- `npm run schema`: descarga el esquema del servidor en marcha a `schema.graphql` y lo versiona en git.
- graphql-codegen (client preset) genera los tipos y las consultas tipadas en `src/renderer/src/api/gql/`.
- El cliente apunta a la URL que da el proceso principal por IPC (`api.getServerUrl()`).
- Las imágenes (portadas, páginas) se cargan con la URL absoluta del servidor + la ruta que devuelve la API.
- **Regla:** toda consulta o mutación se escribe según `schema.graphql`. Si algo no existe en el esquema, no se inventa.

### [x] Fase 3: Extensiones
> Nota: en Suwayomi v2.4 `extensionRepos` está obsoleto; se usan las mutaciones `addExtensionStore`/`removeExtensionStore` y después `fetchExtensions`. Se acepta `index.pb`.
> **Pendiente de probar en Windows:** instalar de verdad Olympus/ManhwaWeb/Webtoons (en la sesión de desarrollo la red bloqueó la descarga del repositorio).
- Ajustes → "Repositorios de extensiones": un campo para pegar la URL del repo (la misma que usa el usuario en Mihon) y guardarla en los ajustes del servidor.
- Pantalla Extensiones:
  - Botón para refrescar la lista.
  - Filtros por idioma (es/en/todos) e instaladas, disponibles o con actualización.
  - Botones Instalar, Actualizar y Desinstalar, con icono y versión de cada una.
- **Listo cuando:** se pueden instalar Olympus Scans, ManhwaWeb y Webtoons, y aparecen sus fuentes.

### [ ] Fase 4: Explorar y búsqueda global
- **Explorar:** lista de fuentes instaladas, con Populares, Recientes y Buscar dentro de cada una (scroll infinito).
- **Búsqueda global:**
  - Un buscador que consulta todas las fuentes marcadas (por defecto las instaladas en es/en), como mucho 3 a la vez.
  - Resultados agrupados por fuente en filas horizontales; cada fila carga por su cuenta y muestra su propio error.
- **Detalle del manga:**
  - Portada, título, autor, estado, géneros y sinopsis.
  - Lista de capítulos con sus estados (leído/no leído), ordenable.
  - Botones "Añadir/Quitar de biblioteca", "Continuar/Empezar" y "Abrir en el navegador".
  - Al abrir el detalle, pide a la fuente los datos y capítulos actualizados.

### [ ] Fase 5: Biblioteca
- Cuadrícula de portadas con un número de capítulos sin leer.
- Pestañas por categoría (vienen del backup de Mihon), un filtro de texto y orden por: última lectura, sin leer o A-Z.
- Clic en una portada abre el detalle. Botón **Continuar** en cada tarjeta (al pasar el ratón) que abre directo el siguiente capítulo sin leer.
- Botón "Buscar capítulos nuevos": lanza la actualización de la biblioteca en Suwayomi y muestra el progreso.
- Tamaño de la cuadrícula adaptable: con la ventana estrecha, 2 columnas.

### [ ] Fase 6: Lector
- Modos de lectura:
  - **Vertical continuo** (webtoon), por defecto.
  - **Paginado** (izquierda a derecha o derecha a izquierda), opcional. Se guarda por manga.
- Ancho: "ajustar a la ventana", o un % fijo. Zoom con Ctrl + rueda.
- Rendimiento: las imágenes cargan al llegar a ellas y se precargan las 3 siguientes. Muestra un placeholder con altura estimada para que la página no salte.
- Progreso:
  - Guarda la última página leída (con debounce).
  - Marca el capítulo como leído al llegar al final.
  - Al acabar, enlaza el siguiente capítulo sin cortes; en vertical, puede cargarlo debajo automáticamente.
- **Auto-scroll:** botón ▶/⏸ en la barra del lector, barra de velocidad (px/s) y atajo propio. Se pausa si el usuario hace scroll a mano y se reanuda después de 2 s.
- Teclado: ↑/↓, Espacio/Shift+Espacio, AvPág/RePág, ←/→ (capítulo anterior o siguiente).
- Barra del lector: título y capítulo, menú de capítulos, modo y auto-scroll. Se oculta sola mientras se lee.

### [ ] Fase 7: Ventana flotante (lo más importante)
- `BrowserWindow` con `frame: false`, `transparent: false`, redimensionable y `minWidth: 260`, `minHeight: 320`. Barra de título propia en React (`-webkit-app-region: drag`).
- **Tamaño libre:** se arrastran bordes y esquinas. Se guardan los límites (posición y tamaño) al moverla o redimensionarla (con debounce).
  Al arrancar, si esos límites quedan fuera de los monitores conectados, la ventana se recoloca en el monitor principal.
- Barra de título: **📌 Fijar · 👻 Fantasma · control de opacidad (30–100%) · ➖ Minimizar · ✕ Cerrar**.
- **Fijada:**
  - `setAlwaysOnTop(true, 'screen-saver')` y `setMinimizable(false)`.
  - Se oculta el botón ➖.
  - Si llega un evento `minimize` (por ejemplo con Win+D), restaura la ventana.
- **Desfijada:** `setAlwaysOnTop(false)`, `setMinimizable(true)` y ➖ visible.
- **Modo fantasma:**
  1. Al activarlo se fija la ventana automáticamente, se aplica la opacidad "fantasma" (60% por defecto, configurable) y se llama `win.setIgnoreMouseEvents(true, { forward: true })`.
  2. La interfaz muestra un **asa** de unos 24 px en el borde derecho (y la barra del lector se oculta).
  3. Gracias a `forward: true`, la interfaz recibe `mousemove`. Al entrar en el asa, la interfaz avisa por IPC y el proceso principal llama `setIgnoreMouseEvents(false)`. Mientras el ratón está en el asa, la rueda hace scroll del lector y se puede pulsar el botón 👻 para salir del modo.
  4. Al salir del asa, se vuelve a `setIgnoreMouseEvents(true, {forward:true})`.
  5. Prueba a fondo que la rueda responda al instante al entrar en el asa. Si no responde bien, ajusta (asa más ancha, pequeño retraso).
  6. Los atajos globales siguen funcionando para hacer scroll sin tocar la ventana.
- **Atajos globales** (`globalShortcut`, configurables en Ajustes; si `register` devuelve false, la app avisa de que ya están en uso):
  - `Ctrl+Alt+M`: mostrar/ocultar la ventana.
  - `Ctrl+Alt+G`: modo fantasma sí/no.
  - `Ctrl+Alt+P`: fijar/desfijar.
  - `Ctrl+Alt+↑` / `Ctrl+Alt+↓`: scroll del lector.
  - `Ctrl+Alt+Espacio`: auto-scroll sí/no.
- Se recuerdan entre sesiones: tamaño, posición, opacidad, fijada y modo fantasma (al arrancar, el fantasma empieza **desactivado** por seguridad).

### [ ] Fase 8: Bandeja e inicio con Windows
- Icono en la bandeja con menú: Mostrar/Ocultar · Fijar · Modo fantasma · ✓ Iniciar con Windows · Salir. Doble clic = mostrar.
- ✕ esconde la app en la bandeja (la primera vez avisa con una notificación). "Salir" cierra todo, Suwayomi incluido.
- "Iniciar con Windows" usa `app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] })`. Con `--hidden`, la app arranca solo en la bandeja.
- Instancia única con `app.requestSingleInstanceLock()`: si se abre una segunda copia, se muestra la ventana existente.

### [ ] Fase 9: Copias de seguridad Mihon ↔ PC
- **Importar:**
  - Selector de archivo `.tachibk` y validación previa, si el esquema la ofrece.
  - Restauración con progreso y resumen al terminar (cuántos manga, cuáles fallaron).
  - Aviso antes de restaurar: "Instala primero las extensiones de tus fuentes".
- **Exportar:** crea la copia en Suwayomi y la guarda con el diálogo de guardar como `ManwhaView_AAAA-MM-DD.tachibk`.
- Una mini guía en la interfaz:
  - Mihon → Ajustes → Datos y almacenamiento → Crear copia de seguridad.
  - Pasar el archivo a la PC (Drive, cable, etc.).
  - En sentido contrario: Mihon → Restaurar.
- Prueba un viaje completo teléfono → PC → teléfono y anota en el README qué se conserva (biblioteca, categorías, capítulos leídos) y qué no.

### [ ] Fase 10: Instalador
- electron-builder NSIS para Windows x64, con `resources/suwayomi` como `extraResources`. Icono propio.
- Script `npm run dist`: ejecuta `fetch-suwayomi` y después el build.
- En el README: cómo instalar y el aviso de SmartScreen (app sin firmar → "Más información" → "Ejecutar de todas formas").
- Prueba el instalador en limpio: instalar, primer arranque, extensiones, leer, cerrar sin que quede ningún java.exe, desinstalar.

---

## Riesgos y notas
- **Cloudflare:** algunas fuentes lo usan. Suwayomi admite FlareSolverr; queda fuera de la v1 y se documenta si aparece.
- **RAM:** Java usa unos 300–500 MB. `-Xmx512m` como límite (se puede ajustar en Ajustes más adelante).
- **API de Suwayomi:** cambia entre versiones. Por eso la versión está fija y los tipos se generan del esquema.
- **Modo fantasma:** es la parte más delicada. Hay que probarlo de verdad en Windows con varios programas detrás.
- **Contenido:** la app no incluye ni distribuye extensiones ni contenido. El usuario configura su propio repo de extensiones.

## Ideas para después de la v1
Notificaciones de capítulos nuevos · descargas offline · sincronización con AniList/MAL · FlareSolverr ·
temas de color · estadísticas de lectura.
