import { print } from 'graphql'
import type { TypedDocumentNode } from '@graphql-typed-document-node/core'

/** Ejecuta una consulta o mutación tipada. Pasa por el proceso principal (sin CORS). */
export async function gql<R, V extends Record<string, unknown> = Record<string, never>>(
  doc: TypedDocumentNode<R, V>,
  variables?: V
): Promise<R> {
  const res = await window.api.graphql<R>(print(doc), variables)
  if (res.errors?.length)
    throw new Error(res.errors.map((e) => e.message.split('\n')[0]).join('; '))
  if (!res.data) throw new Error('Respuesta vacía del motor')
  return res.data
}

let serverUrl = ''
export const setServerUrl = (url: string): void => {
  serverUrl = url
}

/** Convierte una ruta del servidor (p. ej. un icono) en una URL absoluta. */
export const serverAsset = (path: string): string => {
  try {
    return new URL(path, serverUrl).href
  } catch {
    return ''
  }
}
