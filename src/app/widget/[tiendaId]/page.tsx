import ChatWidget from '../../components/chat-widget'

export default async function Page({
  params,
}: {
  params: Promise<{ tiendaId: string }>
}) {
  const { tiendaId } = await params

  return (
    <>
      <style>{`
        html,
        body {
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          background: 'transparent',
          overflow: 'visible',
          zIndex: 999999,
        }}
      >
        <ChatWidget tiendaId={tiendaId} />
      </div>
    </>
  )
}