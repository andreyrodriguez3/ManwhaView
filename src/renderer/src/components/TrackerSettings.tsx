import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import {
  LoginTrackerOAuthDocument,
  LogoutTrackerDocument,
  TrackersDocument
} from '../api/gql/graphql'

/** Ajustes → Seguimiento: iniciar/cerrar sesión en AniList, MyAnimeList, etc. */
export default function TrackerSettings(): React.JSX.Element {
  const qc = useQueryClient()
  const [pasting, setPasting] = useState<number | null>(null)
  const [callback, setCallback] = useState('')

  const trackers = useQuery({ queryKey: ['trackers'], queryFn: () => gql(TrackersDocument) })
  const refresh = (): void => void qc.invalidateQueries({ queryKey: ['trackers'] })

  const login = useMutation({
    mutationFn: (v: { trackerId: number; callbackUrl: string }) =>
      gql(LoginTrackerOAuthDocument, v),
    onSuccess: () => {
      setPasting(null)
      setCallback('')
      refresh()
    }
  })
  const logout = useMutation({
    mutationFn: (trackerId: number) => gql(LogoutTrackerDocument, { trackerId }),
    onSuccess: refresh
  })

  const error = (trackers.error ?? login.error ?? logout.error) as Error | null

  return (
    <>
      <h3>Seguimiento (AniList, MyAnimeList…)</h3>
      <p className="muted small">
        Inicia sesión en tu cuenta y vincula cada obra desde su ficha: lo que leas se sincroniza
        solo. La autorización se hace en tu navegador; ManwhaView nunca ve tu contraseña.
      </p>
      {error && <p className="error">{error.message}</p>}
      <ul className="ext-list">
        {(trackers.data?.trackers.nodes ?? []).map((t) => (
          <li className="ext" key={t.id} style={{ flexWrap: 'wrap' }}>
            <img src={serverAsset(t.icon)} alt="" width={32} height={32} />
            <div className="grow">
              <strong>{t.name}</strong>
              <div className="muted small">
                {t.isLoggedIn
                  ? t.isTokenExpired
                    ? 'Sesión caducada: vuelve a iniciarla'
                    : 'Sesión iniciada'
                  : 'Sin sesión'}
              </div>
            </div>
            {t.isLoggedIn && (
              <button className="secondary" onClick={() => logout.mutate(t.id)}>
                Cerrar sesión
              </button>
            )}
            {!t.isLoggedIn && !t.authUrl && (
              <span className="muted small">Requiere usuario y contraseña (aún no soportado)</span>
            )}
            {(!t.isLoggedIn || t.isTokenExpired) && t.authUrl && (
              <button
                onClick={() => {
                  window.open(t.authUrl!)
                  setPasting(t.id)
                }}
              >
                Iniciar sesión
              </button>
            )}
            {pasting === t.id && (
              <div className="row" style={{ width: '100%' }}>
                <input
                  className="grow"
                  placeholder="Tras autorizar, pega aquí la URL completa a la que te redirige"
                  value={callback}
                  onChange={(e) => setCallback(e.target.value)}
                />
                <button
                  disabled={!callback.trim() || login.isPending}
                  onClick={() => login.mutate({ trackerId: t.id, callbackUrl: callback.trim() })}
                >
                  {login.isPending ? 'Comprobando…' : 'Confirmar'}
                </button>
              </div>
            )}
          </li>
        ))}
        {trackers.data?.trackers.nodes.length === 0 && (
          <li className="muted small">El motor no ofrece servicios de seguimiento.</li>
        )}
      </ul>
    </>
  )
}
