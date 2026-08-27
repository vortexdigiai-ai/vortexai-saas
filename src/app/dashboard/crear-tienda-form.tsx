'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function CrearTiendaForm({ userId }: { userId: string }) {
  const [nombreTienda, setNombreTienda] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('tiendas').insert({
      user_id: userId,
      nombre_tienda: nombreTienda,
      plan: 'starter',
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-sm">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Nombre de tu tienda
      </label>
      <input 
      type="text" 
      value={nombreTienda} 
      onChange={(e) => setNombreTienda(e.target.value)}
      required
      className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900" // 👈 Añade esto
/>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear tienda'}
      </button>
    </form>
  )
}