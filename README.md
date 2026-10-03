# ManwhaView

Un "Mihon de escritorio": lector de manhwa/manga para Windows que se queda flotando encima de lo que estés haciendo.
Usa [Suwayomi-Server](https://github.com/Suwayomi/Suwayomi-Server) como motor, así que funcionan las mismas extensiones que en Mihon.

Estado: v0.1 completa (fases 0-10 de `PLAN.md`).

## Instalar

1. Ejecuta `manwhaview-0.1.0-setup.exe` (instalador de unos 300 MB; incluye el motor y Java).
2. **SmartScreen:** la app no está firmada, así que Windows avisará. Pulsa **Más información → Ejecutar de todas formas**.
3. Al abrirla, ve a **Ajustes** y añade el repositorio de extensiones (el de Keiyoushi ya viene puesto; pulsa **Añadir**),
   luego **Extensiones → Refrescar lista** e instala las fuentes que uses.

## Uso rápido

- **📌 Fijar:** la ventana queda siempre encima y no se puede minimizar.
- **👻 Modo fantasma:** los clics atraviesan la ventana. Para volver: `Ctrl+Alt+G`, o la franja morada del borde derecho
  (ahí la rueda sigue haciendo scroll), o el menú de la bandeja.
- **Esc** en el lector vuelve a la ficha de la obra.
- **✕** esconde la app en la bandeja; **Salir** (bandeja o Ajustes) la cierra del todo, motor incluido.
- Atajos globales (configurables en Ajustes): `Ctrl+Alt+M` mostrar/ocultar, `G` fantasma, `P` fijar,
  `↑`/`↓` scroll, `Espacio` auto-scroll. Si otra aplicación ya usa uno, Ajustes lo avisa y puedes cambiarlo.

## Seguimiento (AniList, MyAnimeList…)

Ajustes → Seguimiento → **Iniciar sesión**: se abre tu navegador para autorizar y luego pegas aquí la URL a la que te
redirige. Después, en la ficha de cada obra, **Vincular** la busca en el servicio; al terminar un capítulo el progreso se
sincroniza solo. Servicios con usuario y contraseña (Kitsu) aún no están soportados. **No probado con una cuenta real.**

## Copias de seguridad Mihon ↔ PC

Ajustes → Copias de seguridad. Importa un `.tachibk` (instala antes las extensiones de tus fuentes) o exporta uno.

Verificado: un viaje **PC → PC** (exportar, vaciar, importar) conserva la **biblioteca, las categorías y los capítulos leídos**.
**Sin verificar:** el viaje con un teléfono real (Mihon → PC → Mihon). Las copias se exportan sin ajustes del servidor
ni datos de otras interfaces, y al importar tampoco se aplican los ajustes del servidor de la copia.

## Notas

- El navegador embebido del motor (CEF, para saltar Cloudflare) está desactivado: evita descargar ~270 MB y queda fuera de la v1.
  Las fuentes que exijan Cloudflare pueden fallar.
- "Iniciar con Windows" solo funciona en la versión instalada.

## Desarrollo

```
npm install
npm run fetch-suwayomi   # descarga el motor (una vez)
npm run dev
npm run dist             # genera dist/manwhaview-<versión>-setup.exe
```
