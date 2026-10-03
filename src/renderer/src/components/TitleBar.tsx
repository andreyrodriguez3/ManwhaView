import { useWin } from '../store/win'

/** Barra de título propia (la ventana no tiene marco). Se arrastra desde las zonas vacías. */
export default function TitleBar(): React.JSX.Element {
  const { pinned, ghost, opacity } = useWin()
  return (
    <header className="titlebar">
      <span className="titlebar-title">ManwhaView</span>
      <div className="titlebar-controls">
        <button
          className={pinned ? 'icon active' : 'icon'}
          title={pinned ? 'Desfijar (Ctrl+Alt+P)' : 'Fijar encima de todo (Ctrl+Alt+P)'}
          onClick={() => void window.api.win.setPinned(!pinned)}
        >
          📌
        </button>
        <button
          className="icon"
          title="Modo fantasma: los clics atraviesan la ventana (Ctrl+Alt+G)"
          onClick={() => void window.api.win.setGhost(true)}
        >
          👻
        </button>
        <input
          type="range"
          min={30}
          max={100}
          step={5}
          value={Math.round(opacity * 100)}
          title={`Opacidad: ${Math.round(opacity * 100)} %`}
          onChange={(e) => void window.api.win.setOpacity(Number(e.target.value) / 100)}
        />
        {!pinned && (
          <button className="icon" title="Minimizar" onClick={() => void window.api.win.minimize()}>
            ➖
          </button>
        )}
        <button
          className="icon close"
          title="Cerrar"
          disabled={ghost}
          onClick={() => void window.api.win.close()}
        >
          ✕
        </button>
      </div>
    </header>
  )
}
