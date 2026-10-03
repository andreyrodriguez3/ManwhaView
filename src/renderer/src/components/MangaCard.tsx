import { serverAsset } from '../api/client'

interface Props {
  title: string
  thumbnailUrl?: string | null
  inLibrary?: boolean
  unread?: number
  onOpen: () => void
  onContinue?: () => void
}

export default function MangaCard({
  title,
  thumbnailUrl,
  inLibrary,
  unread,
  onOpen,
  onContinue
}: Props): React.JSX.Element {
  return (
    <div className="card" onClick={onOpen} title={title}>
      <div className="cover">
        {thumbnailUrl ? (
          <img src={serverAsset(thumbnailUrl)} alt="" loading="lazy" />
        ) : (
          <div className="no-cover">Sin portada</div>
        )}
        {inLibrary && <span className="tag">En biblioteca</span>}
        {!!unread && <span className="unread">{unread}</span>}
        {onContinue && (
          <button
            className="continue"
            onClick={(e) => {
              e.stopPropagation()
              onContinue()
            }}
          >
            ▶ Continuar
          </button>
        )}
      </div>
      <div className="card-title">{title}</div>
    </div>
  )
}
