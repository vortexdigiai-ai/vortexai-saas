'use client';

import { FormEvent, useEffect, useState } from 'react';

type Config = {
  nombre_asistente?: string;
  mensaje_bienvenida?: string;
  color_primario?: string;
  accion_fallback?: 'formulario' | 'whatsapp' | 'email';
  whatsapp_soporte?: string | null;
  email_soporte?: string | null;
};

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

type ChatWidgetProps = {
  tiendaId: string;
  visitorId?: string | null;
};

export default function ChatWidget({ tiendaId, visitorId }: ChatWidgetProps) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!tiendaId) return;

    fetch(`/api/obtener-config?tiendaId=${encodeURIComponent(tiendaId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('No se pudo cargar la configuración');
        return r.json();
      })
      .then((config) => {
        setCfg(config);
        setMessages([
          {
            role: 'assistant',
            text:
              config.mensaje_bienvenida ??
              '¡Hola! 👋 ¿En qué puedo ayudarte?',
          },
        ]);
      })
      .catch(() => {
        setCfg(null);
      });
  }, [tiendaId]);

  async function send() {
    const message = text.trim();
    if (!message || sending || !tiendaId) return;

    setSending(true);
    setText('');
    setMessages((current) => [...current, { role: 'user', text: message }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId,
          mensaje: message,
          visitorId: visitorId ?? undefined,
          conversationId,
          inicioWidget: messages.length === 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo procesar el mensaje');
      }

      setConversationId(data.conversationId);

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: data.respuesta ?? 'No he podido responder a esa consulta.',
        },
      ]);

      if (data.debeDerivar) {
        if (data.accionFallback === 'formulario') {
          setShowForm(true);
        }

        if (data.accionFallback === 'whatsapp' && data.whatsappSoporte) {
          const number = String(data.whatsappSoporte).replace(/\D/g, '');
          if (number) {
            window.top?.location.assign(`https://wa.me/${number}`);
          }
        }

        if (data.accionFallback === 'email' && data.emailSoporte) {
          window.top?.location.assign(`mailto:${data.emailSoporte}`);
        }
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text:
            error instanceof Error
              ? error.message
              : 'Ha ocurrido un error. Inténtalo de nuevo.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const response = await fetch('/api/handover-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tiendaId,
        nombre: form.get('nombre'),
        email: form.get('email'),
        mensaje: form.get('mensaje'),
        conversationId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.error ?? 'No se pudo enviar el formulario.');
      return;
    }

    setShowForm(false);
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        text:
          'Gracias. Hemos enviado tus datos al equipo. Puedes seguir preguntándome con normalidad.',
      },
    ]);
  }

  if (!cfg) {
    return null;
  }

  const primary = cfg.color_primario ?? '#f43f5e';

  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-2xl bg-white font-sans text-slate-900 shadow-2xl">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: primary, color: 'white' }}
      >
        <div className="h-9 w-9 rounded-full bg-white/20" />
        <b>{cfg.nombre_asistente ?? 'Asistente Virtual IA'}</b>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}`}
            className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-slate-900 text-white'
                : 'bg-slate-100'
            }`}
          >
            {message.text}
          </div>
        ))}

        {showForm && (
          <form
            className="rounded-2xl border p-3"
            onSubmit={submitForm}
          >
            <input
              required
              name="nombre"
              className="mb-2 w-full rounded-lg border p-2 text-black"
              placeholder="Nombre"
            />
            <input
              required
              type="email"
              name="email"
              className="mb-2 w-full rounded-lg border p-2 text-black"
              placeholder="Email"
            />
            <textarea
              required
              name="mensaje"
              className="mb-2 w-full rounded-lg border p-2 text-black"
              placeholder="¿En qué podemos ayudarte?"
            />
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-white"
              style={{ background: primary }}
            >
              Enviar
            </button>
          </form>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border p-3 text-black outline-none"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') send();
            }}
            placeholder="Escribe tu pregunta…"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="rounded-xl px-4 text-white disabled:opacity-50"
            style={{ background: primary }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
