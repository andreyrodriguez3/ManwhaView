import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { gql } from '../api/client'
import { LibraryMangaDocument } from '../api/gql/graphql'

type Step =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'confirm'; path: string; missing: string[] }
  | { kind: 'restoring'; progress: number; total: number }
  | { kind: 'done'; ok: boolean; library: number; missing: string[] }
  | { kind: 'error'; message: string }

const fileName = (p: string): string => p.split(/[\\/]/).pop() ?? p

export default function BackupSettings(): React.JSX.Element {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [saved, setSaved] = useState<string | null>(null)
  const missingRef = useRef<string[]>([])
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const fail = (e: unknown): void => setStep({ kind: 'error', message: (e as Error).message })

  const choose = async (): Promise<void> => {
    try {
      const path = await window.api.backup.pickFile()
      if (!path) return
      setStep({ kind: 'busy', text: 'Comprobando la copia…' })
      const { missingSources } = await window.api.backup.validate(path)
      setStep({ kind: 'confirm', path, missing: missingSources })
    } catch (e) {
      fail(e)
    }
  }

  const restore = async (path: string, missing: string[]): Promise<void> => {
    try {
      missingRef.current = missing
      setStep({ kind: 'restoring', progress: 0, total: 0 })
      const { id } = await window.api.backup.restore(path)
      let last = { progress: 0, total: 0 }
      for (;;) {
        await new Promise((r) => setTimeout(r, 800))
        if (!alive.current) return
        const s = await window.api.backup.status(id)
        if (s.total) last = { progress: s.progress, total: s.total }
        if (s.state === 'SUCCESS' || s.state === 'FAILURE') {
          const library = await gql(LibraryMangaDocument).then((r) => r.mangas.nodes.length)
          void qc.invalidateQueries()
          return setStep({
            kind: 'done',
            ok: s.state === 'SUCCESS',
            library,
            missing: missingRef.current
          })
        }
        setStep({ kind: 'restoring', ...last })
      }
    } catch (e) {
      fail(e)
    }
  }

  const exportBackup = async (): Promise<void> => {
    try {
      setSaved(null)
      setStep({ kind: 'busy', text: 'Creando la copia…' })
      setSaved(await window.api.backup.export())
      setStep({ kind: 'idle' })
    } catch (e) {
      fail(e)
    }
  }

  const busy = step.kind === 'busy' || step.kind === 'restoring'

  return (
    <>
      <h3>Copias de seguridad (Mihon ↔ PC)</h3>
      <ol className="muted small">
        <li>En Mihon: Ajustes → Datos y almacenamiento → Crear copia de seguridad.</li>
        <li>
          Pasa el archivo <code>.tachibk</code> a la PC (Drive, cable, etc.) e impórtalo aquí.
        </li>
        <li>
          En sentido contrario: exporta aquí y, en Mihon, Restaurar copia de seguridad con ese
          archivo.
        </li>
      </ol>
      <div className="row">
        <button onClick={() => void choose()} disabled={busy}>
          Importar copia…
        </button>
        <button className="secondary" onClick={() => void exportBackup()} disabled={busy}>
          Exportar copia…
        </button>
      </div>

      {saved && (
        <p className="small">
          Copia guardada en <code>{saved}</code>
        </p>
      )}
      {step.kind === 'busy' && <p className="muted">{step.text}</p>}
      {step.kind === 'error' && <p className="error">{step.message}</p>}

      {step.kind === 'confirm' && (
        <div className="notice">
          <strong>Importar {fileName(step.path)}</strong>
          <p className="small">
            Instala primero las extensiones de tus fuentes (pestaña Extensiones); las obras de
            fuentes que falten no se podrán leer.
          </p>
          {step.missing.length > 0 ? (
            <p className="error small">
              Fuentes que faltan ({step.missing.length}): {step.missing.join(', ')}
            </p>
          ) : (
            <p className="small">Todas las fuentes de la copia están instaladas.</p>
          )}
          <div className="row">
            <button onClick={() => void restore(step.path, step.missing)}>Restaurar</button>
            <button className="secondary" onClick={() => setStep({ kind: 'idle' })}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step.kind === 'restoring' && (
        <p className="muted">
          Restaurando… {step.total ? `${step.progress}/${step.total} obras` : 'preparando'}
        </p>
      )}

      {step.kind === 'done' && (
        <div className="notice">
          <strong>{step.ok ? 'Copia restaurada' : 'La restauración falló'}</strong>
          <p className="small">La biblioteca tiene ahora {step.library} obras.</p>
          {step.missing.length > 0 && (
            <p className="error small">
              Sin extensión instalada (sus obras no se podrán abrir): {step.missing.join(', ')}
            </p>
          )}
        </div>
      )}
    </>
  )
}
