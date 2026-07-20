import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { getHistorial, limpiarHistorial } from '../api/HistorialAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, EmptyState, PageHeader, Spinner } from '../components/ui'
import { IconAlerta, IconTrash } from '../components/icons'
import type { HistorialEntry } from '../types'

const fecha = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

export function HistorialView() {
    const { usuario } = useAuth()
    const puedeLimpiar = !!usuario?.permisos.limpiarHistoriales
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({ queryKey: ['historial'], queryFn: getHistorial })

    const limpiar = useMutation({
        mutationFn: limpiarHistorial,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['historial'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading) return <Spinner label="Cargando historial…" />
    const registros = data ?? []

    return (
        <div>
            <PageHeader
                titulo="Historial de cambios"
                descripcion="Últimas 50 modificaciones al BOM, a los equipos y a los costos del catálogo, con su responsable"
                accion={
                    puedeLimpiar &&
                    registros.length > 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (confirm('¿Limpiar todo el historial?')) limpiar.mutate()
                            }}
                        >
                            <IconTrash /> Limpiar
                        </Button>
                    )
                }
            />

            {registros.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <EmptyState
                        titulo="Sin cambios registrados"
                        descripcion="Cuando se edite un componente del BOM, aquí aparecerá el registro con su antes y después."
                    />
                </div>
            ) : (
                <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
                    {registros.map((r) => (
                        <HistorialCard key={r._id} registro={r} />
                    ))}
                </ol>
            )}
        </div>
    )
}

function HistorialCard({ registro: r }: { registro: HistorialEntry }) {
    const afectados = r.equiposAfectados.length > 0 && (
        <>
            {' '}· Afecta {r.equiposAfectados.length > 1 ? 'a los equipos' : 'al equipo'}:{' '}
            <span className="font-medium text-brand-700">{r.equiposAfectados.map((e) => e.nombre).join(', ')}</span>
        </>
    )

    return (
        <li
            className={`relative rounded-xl border p-5 shadow-sm ${
                r.critico ? 'border-red-300 bg-red-50/60' : 'border-slate-200 bg-white'
            }`}
        >
            {/* Punto de la línea de tiempo */}
            <span
                className={`absolute -left-[31px] top-6 h-3 w-3 rounded-full ring-4 ring-white ${
                    r.critico ? 'bg-red-600' : r.sensible ? 'bg-amber-500' : 'bg-brand-500'
                }`}
            />

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            r.critico ? 'bg-red-600 text-white' : 'bg-brand-100 text-brand-700'
                        }`}
                    >
                        {r.usuario.charAt(0).toUpperCase()}
                    </span>
                    <span className={`text-sm font-semibold ${r.critico ? 'text-red-800' : 'text-navy-900'}`}>
                        {r.usuario}
                    </span>
                    {r.critico ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                            <IconAlerta width={12} height={12} /> Eliminación
                        </span>
                    ) : (
                        r.sensible && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                <IconAlerta width={12} height={12} /> Cambio mayor
                            </span>
                        )
                    )}
                </div>
                <span className={`text-xs ${r.critico ? 'text-red-400' : 'text-slate-400'}`}>{fecha(r.createdAt)}</span>
            </div>

            <p className={`text-sm ${r.critico ? 'text-red-900' : 'text-slate-700'}`}>
                {r.tipo === 'equipo' ? (
                    r.critico ? (
                        <>
                            <span className="font-bold text-red-700">Eliminó el equipo</span>{' '}
                            <span className="font-semibold">{r.equipoNombre}</span>
                        </>
                    ) : (
                        <>
                            Modificó la <span className="font-semibold text-amber-700">composición</span> del equipo{' '}
                            <span className="font-semibold text-navy-900">{r.equipoNombre}</span>
                        </>
                    )
                ) : r.tipo === 'material' ? (
                    <>
                        Actualizó el material{' '}
                        <span className="font-mono font-semibold text-brand-700">{r.materialClave}</span>{' '}
                        <span className="font-semibold text-navy-900">{r.materialConcepto}</span>
                        {afectados}
                    </>
                ) : (
                    <>
                        Modificó el componente{' '}
                        <span className="font-semibold text-navy-900">{r.componenteConcepto}</span>
                        {afectados}
                    </>
                )}
            </p>

            <ul className="mt-3 space-y-1.5">
                {r.cambios.map((c, i) => {
                    const [detalle, valores] = c.split(/:\s(.+)/)
                    return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                            <span className="text-slate-600">
                                {valores ? (
                                    <>
                                        <span className="text-slate-500">{detalle}: </span>
                                        <span className="font-medium text-slate-800">{valores}</span>
                                    </>
                                ) : (
                                    <span className="font-medium text-slate-800">{c}</span>
                                )}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </li>
    )
}
