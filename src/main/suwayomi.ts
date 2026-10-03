import { app } from 'electron'
import { ChildProcess, execFile, spawn } from 'child_process'
import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs'
import { createServer } from 'net'
import { join } from 'path'
import type { EngineState, GraphqlResponse } from '../shared/ipc'

const FIRST_PORT = 4567
const START_TIMEOUT_MS = 60_000
const PREFIX = '-Dsuwayomi.tachidesk.config.server.'

let child: ChildProcess | null = null
let log: WriteStream | null = null
let state: EngineState = { status: 'starting' }
let baseUrl: string | null = null
export const engineUrl = (): string | null => baseUrl
const listeners = new Set<(s: EngineState) => void>()

export const getState = (): EngineState => state
export function onState(fn: (s: EngineState) => void): void {
  listeners.add(fn)
}
function setState(next: EngineState): void {
  state = next
  listeners.forEach((fn) => fn(next))
}

const logPath = (): string => join(app.getPath('userData'), 'logs', 'suwayomi.log')

/** Carpeta con jre/ y bin/Suwayomi-Server.jar (la deja scripts/fetch-suwayomi.mjs). */
function engineDir(): string {
  if (process.env.SUWAYOMI_DIR) return process.env.SUWAYOMI_DIR
  return app.isPackaged
    ? join(process.resourcesPath, 'suwayomi')
    : join(app.getAppPath(), 'resources', 'suwayomi')
}

function isFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createServer()
    s.once('error', () => resolve(false))
    s.listen(port, '127.0.0.1', () => s.close(() => resolve(true)))
  })
}

async function findPort(): Promise<number> {
  for (let p = FIRST_PORT; p < FIRST_PORT + 50; p++) if (await isFree(p)) return p
  throw new Error('No hay ningún puerto libre para el motor')
}

export async function graphql<T = unknown>(
  query: string,
  variables?: unknown
): Promise<GraphqlResponse<T>> {
  if (!baseUrl) throw new Error('El motor no está listo')
  const res = await fetch(`${baseUrl}/api/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  if (!res.ok) throw new Error(`El motor respondió ${res.status}`)
  return (await res.json()) as GraphqlResponse<T>
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export async function startEngine(): Promise<void> {
  await stopEngine()
  setState({ status: 'starting' })
  mkdirSync(join(app.getPath('userData'), 'logs'), { recursive: true })
  const fail = (message: string): void => setState({ status: 'error', message, logPath: logPath() })

  try {
    const external = process.env.SUWAYOMI_URL
    let url: string
    if (external) {
      url = external.replace(/\/$/, '')
    } else {
      const dir = engineDir()
      const java = join(dir, 'jre', 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
      const jar = join(dir, 'bin', 'Suwayomi-Server.jar')
      if (!existsSync(java) || !existsSync(jar)) {
        return fail(`No se encontró el motor en ${dir}. Ejecuta: npm run fetch-suwayomi`)
      }
      const port = await findPort()
      url = `http://127.0.0.1:${port}`
      const dataDir = join(app.getPath('userData'), 'suwayomi')
      mkdirSync(dataDir, { recursive: true })

      log = createWriteStream(logPath(), { flags: 'a' })
      log.on('error', () => {})
      child = spawn(
        java,
        [
          '-Xmx512m',
          `${PREFIX}rootDir=${dataDir}`,
          `${PREFIX}ip=127.0.0.1`,
          `${PREFIX}port=${port}`,
          `${PREFIX}systemTrayEnabled=false`,
          `${PREFIX}initialOpenInBrowserEnabled=false`,
          `${PREFIX}webUIEnabled=false`,
          // Sin el navegador embebido (CEF): evita descargar ~270 MB en el primer arranque.
          `${PREFIX}kcefEnabled=false`,
          '-jar',
          jar
        ],
        { cwd: dir, windowsHide: true }
      )
      child.stdout?.pipe(log, { end: false })
      child.stderr?.pipe(log, { end: false })
      const proc = child
      proc.once('exit', (code) => {
        if (child === proc) {
          child = null
          if (state.status !== 'ready') fail(`El motor se cerró al arrancar (código ${code})`)
        }
      })
    }

    baseUrl = url
    const deadline = Date.now() + START_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (!external && !child) return // ya marcado como error por el evento exit
      try {
        const r = await graphql<{ aboutServer: { version: string } }>('{aboutServer{version}}')
        if (r.data?.aboutServer) {
          return setState({
            status: 'ready',
            url,
            version: r.data.aboutServer.version,
            logPath: logPath()
          })
        }
      } catch {
        /* todavía arrancando */
      }
      await sleep(500)
    }
    await stopEngine()
    fail('El motor tardó demasiado en arrancar (60 s)')
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e))
  }
}

export function stopEngine(): Promise<void> {
  const proc = child
  child = null
  baseUrl = null
  log?.end()
  log = null
  if (!proc || proc.pid === undefined || proc.exitCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    proc.once('exit', () => resolve())
    if (process.platform === 'win32') {
      // Mata también los procesos hijos de Java.
      execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], () => resolve())
    } else {
      proc.kill('SIGTERM')
      setTimeout(() => proc.kill('SIGKILL'), 5000).unref()
    }
  })
}
