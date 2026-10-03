import { useState } from 'react'
import { useEngine } from './hooks/useEngine'
import Extensions from './routes/Extensions'
import Settings from './routes/Settings'

type Tab = 'library' | 'extensions' | 'settings'

function App(): React.JSX.Element {
  const engine = useEngine()
  const [tab, setTab] = useState<Tab>('extensions')

  if (engine.status === 'starting') {
    return (
      <div className="center">
        <div className="spinner" />
        <p>Iniciando motor…</p>
      </div>
    )
  }

  if (engine.status === 'error') {
    return (
      <div className="center">
        <h2>No se pudo iniciar el motor</h2>
        <p className="muted">{engine.message}</p>
        <div className="row">
          <button onClick={() => void window.api.engine.restart()}>Reintentar</button>
          <button
            className="secondary"
            onClick={() => void window.api.showInFolder(engine.logPath)}
          >
            Ver registro
          </button>
        </div>
        <p className="muted small">{engine.logPath}</p>
      </div>
    )
  }

  const tabs: [Tab, string][] = [
    ['library', 'Biblioteca'],
    ['extensions', 'Extensiones'],
    ['settings', 'Ajustes']
  ]

  return (
    <div className="app">
      <nav>
        <strong>📚 ManwhaView</strong>
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
        <span className="muted small grow right">Motor {engine.version}</span>
      </nav>
      <main>
        {tab === 'library' && <p className="muted pad">La biblioteca llegará en la Fase 5.</p>}
        {tab === 'extensions' && <Extensions />}
        {tab === 'settings' && <Settings logPath={engine.logPath} version={engine.version} />}
      </main>
    </div>
  )
}

export default App
