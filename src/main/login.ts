import { app } from 'electron'

/** Argumento con el que Windows lanza la app al iniciar sesión: arranca solo en la bandeja. */
export const HIDDEN_ARG = '--hidden'

/**
 * "Iniciar con Windows". Solo tiene sentido en la versión instalada: en desarrollo registraría
 * el electron.exe de node_modules en el inicio de Windows, así que ahí queda desactivado.
 */
export function getLoginItem(): { enabled: boolean; available: boolean } {
  return {
    enabled: app.isPackaged && app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin,
    available: app.isPackaged
  }
}

export function setLoginItem(enabled: boolean): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled, args: [HIDDEN_ARG] })
}
