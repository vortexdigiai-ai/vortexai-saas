import ChatWidget from '../../../components/chat-widget'

export default async function Page({
  params,
}: {
  params: Promise<{ tiendaId: string }>
}) {
  const { tiendaId } = await params

  return (
    <div className="bg-transparent w-screen h-screen overflow-hidden pointer-events-none">
      <ChatWidget tiendaId={Number(tiendaId)} />
    </div>
  )
}