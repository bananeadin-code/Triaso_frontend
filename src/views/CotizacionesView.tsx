import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { cancelarCotizacion, getCotizacionesPagina, type FiltrosCotizacion } from '../api/CotizacionesAPI'
import { getParidad } from '../api/ParidadAPI'
import { useAuth } from '../hooks/useAuth'
import { Buscador, EmptyState, Input, PageHeader, Select, Spinner } from '../components/ui'
import { Paginacion, POR_PAGINA, useRetrasado } from '../components/Paginacion'
import { SelectBuscable } from '../components/SelectBuscable'
import { IconClose, IconEye, IconTrash } from '../components/icons'
import type { ContextoCot, EstadoCot } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
// Mismo formato que la tabla del módulo Paridad
const fechaParidad = fecha

const CTX_STYLE: Record<ContextoCot, string> = {
    creacion: 'bg-brand-100 text-brand-700',
    reparacion: 'bg-amber-100 text-amber-700',
}
const EST_STYLE: Record<EstadoCot, string> = {
    activa: 'bg-blue-100 text-blue-700',
    surtida: 'bg-emerald-100 text-emerald-700',
    cancelada: 'bg-red-100 text-red-700',
}

// Filtros que viven en la URL (?paridad=…&tcMin=…): así un enlace desde Paridad abre la lista
// ya filtrada y "atrás" desde el detalle regresa con los mismos filtros.
const CLAVES = ['q', 'estado', 'contexto', 'paridad', 'tcMin', 'tcMax', 'desde', 'hasta'] as const

export function CotizacionesView() {
    const { puede } = useAuth()
    // Cancelar una cotización es su "eliminar" (individual; no hay limpiezas masivas)
    const puedeEliminar = puede('cotizaciones', 'eliminar')
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [params, setParams] = useSearchParams()

    const filtros: FiltrosCotizacion = Object.fromEntries(CLAVES.map((k) => [k, params.get(k) ?? ''])) as FiltrosCotizacion
    const pagina = Math.max(1, Number(params.get('pagina')) || 1)
    const set = (cambios: Partial<Record<(typeof CLAVES)[number] | 'pagina', string>>) => {
        const sig = new URLSearchParams(params)
        for (const [k, v] of Object.entries(cambios)) v ? sig.set(k, v) : sig.delete(k)
        // Cambiar cualquier filtro regresa a la página 1
        if (!('pagina' in cambios)) sig.delete('pagina')
        setParams(sig, { replace: true })
    }

    // El texto y los rangos se consultan cuando el usuario deja de teclear
    // (se compara como texto: el objeto se recrea en cada render)
    const filtrosTexto = useRetrasado(JSON.stringify(filtros))
    const filtrosConsulta = useMemo(() => JSON.parse(filtrosTexto) as FiltrosCotizacion, [filtrosTexto])
    const consulta = useQuery({
        queryKey: ['cotizaciones', 'pagina', pagina, filtrosConsulta],
        queryFn: () => getCotizacionesPagina(pagina, POR_PAGINA, filtrosConsulta),
        placeholderData: keepPreviousData,
    })
    const paridad = useQuery({ queryKey: ['paridad'], queryFn: getParidad })
    const registros = paridad.data ?? []
    const registroSel = registros.find((r) => r._id === filtros.paridad)

    const cancelar = useMutation({
        mutationFn: cancelarCotizacion,
        onSuccess: (res) => {
            toast.success(`${res.mensaje} · ${res.ordenesEliminadas} orden(es) borrador eliminada(s)`)
            queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (consulta.isLoading) return <Spinner label="Cargando cotizaciones…" />
    const datos = consulta.data
    const cotizaciones = datos?.items ?? []
    const hayFiltros = CLAVES.some((k) => filtros[k])
    const avanzados = ['contexto', 'tcMin', 'tcMax', 'desde', 'hasta'].filter((k) => filtros[k as keyof FiltrosCotizacion]).length

    return (
        <div>
            <PageHeader
                titulo="Cotizaciones"
                descripcion="Cotizaciones de equipos (creación o reparación) con su costo de materiales"
            />

            {/* Filtros principales */}
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="lg:max-w-xs lg:flex-1">
                    <Buscador value={filtros.q ?? ''} onChange={(v) => set({ q: v })} placeholder="Buscar por folio o equipo…" />
                </div>
                <Select value={filtros.estado} onChange={(e) => set({ estado: e.target.value })} className="lg:w-44" aria-label="Estado">
                    <option value="">Todos los estados</option>
                    <option value="activa">Activa</option>
                    <option value="surtida">Surtida</option>
                    <option value="cancelada">Cancelada</option>
                </Select>
                <div className="lg:w-80">
                    <SelectBuscable
                        value={filtros.paridad ?? ''}
                        onChange={(v) => set({ paridad: v })}
                        vacio="Cualquier registro de paridad"
                        aria-label="Registro de paridad"
                        opciones={registros.map((r) => ({
                            value: r._id,
                            label: `$${r.valor.toFixed(4)} · ${fechaParidad(r.fecha)}`,
                            detalle: `${r.cotizaciones} cotización(es)`,
                        }))}
                    />
                </div>
                {hayFiltros && (
                    <button
                        onClick={() => setParams(new URLSearchParams(), { replace: true })}
                        className="text-sm text-slate-500 underline hover:text-brand-700"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Filtros flexibles: rango de tipo de cambio, fechas y contexto */}
            <details className="mb-4 rounded-lg border border-slate-200 bg-white" open={avanzados > 0}>
                <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-slate-600">
                    Más filtros {avanzados > 0 && <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">{avanzados}</span>}
                </summary>
                <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="block text-xs font-medium text-slate-500">
                        Tipo de cambio desde
                        <Input type="number" step="0.0001" min="0" value={filtros.tcMin} onChange={(e) => set({ tcMin: e.target.value })} placeholder="Ej. 17.00" className="mt-1" />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                        Tipo de cambio hasta
                        <Input type="number" step="0.0001" min="0" value={filtros.tcMax} onChange={(e) => set({ tcMax: e.target.value })} placeholder="Ej. 18.50" className="mt-1" />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                        Creada desde
                        <Input type="date" value={filtros.desde} onChange={(e) => set({ desde: e.target.value })} className="mt-1" />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                        Creada hasta
                        <Input type="date" value={filtros.hasta} onChange={(e) => set({ hasta: e.target.value })} className="mt-1" />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                        Contexto
                        <Select value={filtros.contexto} onChange={(e) => set({ contexto: e.target.value })} className="mt-1">
                            <option value="">Creación y reparación</option>
                            <option value="creacion">Creación</option>
                            <option value="reparacion">Reparación</option>
                        </Select>
                    </label>
                </div>
            </details>

            {/* Aviso del filtro por paridad (p. ej. al llegar desde el módulo Paridad) */}
            {filtros.paridad && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800">
                    Cotizaciones convertidas con el registro de paridad{' '}
                    <strong>{registroSel ? `$${registroSel.valor.toFixed(4)} del ${fechaParidad(registroSel.fecha)}` : ''}</strong>
                    <button
                        onClick={() => set({ paridad: '' })}
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium hover:bg-brand-100"
                        aria-label="Quitar filtro de paridad"
                    >
                        <IconClose width={14} height={14} /> Quitar
                    </button>
                </div>
            )}

            <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${consulta.isFetching ? 'opacity-70' : ''}`}>
                {cotizaciones.length === 0 ? (
                    <EmptyState
                        titulo="Sin cotizaciones"
                        descripcion={
                            hayFiltros
                                ? 'Ninguna cotización coincide con los filtros.'
                                : 'Genera una cotización desde la tabla de Equipos (acción Cotizar).'
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Folio</th>
                                    <th className="px-4 py-3">Equipo</th>
                                    <th className="px-4 py-3 text-center">Contexto</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-right">Costo</th>
                                    <th className="px-4 py-3 text-right" title="Tipo de cambio con que se convirtió">T.C.</th>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cotizaciones.map((c) => (
                                    <tr
                                        key={c._id}
                                        className="cursor-pointer transition-colors hover:bg-slate-50"
                                        onClick={() => navigate(`/cotizaciones/${c._id}`)}
                                    >
                                        <td className="px-4 py-3 font-mono font-semibold text-brand-700">{c.folio}</td>
                                        <td className="px-4 py-3 font-semibold text-navy-900">{c.equipoNombre}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CTX_STYLE[c.contexto]}`}>
                                                {c.contexto === 'creacion' ? 'Creación' : 'Reparación'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EST_STYLE[c.estado]}`}>
                                                {c.estado === 'activa' ? 'Activa' : c.estado === 'surtida' ? 'Surtida' : 'Cancelada'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                                            {money(c.costoCotizacion)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600" onClick={(ev) => ev.stopPropagation()}>
                                            {c.tipoCambio > 0 ? (
                                                c.paridad ? (
                                                    // Clic = ver todas las que se convirtieron con ese mismo registro
                                                    <button
                                                        onClick={() => set({ paridad: c.paridad ?? '' })}
                                                        className="rounded px-1 font-mono hover:bg-brand-50 hover:text-brand-700"
                                                        title="Ver las cotizaciones con este mismo registro de paridad"
                                                    >
                                                        {c.tipoCambio.toFixed(4)}
                                                    </button>
                                                ) : (
                                                    <span className="font-mono">{c.tipoCambio.toFixed(4)}</span>
                                                )
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{fecha(c.createdAt)}</td>
                                        <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/cotizaciones/${c._id}`)}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                    title="Ver detalles"
                                                >
                                                    <IconEye />
                                                </button>
                                                {puedeEliminar && c.estado === 'activa' && (
                                                    <button
                                                        onClick={() => {
                                                            if (
                                                                confirm(
                                                                    `¿Cancelar la cotización ${c.folio}? Se eliminarán las órdenes de compra asociadas que aún NO se hayan enviado o recibido.`
                                                                )
                                                            )
                                                                cancelar.mutate(c._id)
                                                        }}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                        title="Cancelar cotización"
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {datos && (
                    <Paginacion
                        pagina={datos.pagina}
                        paginas={datos.paginas}
                        total={datos.total}
                        limite={datos.limite}
                        onPagina={(p) => set({ pagina: String(p) })}
                    />
                )}
            </div>
        </div>
    )
}
