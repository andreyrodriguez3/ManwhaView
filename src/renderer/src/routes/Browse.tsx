import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import { SourcesDocument } from '../api/gql/graphql'
import { useNav } from '../store/nav'

export default function Browse(): React.JSX.Element {
  const go = useNav((s) => s.go)
  const [text, setText] = useState('')
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => gql(SourcesDocument) })
  const nodes = (sources.data?.sources.nodes ?? []).filter((s) => s.id !== '0')

  return (
    <div className="pad">
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) go({ name: 'search', query: text.trim() })
        }}
      >
        <input
          placeholder="Buscar en todas las fuentes…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()}>
          Búsqueda global
        </button>
      </form>

      <h3>Fuentes instaladas</h3>
      {sources.error && <p className="error">{(sources.error as Error).message}</p>}
      {sources.isLoading && <p className="muted">Cargando…</p>}
      {sources.data && nodes.length === 0 && (
        <p className="muted">Aún no hay fuentes. Instala extensiones en la pestaña Extensiones.</p>
      )}
      <ul className="ext-list">
        {nodes.map((s) => (
          <li
            key={s.id}
            className="ext clickable"
            onClick={() =>
              go({
                name: 'source',
                sourceId: s.id,
                sourceName: s.displayName,
                supportsLatest: s.supportsLatest
              })
            }
          >
            <img src={serverAsset(s.iconUrl)} alt="" width={36} height={36} />
            <div className="grow">
              <strong>{s.displayName}</strong>
              <div className="muted small">{s.lang}</div>
            </div>
            <span className="muted">›</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
