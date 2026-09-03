'use client';

import { useParams, useSearchParams } from 'next/navigation';
import ChatWidget from '@/components/ChatWidget';

export default function WidgetPage() {
  const { tiendaId } = useParams<{ tiendaId: string }>();
  const searchParams = useSearchParams();

  return (
    <ChatWidget
      tiendaId={tiendaId}
      visitorId={searchParams.get('visitorId')}
    />
  );
}
