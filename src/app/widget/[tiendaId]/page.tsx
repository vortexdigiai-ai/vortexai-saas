import ChatWidget from '../../components/chat-widget'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ tiendaId: string }>
}) {
  const { tiendaId } = await params

  return (
    <main className="bg-transparent min-h-screen pointer-events-none">
      <ChatWidget tiendaId={Number(tiendaId)} />
    </main>
  )
}