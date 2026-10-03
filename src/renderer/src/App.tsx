import { useEngine } from './hooks/useEngine'
import { baseTab, useNav, type TabName, type View } from './store/nav'
import Browse from './routes/Browse'
import Extensions from './routes/Extensions'
import Manga from './routes/Manga'
import Search from './routes/Search'
import Settings from './routes/Settings'
import Source from './routes/Source'
import Library from './routes/Library'
import Reader from './routes/Reader'

function Screen({
  view,
  engine
}: {
  view: View
  engine: { logPath: string; version: string }
}): React.JSX.Element {
  switch (view.name) {
    case 'library':
      return <Library />
    case 'browse':
      return <Browse />
    case 'search':
      return <Search key={view.query} query={view.query} />
    case 'source':
      return (
        <Source
          key={view.sourceId}
          sourceId={view.sourceId}
          sourceName={view.sourceName}
          supportsLatest={view.supportsLatest}
        />
      )
    case 'manga':
      return <Manga key={view.mangaId} mangaId={view.mangaId} />
    case 'reader':
      return <Reader key={view.chapterId} mangaId={view.mangaId} chapterId={view.chapterId} />
    case 'extensions':
      return <Extensions />
    case 'settings':
      return <Settings logPath={engine.logPath} version={engine.version} />
  }
}

function App(): React.JSX.Element {
  const engine = useEngine()
  const { stack, view, tab, back } = useNav()

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

  const tabs: [TabName, string][] = [
    ['library', 'Biblioteca'],
    ['browse', 'Explorar'],
    ['extensions', 'Extensiones'],
    ['settings', 'Ajustes']
  ]
  const active = baseTab(stack)

  return (
    <div className="app">
      {view.name !== 'reader' && (
        <nav>
          {stack.length > 1 && (
            <button className="secondary" onClick={back} title="Volver">
              ←
            </button>
          )}
          <strong>📚 ManwhaView</strong>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={active === id ? 'tab active' : 'tab'}
              onClick={() => tab(id)}
            >
              {label}
            </button>
          ))}
          <span className="muted small grow right">Motor {engine.version}</span>
        </nav>
      )}
      <main>
        <Screen view={view} engine={engine} />
      </main>
    </div>
  )
}

export default App
