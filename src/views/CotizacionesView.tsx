import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
    cancelarCotizacion,
    getCotizaciones,
    limpiarCotizacionesCanceladas,
    limpiarCotizacionesTerminadas,
} from '../api/CotizacionesAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, EmptyState, PageHeader, Spinner } from '../components/ui'
import { IconEye, IconTrash } from '../components/icons'
import type { ContextoCot, EstadoCot } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const CTX_STYLE: Record<ContextoCot, string> = {
    creacion: 'bg-brand-100 text-brand-700',
    reparacion: 'bg-amber-100 text-amber-700',
}
const EST_STYLE: Record<EstadoCot, string> = {
    activa: 'bg-blue-100 text-blue-700',
    surtida: 'bg-emerald-100 text-emerald-700',
    cancelada: 'bg-red-100 text-red-700',
}

export function CotizacionesView() {
    const { usuario, puede } = useAuth()
    const puedeCotizar = puede('cotizaciones', 'escritura')
    const puedeLimpiar = !!usuario?.permisos.limpiarHistoriales
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const { data, isLoading } = useQuery({ queryKey: ['cotizaciones'], queryFn: getCotizaciones })

    const cancelar = useMutation({
        mutationFn: cancelarCotizacion,
        onSuccess: (res) => {
            toast.success(`${res.mensaje} · ${res.ordenesEliminadas} orden(es) borrador eliminada(s)`)
            queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const limpiar = useMutation({
        mutationFn: limpiarCotizacionesTerminadas,
        onSuccess: (res) => {
            toast.success(`${res.mensaje}: ${res.eliminadas}`)
            queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const limpiarCanceladas = useMutation({
        mutationFn: limpiarCotizacionesCanceladas,
        onSuccess: (res) => {
            toast.success(`${res.mensaje}: ${res.eliminadas}`)
            queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading) return <Spinner label="Cargando cotizaciones…" />
    const cotizaciones = data ?? []
    const hayTerminadas = cotizaciones.some((c) => c.estado === 'surtida' || c.estado === 'cancelada')
    const hayCanceladas = cotizaciones.some((c) => c.estado === 'cancelada')

    return (
        <div>
            <PageHeader
                titulo="Cotizaciones"
                descripcion="Cotizaciones de equipos (creación o reparación) con su costo de materiales"
                accion={
                    puedeCotizar &&
                    puedeLimpiar &&
                    (hayTerminadas || hayCanceladas) && (
                        <div className="flex flex-wrap gap-2">
                            {hayCanceladas && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        if (confirm('¿Eliminar TODAS las cotizaciones canceladas? Esta acción no se puede deshacer.'))
                                            limpiarCanceladas.mutate()
                                    }}
                                >
                                    <IconTrash /> Limpiar canceladas
                                </Button>
                            )}
                            {hayTerminadas && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                '¿Eliminar las cotizaciones terminadas (surtidas/canceladas) con más de 90 días de antigüedad?'
                                            )
                                        )
                                            limpiar.mutate()
                                    }}
                                >
                                    <IconTrash /> Limpiar terminadas (+90 días)
                                </Button>
                            )}
                        </div>
                    )
                }
            />

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {cotizaciones.length === 0 ? (
                    <EmptyState
                        titulo="Sin cotizaciones"
                        descripcion="Genera una cotización desde la tabla de Equipos (acción Cotizar)."
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
                                                {puedeCotizar && c.estado === 'activa' && (
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
            </div>
        </div>
    )
}
