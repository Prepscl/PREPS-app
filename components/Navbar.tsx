'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, ChefHat, Boxes } from 'lucide-react';
import clsx from 'clsx';

const LINKS = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'INICIO'   },
  { href: '/comandas',   icon: ClipboardList,   label: 'COMANDAS' },
  { href: '/produccion', icon: ChefHat,         label: 'COCINA'   },
  { href: '/inventario', icon: Boxes,           label: 'STOCK'    },
];

export default function Navbar({ pendientes = 0 }: { pendientes?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: '#080808', borderTop: '1px solid #1e1e1e' }}
    >
      <div className="flex items-stretch justify-around h-[60px] max-w-lg mx-auto">
        {LINKS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 flex-1 relative transition-all duration-100',
                active ? 'text-white' : 'text-[#383838] hover:text-[#666]'
              )}
            >
              {/* Línea amarilla arriba en activo */}
              {active && (
                <span className="absolute top-0 left-2 right-2 h-[2px]"
                  style={{ background: '#FFD600' }} />
              )}

              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {href === '/comandas' && pendientes > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 text-black font-bebas text-[10px] rounded-full flex items-center justify-center px-1 animate-pulse-fast"
                    style={{ background: '#FFD600', lineHeight: 1 }}
                  >
                    {pendientes > 9 ? '9+' : pendientes}
                  </span>
                )}
              </div>

              <span
                className="font-barlow font-700 text-[8px] tracking-[0.14em]"
                style={{ color: active ? '#FFD600' : '' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
