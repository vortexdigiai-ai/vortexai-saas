import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'VortexAI — IA para tu ecommerce',description:'Crea y despliega un chatbot IA para tu tienda online.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
