'use client'

import { useState } from 'react';

export default function CatalogoForm({ userId }: { userId: string }) {
  const [nombreTienda, setNombreTienda] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !nombreTienda) {
      setMensaje('Por favor, completa todos los campos y selecciona un archivo CSV.');
      return;
    }

    setLoading(true);
    setMensaje('');

    const formData = new FormData();
    formData.append('archivo_csv', archivo);
    formData.append('user_id', userId);
    formData.append('nombre_tienda', nombreTienda);

    try {
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje(`¡Éxito! Se han subido y procesado ${data.total_productos} productos.`);
      } else {
        setMensaje(`Error: ${data.error || 'No se pudo procesar'}`);
      }
    } catch (err) {
      console.error(err);
      setMensaje('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold text-gray-800">Sube tu Catálogo de Productos</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre de la Tienda</label>
        <input 
          type="text" 
          value={nombreTienda} 
          onChange={(e) => setNombreTienda(e.target.value)}
          required
          className="mt-1 block w-full p-2.5 bg-white border border-gray-300 rounded-md text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Archivo CSV del Catálogo</label>
        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => e.target.files && setArchivo(e.target.files[0])}
          required
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Procesando catálogo...' : 'Subir y Generar Chatbot'}
      </button>

      {mensaje && <p className="text-sm mt-2 text-center text-gray-600">{mensaje}</p>}
    </form>
  );
}