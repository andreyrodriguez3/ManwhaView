import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import {
  ExtensionsDocument,
  FetchExtensionsDocument,
  SourcesDocument,
  UpdateExtensionDocument,
  type ExtensionFieldsFragment
} from '../api/gql/graphql'

type Lang = 'es-en' | 'es' | 'en' | 'all'
type Status = 'all' | 'installed' | 'updates' | 'available'

const LANGS: Record<Lang, { label: string; match: (l: string) => boolean }> = {
  'es-en': {
    label: 'Español + Inglés',
    match: (l) => ['es', 'en', 'all'].includes(l) || l.startsWith('es-') || l.startsWith('en-')
  },
  es: { label: 'Español', match: (l) => l === 'es' || l.startsWith('es-') },
  en: { label: 'Inglés', match: (l) => l === 'en' || l.startsWith('en-') },
  all: { label: 'Todos los idiomas', match: () => true }
}

export default function Extensions(): React.JSX.Element {
  const qc = useQueryClient()
  const [lang, setLang] = useState<Lang>('es-en')
  const [status, setStatus] = useState<Status>('all')
  const [text, setText] = useState('')

  const list = useQuery({ queryKey: ['extensions'], queryFn: () => gql(ExtensionsDocument) })
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => gql(SourcesDocument) })

  const refresh = useMutation({
    mutationFn: () => gql(FetchExtensionsDocument),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extensions'] })
  })
  const act = useMutation({
    mutationFn: (v: {
      id: string
      patch: { install?: boolean; update?: boolean; uninstall?: boolean }
    }) => gql(UpdateExtensionDocument, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['extensions'] })
      void qc.invalidateQueries({ queryKey: ['sources'] })
    }
  })

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase()
    return (list.data?.extensions.nodes ?? []).filter(
      (e) =>
        !e.isObsolete &&
        LANGS[lang].match(e.lang) &&
        (!q || e.name.toLowerCase().includes(q)) &&
        (status === 'all' ||
          (status === 'installed' && e.isInstalled) ||
          (status === 'updates' && e.hasUpdate) ||
          (status === 'available' && !e.isInstalled))
    )
  }, [list.data, lang, status, text])

  const busy = act.isPending ? act.variables?.id : undefined
  const error = (refresh.error ?? act.error ?? list.error) as Error | null

  return (
    <div className="pad">
      <div className="toolbar">
        <input
          placeholder="Buscar extensión…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {Object.entries(LANGS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="all">Todas</option>
          <option value="installed">Instaladas</option>
          <option value="updates">Con actualización</option>
          <option value="available">Disponibles</option>
        </select>
        <button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? 'Actualizando…' : '↻ Refrescar lista'}
        </button>
      </div>

      {error && <p className="error">{error.message}</p>}

      <section>
        <h3>Fuentes instaladas ({sources.data?.sources.nodes.length ?? 0})</h3>
        <div className="chips">
          {(sources.data?.sources.nodes ?? []).map((s) => (
            <span className="chip" key={s.id}>
              {s.name} <small>{s.lang}</small>
            </span>
          ))}
          {sources.data?.sources.nodes.length === 0 && (
            <span className="muted small">Instala una extensión para ver sus fuentes.</span>
          )}
        </div>
      </section>

      <h3>Extensiones ({shown.length})</h3>
      {list.isLoading && <p className="muted">Cargando…</p>}
      {list.data && list.data.extensions.totalCount === 0 && (
        <p className="muted">
          No hay extensiones. Añade un repositorio en Ajustes y pulsa “Refrescar lista”.
        </p>
      )}
      <ul className="ext-list">
        {shown.map((e) => (
          <ExtensionRow
            key={e.pkgName}
            ext={e}
            busy={busy === e.pkgName}
            onAct={(patch) => act.mutate({ id: e.pkgName, patch })}
          />
        ))}
      </ul>
    </div>
  )
}

function ExtensionRow({
  ext,
  busy,
  onAct
}: {
  ext: ExtensionFieldsFragment
  busy: boolean
  onAct: (patch: { install?: boolean; update?: boolean; uninstall?: boolean }) => void
}): React.JSX.Element {
  return (
    <li className="ext">
      <img src={serverAsset(ext.iconUrl)} alt="" width={40} height={40} />
      <div className="grow">
        <strong>{ext.name}</strong>
        {ext.contentWarning !== 'SAFE' && <span className="badge">+18</span>}
        <div className="muted small">
          {ext.lang} · v{ext.versionName}
        </div>
      </div>
      {busy ? (
        <span className="muted small">Trabajando…</span>
      ) : ext.isInstalled ? (
        <div className="row">
          {ext.hasUpdate && <button onClick={() => onAct({ update: true })}>Actualizar</button>}
          <button className="secondary" onClick={() => onAct({ uninstall: true })}>
            Desinstalar
          </button>
        </div>
      ) : (
        <button onClick={() => onAct({ install: true })}>Instalar</button>
      )}
    </li>
  )
}
