import { app, Menu, nativeImage, Tray } from 'electron'
import icon from '../../resources/icon.png?asset'
import { getLoginItem, setLoginItem } from './login'
import { getWinState, getWindow, setGhost, setPinned, showWindow, toggleVisible } from './window'

let tray: Tray | null = null

function buildMenu(): Menu {
  const state = getWinState()
  const visible = !!getWindow()?.isVisible()
  const login = getLoginItem()
  return Menu.buildFromTemplate([
    { label: visible ? 'Ocultar' : 'Mostrar', click: () => toggleVisible() },
    { type: 'separator' },
    {
      label: 'Fijar encima de todo',
      type: 'checkbox',
      checked: state.pinned,
      click: (i) => setPinned(i.checked)
    },
    {
      label: 'Modo fantasma',
      type: 'checkbox',
      checked: state.ghost,
      click: (i) => setGhost(i.checked)
    },
    {
      label: 'Iniciar con Windows',
      type: 'checkbox',
      checked: login.enabled,
      enabled: login.available,
      click: (i) => setLoginItem(i.checked)
    },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ])
}

/** Vuelve a construir el menú (el estado de fijada/fantasma/visible cambia desde otros sitios). */
export function refreshTray(): void {
  tray?.setContextMenu(buildMenu())
}

export function createTray(): void {
  if (tray) return
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }))
  tray.setToolTip('ManwhaView')
  tray.setContextMenu(buildMenu())
  // El menú se reconstruye justo antes de abrirse para reflejar el estado actual.
  tray.on('right-click', refreshTray)
  tray.on('double-click', () => showWindow())
}
