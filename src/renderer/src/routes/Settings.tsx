import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql } from '../api/client'
import {
  AddExtensionStoreDocument,
  ExtensionStoresDocument,
  FetchExtensionsDocument,
  RemoveExtensionStoreDocument
} from '../api/gql/graphql'
import { DEFAULT_EXTENSION_STORE } from '../../../shared/ipc'

export default function Settings({
  logPath,
  version
}: {
  logPath: string
  version: string
}): React.JSX.Element {
  const qc = useQueryClient()
  const [url, setUrl] = useState(DEFAULT_EXTENSION_STORE)
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => gql(ExtensionStoresDocument) })

  const done = (): void => {
    void qc.invalidateQueries({ queryKey: ['stores'] })
    void qc.invalidateQueries({ queryKey: ['extensions'] })
  }
  const add = useMutation({
    // Tras registrar el repositorio hay que pedir su lista de extensiones.
    mutationFn: async (indexUrl: string) => {
      await gql(AddExtensionStoreDocument, { indexUrl })
      await gql(FetchExtensionsDocument)
    },
    onSuccess: done
  })
  const remove = useMutation({
    mutationFn: (indexUrl: string) => gql(RemoveExtensionStoreDocument, { indexUrl }),
    onSuccess: done
  })

  const error = (add.error ?? remove.error ?? stores.error) as Error | null

  return (
    <div className="pad">
      <h3>Repositorios de extensiones</h3>
      <p className="muted small">
        Pega la URL del repositorio que usas en Mihon. Por defecto, Keiyoushi (se acepta el formato{' '}
        <code>index.pb</code> o <code>index.min.json</code>).
      </p>
      <div className="toolbar">
        <input className="grow" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button onClick={() => add.mutate(url.trim())} disabled={add.isPending || !url.trim()}>
          {add.isPending ? 'Añadiendo…' : 'Añadir'}
        </button>
      </div>
      {error && <p className="error">{error.message}</p>}
      <ul className="ext-list">
        {(stores.data?.extensionStores.nodes ?? []).map((s) => (
          <li className="ext" key={s.indexUrl}>
            <div className="grow">
              <strong>{s.name}</strong>
              <div className="muted small">{s.indexUrl}</div>
            </div>
            <button className="secondary" onClick={() => remove.mutate(s.indexUrl)}>
              Quitar
            </button>
          </li>
        ))}
        {stores.data?.extensionStores.nodes.length === 0 && (
          <li className="muted small">Todavía no hay repositorios.</li>
        )}
      </ul>

      <h3>Motor</h3>
      <p className="muted small">Suwayomi-Server {version}</p>
      <div className="row">
        <button className="secondary" onClick={() => void window.api.showInFolder(logPath)}>
          Ver registro
        </button>
        <button className="secondary" onClick={() => void window.api.engine.restart()}>
          Reiniciar motor
        </button>
      </div>
    </div>
  )
}
