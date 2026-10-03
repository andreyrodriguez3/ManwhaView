import { BrowserWindow, Notification, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC, type Bounds, type WinState } from '../shared/ipc'
import { getSettings, patchSettings } from './settings'

const MIN_W = 260
const MIN_H = 320
const DEFAULT_SIZE = { width: 900, height: 670 }

let win: BrowserWindow | null = null
let ghost = false
let pinned = false
let ghostHandleActive = false
let quitting = false
const changeListeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

export const getWindow = (): BrowserWindow | null => win

export const getWinState = (): WinState => ({
  pinned,
  ghost,
  opacity: getSettings().window.opacity
})

/** Avisa a quien muestre el estado de la ventana (interfaz y menú de la bandeja). */
export const onWinChange = (fn: () => void): void => void changeListeners.add(fn)

/** Tras llamarla, cerrar la ventana la cierra de verdad en vez de esconderla en la bandeja. */
export const setQuitting = (): void => {
  quitting = true
}

function broadcast(): void {
  win?.webContents.send(IPC.winState, getWinState())
  changeListeners.forEach((fn) => fn())
}

/** ✕ esconde la app en la bandeja; la primera vez avisa de ello. */
function hideToTray(): void {
  win?.hide()
  changeListeners.forEach((fn) => fn())
  if (!getSettings().app.trayHintShown && Notification.isSupported()) {
    new Notification({
      title: 'ManwhaView sigue abierta',
      body: 'Está en la bandeja del sistema. Haz doble clic en su icono para mostrarla o usa «Salir» para cerrarla.'
    }).show()
    patchSettings('app', { trayHintShown: true })
  }
}

/** Los límites guardados solo valen si aún se ven en algún monitor conectado. */
function visibleBounds(b: Bounds | null): Bounds | null {
  if (!b) return null
  const ok = screen.getAllDisplays().some((d) => {
    const w = d.workArea
    const overlapX = Math.min(b.x + b.width, w.x + w.width) - Math.max(b.x, w.x)
    const overlapY = Math.min(b.y + b.height, w.y + w.height) - Math.max(b.y, w.y)
    return overlapX >= 100 && overlapY >= 50
  })
  if (ok) return b
  // Fuera de los monitores: se recoloca en el principal, centrada y con el mismo tamaño.
  const w = screen.getPrimaryDisplay().workArea
  const width = Math.min(b.width, w.width)
  const height = Math.min(b.height, w.height)
  return {
    width,
    height,
    x: w.x + Math.round((w.width - width) / 2),
    y: w.y + Math.round((w.height - height) / 2)
  }
}

function applyOpacity(): void {
  if (!win) return
  const s = getSettings().window
  win.setOpacity(ghost ? s.ghostOpacity : s.opacity)
}

function applyPinned(): void {
  if (!win) return
  if (pinned) {
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setMinimizable(false)
  } else {
    win.setAlwaysOnTop(false)
    win.setMinimizable(true)
  }
}

export function setPinned(value: boolean): void {
  if (ghost && !value) return // en modo fantasma la ventana siempre está fijada
  pinned = value
  applyPinned()
  patchSettings('window', { pinned })
  broadcast()
}

export function setGhost(value: boolean): void {
  if (!win || ghost === value) return
  ghost = value
  ghostHandleActive = false
  if (ghost) {
    pinned = true
    applyPinned()
    win.setIgnoreMouseEvents(true, { forward: true })
  } else {
    win.setIgnoreMouseEvents(false)
  }
  applyOpacity()
  broadcast()
}

/** La interfaz avisa de que el ratón entró/salió del asa del modo fantasma. */
export function setGhostHandle(inside: boolean): void {
  if (!win || !ghost || inside === ghostHandleActive) return
  ghostHandleActive = inside
  if (inside) win.setIgnoreMouseEvents(false)
  else win.setIgnoreMouseEvents(true, { forward: true })
}

export function setOpacity(value: number): void {
  patchSettings('window', { opacity: Math.min(1, Math.max(0.3, value)) })
  applyOpacity()
  broadcast()
}

export function showWindow(): void {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function toggleVisible(): void {
  if (!win) return
  if (win.isVisible() && !win.isMinimized()) win.hide()
  else showWindow()
}

function scheduleSaveBounds(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isMinimized()) {
      patchSettings('window', { bounds: win.getNormalBounds() })
    }
  }, 400)
}

export function createWindow(opts: { hidden?: boolean } = {}): BrowserWindow {
  const saved = getSettings().window
  const bounds = visibleBounds(saved.bounds)
  win = new BrowserWindow({
    ...(bounds ?? DEFAULT_SIZE),
    minWidth: MIN_W,
    minHeight: MIN_H,
    frame: false,
    transparent: false,
    resizable: true,
    show: false,
    title: 'ManwhaView',
    backgroundColor: '#14151a',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // El modo fantasma siempre empieza desactivado; fijada y opacidad se recuerdan.
  ghost = false
  pinned = saved.pinned
  applyPinned()
  applyOpacity()

  win.on('ready-to-show', () => {
    if (!opts.hidden) win?.show()
  })
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    hideToTray()
  })
  win.on('closed', () => (win = null))
  win.on('show', () => changeListeners.forEach((fn) => fn()))
  win.on('hide', () => changeListeners.forEach((fn) => fn()))
  win.on('move', scheduleSaveBounds)
  win.on('resize', scheduleSaveBounds)
  // Fijada = no se puede minimizar (p. ej. Win+D): si llega el evento, se restaura.
  win.on('minimize', () => {
    if (pinned) setTimeout(() => win?.restore(), 0)
  })
  win.webContents.on('did-finish-load', broadcast)

  win.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}
