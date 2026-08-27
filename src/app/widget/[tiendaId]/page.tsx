import ChatWidget from '../../components/chat-widget'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ tiendaId: string }>
}) {
  const { tiendaId } = await params

  return (
    <div className="bg-transparent">
      <ChatWidget tiendaId={Number(tiendaId)} />
    </div>
  )
}