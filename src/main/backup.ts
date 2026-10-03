import { dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { basename } from 'path'
import type { BackupSummary, GraphqlResponse } from '../shared/ipc'
import { getWindow } from './window'
import { engineUrl, graphql } from './suwayomi'

/**
 * Ajustes del motor (puerto, IP…) y datos de otras interfaces no se tocan: una copia de Mihon
 * no debe cambiar cómo arranca el motor de ManwhaView.
 */
const FLAGS = 'flags: { includeServerSettings: false, includeClientData: false }'

const today = (): string => new Date().toISOString().slice(0, 10)

/** GraphQL con subida de archivo (multipart, especificación graphql-multipart-request). */
async function graphqlUpload<T>(query: string, path: string): Promise<GraphqlResponse<T>> {
  const base = engineUrl()
  if (!base) throw new Error('El motor no está listo')
  const form = new FormData()
  form.set('operations', JSON.stringify({ query, variables: { backup: null } }))
  form.set('map', JSON.stringify({ '0': ['variables.backup'] }))
  form.set('0', new Blob([await readFile(path)]), basename(path))
  const res = await fetch(`${base}/api/graphql`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`El motor respondió ${res.status}`)
  return (await res.json()) as GraphqlResponse<T>
}

function unwrap<T>(res: GraphqlResponse<T>): T {
  if (res.errors?.length)
    throw new Error(res.errors.map((e) => e.message.split('\n')[0]).join('; '))
  if (!res.data) throw new Error('Respuesta vacía del motor')
  return res.data
}

export async function pickBackupFile(): Promise<string | null> {
  const win = getWindow()
  const opts: Electron.OpenDialogOptions = {
    title: 'Elige una copia de seguridad de Mihon',
    properties: ['openFile'],
    filters: [
      { name: 'Copia de seguridad (.tachibk)', extensions: ['tachibk', 'proto.gz'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  }
  const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
  return r.canceled ? null : r.filePaths[0]
}

export async function validateBackup(path: string): Promise<{ missingSources: string[] }> {
  const data = unwrap(
    await graphqlUpload<{
      validateBackup: { missingSources: { id: string; name: string }[] }
    }>(
      'query($backup: Upload!){ validateBackup(input:{backup:$backup}){ missingSources{ id name } } }',
      path
    )
  )
  return { missingSources: data.validateBackup.missingSources.map((s) => s.name || s.id) }
}

export async function restoreBackup(path: string): Promise<{ id: string }> {
  const data = unwrap(
    await graphqlUpload<{ restoreBackup: { id: string } }>(
      `mutation($backup: Upload!){ restoreBackup(input:{backup:$backup, ${FLAGS}}){ id } }`,
      path
    )
  )
  return { id: data.restoreBackup.id }
}

export async function restoreStatus(id: string): Promise<BackupSummary> {
  const data = unwrap(
    await graphql<{
      restoreStatus: { state: string; mangaProgress: number; totalManga: number } | null
    }>('query($id: String!){ restoreStatus(id: $id){ state mangaProgress totalManga } }', { id })
  )
  const s = data.restoreStatus
  return s
    ? { state: s.state, progress: s.mangaProgress, total: s.totalManga }
    : { state: 'IDLE', progress: 0, total: 0 }
}

/** Crea la copia en el motor y la guarda donde el usuario elija. Devuelve la ruta (o null). */
export async function exportBackup(): Promise<string | null> {
  const data = unwrap(
    await graphql<{ createBackup: { url: string } }>(
      `mutation{ createBackup(input:{ ${FLAGS} }){ url } }`
    )
  )
  const base = engineUrl()
  if (!base) throw new Error('El motor no está listo')
  const res = await fetch(new URL(data.createBackup.url, base))
  if (!res.ok) throw new Error(`No se pudo descargar la copia (${res.status})`)
  const bytes = Buffer.from(await res.arrayBuffer())

  const win = getWindow()
  const opts: Electron.SaveDialogOptions = {
    title: 'Guardar copia de seguridad',
    defaultPath: `ManwhaView_${today()}.tachibk`,
    filters: [{ name: 'Copia de seguridad (.tachibk)', extensions: ['tachibk'] }]
  }
  const r = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
  if (r.canceled || !r.filePath) return null
  await writeFile(r.filePath, bytes)
  return r.filePath
}
