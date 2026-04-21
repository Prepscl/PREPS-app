import { NextRequest, NextResponse } from 'next/server';
import { getClientes, upsertCliente, deleteCliente } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientes = await getClientes();
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nombre = (body.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }
    const cliente = await upsertCliente({
      nombre,
      email: body.email ?? '',
      telefono: body.telefono ?? '',
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const ok = await deleteCliente(id);
  return NextResponse.json({ ok });
}
