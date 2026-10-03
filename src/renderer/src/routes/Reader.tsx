export default function Reader({
  mangaId,
  chapterId
}: {
  mangaId: number
  chapterId: number
}): React.JSX.Element {
  return (
    <p className="muted pad">
      El lector llegará en la Fase 6 (manga {mangaId}, capítulo {chapterId}).
    </p>
  )
}
