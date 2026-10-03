// Descarga Suwayomi-Server (con su Java incluido) a resources/suwayomi/.
// Versión fija: cámbiala aquí (o con SUWAYOMI_VERSION) y vuelve a ejecutar.
import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const VERSION = process.env.SUWAYOMI_VERSION ?? 'v2.4.2366'
const TARGET =
  process.env.SUWAYOMI_PLATFORM ??
  { win32: 'windows-x64', linux: 'linux-x64' }[process.platform] ??
  'windows-x64'
const EXT = TARGET.startsWith('windows') ? 'zip' : 'tar.gz'
const NAME = `Suwayomi-Server-${VERSION}-${TARGET}.${EXT}`
const URL = `https://github.com/Suwayomi/Suwayomi-Server/releases/download/${VERSION}/${NAME}`
const OUT = resolve('resources', 'suwayomi')
const STAMP = join(OUT, 'VERSION')

if (existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === `${VERSION} ${TARGET}`) {
  console.log(`Suwayomi ${VERSION} (${TARGET}) ya está en ${OUT}`)
  process.exit(0)
}

const work = join(tmpdir(), `suwayomi-${Date.now()}`)
mkdirSync(work, { recursive: true })
const archive = join(work, NAME)
console.log(`Descargando ${URL}`)
const res = await fetch(URL)
if (!res.ok || !res.body) throw new Error(`Descarga fallida: ${res.status}`)
await pipeline(Readable.fromWeb(res.body), createWriteStream(archive))

console.log('Descomprimiendo…')
// tar de Windows 10+ (bsdtar) también lee .zip. Se usa la ruta absoluta porque, si el script se
// lanza desde Git Bash, `tar` es el de GNU y toma "C:" como un host remoto.
const tar =
  process.platform === 'win32'
    ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar'
execFileSync(tar, ['-xf', archive, '-C', work])
const inner = join(work, NAME.replace(`.${EXT}`, ''))
if (!existsSync(join(inner, 'bin', 'Suwayomi-Server.jar')))
  throw new Error('Estructura inesperada del archivo descargado')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(resolve('resources'), { recursive: true })
cpSync(inner, OUT, { recursive: true })
writeFileSync(STAMP, `${VERSION} ${TARGET}\n`)
rmSync(work, { recursive: true, force: true })
console.log(`Listo: ${OUT}`)
