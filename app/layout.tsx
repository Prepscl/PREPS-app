import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Barlow } from 'next/font/google';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const barlow = Barlow({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PREPS — Gestión',
  description: 'Sistema de gestión para PREPS. Diseñado para tu rendimiento.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#080808',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${bebasNeue.variable} ${barlow.variable}`}>
      <body className="bg-[#080808] text-white antialiased font-barlow">
        <div className="min-h-screen pb-[60px]">
          {children}
        </div>
      </body>
    </html>
  );
}
