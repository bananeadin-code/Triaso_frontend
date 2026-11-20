import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getMateriales } from '../api/MaterialesAPI'
import { getEquipos } from '../api/EquiposAPI'
import { getOrdenes, getRecomendaciones } from '../api/OrdenesAPI'
import { getCotizaciones } from '../api/CotizacionesAPI'
import { getProveedores } from '../api/ProveedoresAPI'
import { getInventario } from '../api/InventarioAPI'
import { useAuth } from '../hooks/useAuth'
import { EmptyState, PageHeader, Spinner } from '../components/ui'
import { IconAlerta, IconCheck, IconCotizacion, IconEquipo, IconInventario, IconMaterial, IconMoneda, IconOrden, IconProveedor } from '../components/icons'
import type { EstadoCot, EstadoOrden } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const dias = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

const EST_ORD: Record<EstadoOrden, { label: string; cls: string }> = {
    borrador: { label: 'Borrador', cls: 'bg-slate-100 text-slate-700' },
    enviada: { label: 'Enviada', cls: 'bg-blue-100 text-blue-700' },
    confirmada: { label: 'Confirmada', cls: 'bg-emerald-100 text-emerald-700' },
    cancelada: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
}
const EST_COT: Record<EstadoCot, { label: string; cls: string }> = {
    activa: { label: 'Activa', cls: 'bg-blue-100 text-blue-700' },
    surtida: { label: 'Surtida', cls: 'bg-emerald-100 text-emerald-700' },
    cancelada: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
}

// Selector de panel según el rol
export function DashboardView() {
    const { usuario } = useAuth()
    const nombre = usuario?.nombre?.split(' ')[0] ?? ''
    if (!usuario) return <Spinner label="Cargando panel…" />

    if (usuario.panel === 'cotizador') return <PanelCotizador nombre={nombre} />
    if (usuario.panel === 'comprador') return <PanelComprador nombre={nombre} />
    if (usuario.panel === 'capturista') return <PanelCapturista nombre={nombre} />
    if (usuario.panel === 'almacenista') return <PanelAlmacenista nombre={nombre} />
    return <PanelCompleto nombre={nombre} />
}

// ---------- Panel completo (Admin / Operador general): cockpit operativo ----------
function PanelCompleto({ nombre }: { nombre: string }) {
    const navigate = useNavigate()
    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    const equipos = useQuery({ queryKey: ['equipos'], queryFn: getEquipos })
    const ordenes = useQuery({ queryKey: ['ordenes'], queryFn: getOrdenes })
    const cotizaciones = useQuery({ queryKey: ['cotizaciones'], queryFn: getCotizaciones })
    const recomendaciones = useQuery({ queryKey: ['recomendaciones'], queryFn: getRecomendaciones })

    if (materiales.isLoading || equipos.isLoading || ordenes.isLoading || cotizaciones.isLoading)
        return <Spinner label="Cargando panel…" />

    const listaOrdenes = ordenes.data ?? []
    const listaCot = cotizaciones.data ?? []
    const recs = recomendaciones.data ?? []
    const cotActivas = listaCot.filter((c) => c.estado === 'activa').length
    const enCurso = listaOrdenes.filter((o) => o.estado === 'borrador' || o.estado === 'enviada')
    const enviadasSinConfirmar = listaOrdenes.filter((o) => o.estado === 'enviada')
    // Dinero comprometido en compras en curso (borrador + enviada), en MXN
    const comprometido = enCurso.reduce((s, o) => s + (o.presupuestoEstimado || 0), 0)

    return (
        <div>
            <PageHeader titulo={`Bienvenido, ${nombre}`} descripcion="Panorama general de la empresa" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi titulo="Cotizaciones activas" valor={cotActivas} icono={<IconCotizacion />} enlace="/cotizaciones" />
                <Kpi titulo="Órdenes en curso" valor={enCurso.length} icono={<IconOrden />} enlace="/ordenes" />
                <Kpi titulo="Comprometido en compras" valor={money(comprometido)} icono={<IconMoneda />} enlace="/ordenes" />
                <Kpi titulo="Equipos registrados" valor={(equipos.data ?? []).length} icono={<IconEquipo />} enlace="/equipos" />
            </div>

            {/* Requiere atención: lo que el admin debe empujar */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Panel titulo="Órdenes enviadas sin confirmar" enlace="/ordenes">
                    {enviadasSinConfirmar.length === 0 ? (
                        <EstadoOk texto="No hay órdenes esperando recepción." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {enviadasSinConfirmar.slice(0, 6).map((o) => {
                                const d = dias(o.createdAt)
                                return (
                                    <li
                                        key={o._id}
                                        onClick={() => navigate('/ordenes')}
                                        className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50"
                                    >
                                        <span className="font-mono text-sm font-semibold text-brand-700">{o.folio}</span>
                                        <span className="min-w-0 flex-1 truncate text-sm text-navy-900">{o.proveedor}</span>
                                        <span className="text-sm font-medium text-slate-700">{money(o.presupuestoEstimado)}</span>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                d >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                            }`}
                                            title="Días desde que se envió"
                                        >
                                            {d === 0 ? 'hoy' : `${d} d`}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </Panel>

                <Panel titulo="Recomendaciones pendientes" enlace="/ordenes">
                    {recs.length === 0 ? (
                        <EstadoOk texto="Sin faltantes por reasignar a otro proveedor." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {recs.slice(0, 6).map((r) => (
                                <li
                                    key={r._id}
                                    onClick={() => navigate('/ordenes')}
                                    className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50"
                                >
                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                                        <IconAlerta width={16} height={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-navy-900">
                                            {r.proveedorSnap?.codigo || r.proveedor}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            de {r.folioOrigen} · {r.items.length} material(es)
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ListaCotizaciones cots={listaCot.slice(0, 4)} onVer={(id) => navigate(`/cotizaciones/${id}`)} />
                <ListaOrdenes ordenes={listaOrdenes.slice(0, 5)} onVer={() => navigate('/ordenes')} />
            </div>
        </div>
    )
}

// Estado "todo al día" dentro de un panel
function EstadoOk({ texto }: { texto: string }) {
    return (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-emerald-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <IconCheck width={18} height={18} />
            </span>
            {texto}
        </div>
    )
}

// ---------- Panel Cotizador: resumen de su actividad (solo listas) ----------
function PanelCotizador({ nombre }: { nombre: string }) {
    const navigate = useNavigate()
    const ordenes = useQuery({ queryKey: ['ordenes'], queryFn: getOrdenes })
    const cotizaciones = useQuery({ queryKey: ['cotizaciones'], queryFn: getCotizaciones })
    if (ordenes.isLoading || cotizaciones.isLoading) return <Spinner label="Cargando panel…" />

    return (
        <div>
            <PageHeader titulo={`Bienvenido, ${nombre}`} descripcion="Resumen de cotizaciones y órdenes de compra" />
            <div className="grid gap-6 lg:grid-cols-2">
                <ListaCotizaciones cots={(cotizaciones.data ?? []).slice(0, 6)} onVer={(id) => navigate(`/cotizaciones/${id}`)} />
                <ListaOrdenes ordenes={(ordenes.data ?? []).slice(0, 8)} onVer={() => navigate('/ordenes')} />
            </div>
        </div>
    )
}

// ---------- Panel Comprador: compras y proveedores ----------
function PanelComprador({ nombre }: { nombre: string }) {
    const navigate = useNavigate()
    const ordenes = useQuery({ queryKey: ['ordenes'], queryFn: getOrdenes })
    const proveedores = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    if (ordenes.isLoading || proveedores.isLoading || materiales.isLoading) return <Spinner label="Cargando panel…" />

    const lista = ordenes.data ?? []
    const enCurso = lista.filter((o) => o.estado === 'borrador' || o.estado === 'enviada').length

    return (
        <div>
            <PageHeader titulo={`Bienvenido, ${nombre}`} descripcion="Comprador · órdenes de compra, proveedores y costos" />
            <div className="grid gap-4 sm:grid-cols-3">
                <Kpi titulo="Órdenes en curso" valor={enCurso} icono={<IconOrden />} enlace="/ordenes" />
                <Kpi titulo="Proveedores registrados" valor={(proveedores.data ?? []).length} icono={<IconProveedor />} enlace="/proveedores" />
                <Kpi titulo="Materiales en catálogo" valor={(materiales.data ?? []).length} icono={<IconMaterial />} enlace="/materiales" />
            </div>
            <div className="mt-6">
                <ListaOrdenes ordenes={lista.slice(0, 8)} onVer={() => navigate('/ordenes')} />
            </div>
        </div>
    )
}

// ---------- Panel Capturista: cards de lo que mantiene ----------
function PanelCapturista({ nombre }: { nombre: string }) {
    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    const proveedores = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const equipos = useQuery({ queryKey: ['equipos'], queryFn: getEquipos })
    if (materiales.isLoading || proveedores.isLoading || equipos.isLoading) return <Spinner label="Cargando panel…" />

    return (
        <div>
            <PageHeader
                titulo={`Bienvenido, ${nombre}`}
                descripcion="Capturista · mantén al día los catálogos del sistema"
            />
            <div className="grid gap-4 sm:grid-cols-3">
                <Kpi titulo="Materiales registrados" valor={(materiales.data ?? []).length} icono={<IconMaterial />} enlace="/materiales" />
                <Kpi titulo="Proveedores registrados" valor={(proveedores.data ?? []).length} icono={<IconProveedor />} enlace="/proveedores" />
                <Kpi titulo="Equipos registrados" valor={(equipos.data ?? []).length} icono={<IconEquipo />} enlace="/equipos" />
            </div>
        </div>
    )
}

// ---------- Panel Almacenista: control del inventario ----------
function PanelAlmacenista({ nombre }: { nombre: string }) {
    const navigate = useNavigate()
    const inventario = useQuery({ queryKey: ['inventario'], queryFn: getInventario })
    if (inventario.isLoading) return <Spinner label="Cargando panel…" />

    const items = inventario.data ?? []
    const sinStock = items.filter((i) => i.cantidad <= 0)

    return (
        <div>
            <PageHeader
                titulo={`Bienvenido, ${nombre}`}
                descripcion="Almacenista · controla el stock real y consúltalo contra las cotizaciones"
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <Kpi titulo="Materiales en inventario" valor={items.length} icono={<IconInventario />} enlace="/inventario" />
                <Kpi titulo="Sin existencias" valor={sinStock.length} icono={<IconCotizacion />} enlace="/cotizaciones" />
            </div>

            <div className="mt-6">
                <Panel titulo="Materiales sin existencias" enlace="/inventario">
                    {sinStock.length === 0 ? (
                        <EmptyState titulo="Todo con stock" descripcion="Ningún material está en cero." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sinStock.slice(0, 8).map((i) => (
                                <li key={i._id} onClick={() => navigate('/inventario')} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
                                    <span className="font-mono text-sm font-semibold text-brand-700">{i.material?.clave ?? '—'}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-navy-900">{i.material?.concepto ?? '—'}</span>
                                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Sin stock</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
            <p className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
                Mantén el inventario actualizado (existencias, ubicaciones, mermas) para que las cotizaciones detecten
                correctamente los faltantes. Puedes consultar las cotizaciones en modo lectura.
            </p>
        </div>
    )
}

// ---------- Piezas reutilizables ----------
function ListaCotizaciones({ cots, onVer }: { cots: { _id: string; folio: string; equipoNombre: string; contexto: string; costoCotizacion: number; estado: EstadoCot; createdAt: string }[]; onVer: (id: string) => void }) {
    return (
        <Panel titulo="Últimas cotizaciones" enlace="/cotizaciones">
            {cots.length === 0 ? (
                <EmptyState titulo="Sin cotizaciones" />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {cots.map((c) => (
                        <li key={c._id} onClick={() => onVer(c._id)} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
                            <span className="font-mono text-sm font-semibold text-brand-700">{c.folio}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-navy-900">{c.equipoNombre}</p>
                                <p className="text-xs text-slate-500">
                                    {c.contexto === 'reparacion' ? 'Reparación' : 'Creación'} · {fecha(c.createdAt)}
                                </p>
                            </div>
                            <span className="text-sm font-medium text-slate-700">{money(c.costoCotizacion)}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EST_COT[c.estado].cls}`}>{EST_COT[c.estado].label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}

function ListaOrdenes({ ordenes, onVer }: { ordenes: { _id: string; folio: string; proveedor: string; folioCotizacion: string; totalItems: number; estado: EstadoOrden; costoRealTotal: number; presupuestoEstimado: number }[]; onVer: () => void }) {
    return (
        <Panel titulo="Últimas órdenes de compra" enlace="/ordenes">
            {ordenes.length === 0 ? (
                <EmptyState titulo="Sin órdenes" />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {ordenes.map((o) => (
                        <li key={o._id} onClick={onVer} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
                            <span className="font-mono text-sm font-semibold text-brand-700">{o.folio}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-navy-900">{o.proveedor}</p>
                                <p className="text-xs text-slate-500">
                                    {o.folioCotizacion ? `de ${o.folioCotizacion}` : 'Orden directa'} · {o.totalItems} material(es)
                                </p>
                            </div>
                            <span className="text-sm font-medium text-slate-700">{money(o.estado === 'confirmada' ? o.costoRealTotal : o.presupuestoEstimado)}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EST_ORD[o.estado].cls}`}>{EST_ORD[o.estado].label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}

function Kpi({ titulo, valor, icono, enlace }: { titulo: string; valor: number | string; icono: ReactNode; enlace: string }) {
    return (
        <Link to={enlace} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icono}</span>
            <div className="min-w-0">
                <p
                    className={`truncate font-display font-extrabold text-navy-900 ${
                        typeof valor === 'string' ? 'text-xl' : 'text-2xl'
                    }`}
                >
                    {valor}
                </p>
                <p className="text-xs font-medium text-slate-500">{titulo}</p>
            </div>
        </Link>
    )
}

function Panel({ titulo, enlace, children }: { titulo: string; enlace: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h2 className="font-display text-lg font-bold text-navy-900">{titulo}</h2>
                <Link to={enlace} className="text-xs font-semibold text-brand-600 hover:underline">
                    Ver todo →
                </Link>
            </div>
            {children}
        </div>
    )
}
