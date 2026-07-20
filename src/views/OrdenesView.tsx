import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
    crearOrden,
    actualizarOrden,
    confirmarRecepcion,
    descargarOrdenPDF,
    eliminarOrden,
    eliminarRecomendacion,
    finalizarRecomendacion,
    getOrden,
    getOrdenes,
    getRecomendaciones,
    limpiarOrdenesCompletadas,
    marcarEnviada,
    registrarFaltantes,
} from '../api/OrdenesAPI'
import { getProveedores, getProveedor } from '../api/ProveedoresAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { IconAlerta, IconCheck, IconDownload, IconEdit, IconMail, IconMoneda, IconPlus, IconTrash } from '../components/icons'
import type { EstadoOrden, OrdenItemInput, OrdenListItem, Recomendacion } from '../types'

// Mensajes de resultado del envío de correo
const CORREO_TOAST: Record<string, { tipo: 'success' | 'info' | 'warn'; msg: string }> = {
    enviado: { tipo: 'success', msg: 'Orden enviada y correo entregado al proveedor.' },
    no_solicitado: { tipo: 'success', msg: 'Orden marcada como enviada.' },
    sin_correo: { tipo: 'info', msg: 'Orden enviada. El proveedor no tiene correo registrado.' },
    sin_credenciales: {
        tipo: 'info',
        msg: 'Orden enviada. Falta configurar el correo de Triaso (Gmail) para el envío automático.',
    },
    error_envio: { tipo: 'warn', msg: 'Orden enviada, pero no se pudo entregar el correo.' },
}

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const ESTADO_STYLE: Record<EstadoOrden, string> = {
    borrador: 'bg-slate-100 text-slate-700',
    enviada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-emerald-100 text-emerald-700',
    cancelada: 'bg-red-100 text-red-700',
}
const ESTADO_LABEL: Record<EstadoOrden, string> = {
    borrador: 'Borrador',
    enviada: 'Enviada',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
}

export function OrdenesView() {
    const { usuario, puede } = useAuth()
    const puedeComprar = puede('ordenes', 'escritura')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const puedeLimpiar = !!usuario?.permisos.limpiarHistoriales
    const queryClient = useQueryClient()

    const [builderAbierto, setBuilderAbierto] = useState(false)
    const [editandoId, setEditandoId] = useState<string | null>(null)
    const [ordenAEnviar, setOrdenAEnviar] = useState<OrdenListItem | null>(null)
    const [faltantesOrden, setFaltantesOrden] = useState<OrdenListItem | null>(null)
    const [editandoTotal, setEditandoTotal] = useState<OrdenListItem | null>(null)
    const [editandoCostos, setEditandoCostos] = useState<OrdenListItem | null>(null)
    const [confirmandoOrden, setConfirmandoOrden] = useState<OrdenListItem | null>(null)
    const [vista, setVista] = useState<'ordenes' | 'recomendaciones'>('ordenes')

    const { data, isLoading } = useQuery({ queryKey: ['ordenes'], queryFn: getOrdenes })
    const recomendaciones = useQuery({ queryKey: ['recomendaciones'], queryFn: getRecomendaciones })
    const numRecs = recomendaciones.data?.length ?? 0

    const eliminar = useMutation({
        mutationFn: eliminarOrden,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const limpiar = useMutation({
        mutationFn: limpiarOrdenesCompletadas,
        onSuccess: (res) => {
            toast.success(`${res.mensaje}: ${res.eliminadas}`)
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const enviar = useMutation({
        mutationFn: ({ id, correo }: { id: string; correo: boolean }) => marcarEnviada(id, correo),
        onSuccess: (res) => {
            const info = CORREO_TOAST[res.correo] ?? CORREO_TOAST.no_solicitado
            if (info.tipo === 'success') toast.success(info.msg)
            else if (info.tipo === 'warn') toast.warn(info.msg)
            else toast.info(info.msg)
            setOrdenAEnviar(null)
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading) return <Spinner label="Cargando órdenes…" />
    const ordenes = data ?? []

    return (
        <div>
            <PageHeader
                titulo="Órdenes de compra"
                descripcion="Genera y da seguimiento a las órdenes por proveedor"
                accion={
                    <div className="flex flex-wrap gap-2">
                        {puedeReporte && (
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    descargarReporte('ordenes', 'ordenes-compra-triaso.pdf').catch((e) => toast.error(e.message))
                                }
                            >
                                <IconDownload /> Reporte PDF
                            </Button>
                        )}
                        {puedeComprar && (
                            <>
                                {puedeLimpiar && ordenes.some((o) => o.estado === 'confirmada') && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    '¿Eliminar las órdenes completadas con más de 90 días de antigüedad?'
                                                )
                                            )
                                                limpiar.mutate()
                                        }}
                                    >
                                        <IconTrash /> Limpiar completadas (+90 días)
                                    </Button>
                                )}
                                <Button
                                    onClick={() => {
                                        setEditandoId(null)
                                        setBuilderAbierto(true)
                                    }}
                                >
                                    <IconPlus /> Nueva orden
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            {/* Pestañas */}
            <div className="mb-4 flex gap-1 border-b border-slate-200">
                <button
                    onClick={() => setVista('ordenes')}
                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        vista === 'ordenes'
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Órdenes
                </button>
                <button
                    onClick={() => setVista('recomendaciones')}
                    className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        vista === 'recomendaciones'
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Recomendaciones
                    {numRecs > 0 && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                            {numRecs}
                        </span>
                    )}
                </button>
            </div>

            {vista === 'recomendaciones' && (
                <RecomendacionesPanel
                    recomendaciones={recomendaciones.data ?? []}
                    cargando={recomendaciones.isLoading}
                    puedeComprar={puedeComprar}
                />
            )}

            {vista === 'ordenes' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {ordenes.length === 0 ? (
                    <EmptyState titulo="Sin órdenes" descripcion="Crea tu primera orden de compra a un proveedor." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Folio</th>
                                    <th className="px-4 py-3">Proveedor</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-center">Materiales</th>
                                    <th className="px-4 py-3 text-right">Total estimado</th>
                                    {puedeComprar && <th className="px-4 py-3 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ordenes.map((o) => (
                                    <tr key={o._id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-mono font-semibold text-brand-700">{o.folio}</div>
                                            {o.folioCotizacion && (
                                                <span className="mt-0.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                    de {o.folioCotizacion}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="leading-tight">
                                                <div className="font-semibold text-navy-900">{o.proveedor}</div>
                                                <div className="text-xs text-slate-500">{o.razonSocial}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span
                                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_STYLE[o.estado]}`}
                                                >
                                                    {ESTADO_LABEL[o.estado]}
                                                </span>
                                                {o.correoEnviado && (
                                                    <span className="text-emerald-600" title="Correo enviado al proveedor">
                                                        <IconMail width={14} height={14} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600">{o.totalItems}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                                            {o.estado === 'confirmada' ? (
                                                <div className="leading-tight">
                                                    <div>{money(o.costoRealTotal)}</div>
                                                    <div className="text-xs font-normal text-emerald-600">real</div>
                                                </div>
                                            ) : (
                                                money(o.presupuestoEstimado)
                                            )}
                                        </td>
                                        {puedeComprar && (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {o.estado === 'borrador' && (
                                                        <>
                                                            <button
                                                                onClick={() => setOrdenAEnviar(o)}
                                                                className="rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                                                title="Marcar como enviada"
                                                            >
                                                                <IconMail />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditandoId(o._id)
                                                                    setBuilderAbierto(true)
                                                                }}
                                                                className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                                title="Editar"
                                                            >
                                                                <IconEdit />
                                                            </button>
                                                        </>
                                                    )}
                                                    {o.estado === 'enviada' && (
                                                        <>
                                                            <button
                                                                onClick={() => setFaltantesOrden(o)}
                                                                className="rounded-md p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                                                                title="Marcar faltantes"
                                                            >
                                                                <IconAlerta />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditandoCostos(o)}
                                                                className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                                title="Editar costos de productos"
                                                            >
                                                                <IconMoneda />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditandoTotal(o)}
                                                                className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                                title="Editar total estimado"
                                                            >
                                                                <IconEdit />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmandoOrden(o)}
                                                                className="rounded-md p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                                                title="Confirmar recepción"
                                                            >
                                                                <IconCheck />
                                                            </button>
                                                        </>
                                                    )}
                                                    {(o.estado === 'enviada' || o.estado === 'confirmada') && (
                                                        <button
                                                            onClick={() => descargarOrdenPDF(o._id, o.folio)}
                                                            className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                            title="Descargar PDF (ticket)"
                                                        >
                                                            <IconDownload />
                                                        </button>
                                                    )}
                                                    {o.estado !== 'confirmada' && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`¿Eliminar la orden ${o.folio}?`))
                                                                    eliminar.mutate(o._id)
                                                            }}
                                                            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                            title="Eliminar"
                                                        >
                                                            <IconTrash />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}

            {faltantesOrden && (
                <FaltantesModal
                    orden={faltantesOrden}
                    onClose={() => setFaltantesOrden(null)}
                    onSaved={() => {
                        setFaltantesOrden(null)
                        queryClient.invalidateQueries({ queryKey: ['ordenes'] })
                        queryClient.invalidateQueries({ queryKey: ['recomendaciones'] })
                    }}
                />
            )}

            {editandoTotal && (
                <EditarTotalModal
                    orden={editandoTotal}
                    onClose={() => setEditandoTotal(null)}
                    onSaved={() => {
                        setEditandoTotal(null)
                        queryClient.invalidateQueries({ queryKey: ['ordenes'] })
                    }}
                />
            )}

            {confirmandoOrden && (
                <ConfirmarRecepcionModal
                    orden={confirmandoOrden}
                    onClose={() => setConfirmandoOrden(null)}
                    onSaved={() => {
                        setConfirmandoOrden(null)
                        queryClient.invalidateQueries({ queryKey: ['ordenes'] })
                        queryClient.invalidateQueries({ queryKey: ['inventario'] })
                    }}
                />
            )}

            {editandoCostos && (
                <EditarCostosModal
                    orden={editandoCostos}
                    onClose={() => setEditandoCostos(null)}
                    onSaved={() => {
                        setEditandoCostos(null)
                        queryClient.invalidateQueries({ queryKey: ['ordenes'] })
                        queryClient.invalidateQueries({ queryKey: ['materiales'] })
                        queryClient.invalidateQueries({ queryKey: ['componentes'] })
                    }}
                />
            )}

            {builderAbierto && (
                <OrdenBuilderModal
                    ordenId={editandoId}
                    onClose={() => setBuilderAbierto(false)}
                    onSaved={() => {
                        setBuilderAbierto(false)
                        queryClient.invalidateQueries({ queryKey: ['ordenes'] })
                    }}
                />
            )}

            {ordenAEnviar && (
                <EnviarModal
                    orden={ordenAEnviar}
                    enviando={enviar.isPending}
                    onClose={() => setOrdenAEnviar(null)}
                    onConfirmar={(correo) => enviar.mutate({ id: ordenAEnviar._id, correo })}
                />
            )}
        </div>
    )
}

// ---------- Modal: marcar enviada + pregunta del correo ----------
function EnviarModal({
    orden,
    enviando,
    onClose,
    onConfirmar,
}: {
    orden: OrdenListItem
    enviando: boolean
    onClose: () => void
    onConfirmar: (enviarCorreo: boolean) => void
}) {
    // Trae el correo real del proveedor de la orden
    const detalle = useQuery({ queryKey: ['orden', orden._id], queryFn: () => getOrden(orden._id) })
    const email = detalle.data?.proveedorSnap?.email

    return (
        <Modal open onClose={onClose} titulo={`Enviar orden ${orden.folio}`}>
            <p className="text-sm text-slate-600">
                ¿Enviar automáticamente esta orden al correo del proveedor{' '}
                <span className="font-semibold text-navy-900">{orden.proveedor}</span>?
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {detalle.isLoading ? (
                    <span className="text-slate-400">Cargando datos del proveedor…</span>
                ) : email ? (
                    <span className="text-slate-700">
                        Se enviará a <span className="font-medium">{email}</span> con el ticket en PDF adjunto.
                    </span>
                ) : (
                    <span className="text-amber-600">
                        Este proveedor no tiene correo registrado. Puedes marcarla como enviada de todos modos.
                    </span>
                )}
            </div>

            <div className="mt-5 flex flex-col justify-end gap-2 border-t border-slate-200 pt-4 sm:flex-row">
                <Button variant="secondary" onClick={onClose} disabled={enviando}>
                    Cancelar
                </Button>
                <Button variant="secondary" onClick={() => onConfirmar(false)} disabled={enviando}>
                    Solo marcar enviada
                </Button>
                <Button onClick={() => onConfirmar(true)} disabled={enviando || !email}>
                    {enviando ? 'Procesando…' : 'Sí, enviar correo'}
                </Button>
            </div>
        </Modal>
    )
}

// ---------- Constructor de orden ----------
interface Seleccion {
    checked: boolean
    cantidad: number
    costo?: number
    costoOriginal?: number
}

// Cambio de costo detectado para preguntar si se actualiza en todo el sistema
interface CambioCosto {
    material: string
    clave: string
    concepto: string
    costoAnterior: number
    costoNuevo: number
}

function OrdenBuilderModal({
    ordenId,
    onClose,
    onSaved,
}: {
    ordenId: string | null
    onClose: () => void
    onSaved: () => void
}) {
    const esEdicion = Boolean(ordenId)

    const proveedores = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const ordenExistente = useQuery({
        queryKey: ['orden', ordenId],
        queryFn: () => getOrden(ordenId!),
        enabled: esEdicion,
    })

    const [proveedorId, setProveedorId] = useState('')
    const [selecciones, setSelecciones] = useState<Record<string, Seleccion>>({})
    const [totalManual, setTotalManual] = useState<number | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [pendiente, setPendiente] = useState<{ items: OrdenItemInput[]; cambios: CambioCosto[] } | null>(null)

    // Materiales asociados al proveedor elegido
    const detalleProveedor = useQuery({
        queryKey: ['proveedor', proveedorId],
        queryFn: () => getProveedor(proveedorId),
        enabled: !!proveedorId,
    })
    const materiales = detalleProveedor.data?.materiales ?? []

    // Al cargar una orden existente, prefija proveedor, selecciones y total
    useEffect(() => {
        if (ordenExistente.data) {
            setProveedorId(ordenExistente.data.proveedor)
            const sel: Record<string, Seleccion> = {}
            ordenExistente.data.items.forEach((it) => {
                if (it.material)
                    sel[it.material] = {
                        checked: true,
                        cantidad: it.cantidad,
                        costo: it.costoUnitario,
                        costoOriginal: it.costoUnitario,
                    }
            })
            setSelecciones(sel)
            setTotalManual(ordenExistente.data.presupuestoEstimado)
        }
    }, [ordenExistente.data])

    const setSel = (id: string, patch: Partial<Seleccion>) =>
        setSelecciones((s) => {
            const prev = s[id] ?? { checked: false, cantidad: 1 }
            return { ...s, [id]: { ...prev, ...patch } }
        })

    // Subtotal calculado a partir de las selecciones (usa el costo editado)
    const subtotal = useMemo(() => {
        return materiales.reduce((acc, m) => {
            const sel = selecciones[m._id]
            if (sel?.checked) acc += (sel.cantidad || 0) * (sel.costo ?? m.costoUnitario)
            return acc
        }, 0)
    }, [materiales, selecciones])

    const totalEstimado = totalManual ?? subtotal

    const guardar = () => {
        const seleccionados = materiales.filter(
            (m) => selecciones[m._id]?.checked && (selecciones[m._id]?.cantidad || 0) > 0
        )
        if (!proveedorId) return toast.error('Selecciona un proveedor')
        if (seleccionados.length === 0) return toast.error('Selecciona al menos un material con cantidad')

        const items: OrdenItemInput[] = seleccionados.map((m) => ({
            material: m._id,
            cantidad: selecciones[m._id].cantidad,
            costoUnitario: selecciones[m._id].costo ?? m.costoUnitario,
        }))
        // Detecta costos que el usuario cambió respecto a su valor original/catálogo
        const cambios: CambioCosto[] = seleccionados
            .map((m) => {
                const costoNuevo = selecciones[m._id].costo ?? m.costoUnitario
                const costoAnterior = selecciones[m._id].costoOriginal ?? m.costoUnitario
                return { material: m._id, clave: m.clave, concepto: m.concepto, costoAnterior, costoNuevo }
            })
            .filter((c) => c.costoNuevo !== c.costoAnterior)

        if (cambios.length > 0) {
            setPendiente({ items, cambios })
            return
        }
        doGuardar(items, [])
    }

    const doGuardar = async (items: OrdenItemInput[], materialesGlobal: string[]) => {
        setGuardando(true)
        try {
            if (esEdicion && ordenId) {
                const res = await actualizarOrden(ordenId, { items, presupuestoEstimado: totalEstimado, materialesGlobal })
                toast.success(res.mensaje)
            } else {
                const res = await crearOrden({ proveedor: proveedorId, items, presupuestoEstimado: totalEstimado, materialesGlobal })
                toast.success(`${res.mensaje} · ${res.folio}`)
            }
            setPendiente(null)
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        } finally {
            setGuardando(false)
        }
    }

    const cargando = proveedores.isLoading || (esEdicion && ordenExistente.isLoading)

    return (
        <Modal open onClose={onClose} titulo={esEdicion ? 'Editar orden' : 'Nueva orden de compra'} ancho="max-w-3xl">
            {cargando ? (
                <Spinner label="Cargando…" />
            ) : (
                <div className="space-y-4">
                    <Field label="Proveedor" required>
                        <Select
                            value={proveedorId}
                            onChange={(e) => {
                                setProveedorId(e.target.value)
                                setSelecciones({})
                                setTotalManual(null)
                            }}
                            disabled={esEdicion}
                        >
                            <option value="">— Selecciona un proveedor —</option>
                            {(proveedores.data ?? []).map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.codigo} · {p.razonSocial}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    {proveedorId && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">
                                Materiales asociados — selecciona los que van en la orden
                            </p>
                            {detalleProveedor.isLoading ? (
                                <Spinner label="Cargando materiales…" />
                            ) : materiales.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                                    Este proveedor no tiene materiales asociados.
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                <th className="px-3 py-2"></th>
                                                <th className="px-3 py-2">Clave</th>
                                                <th className="px-3 py-2">Concepto</th>
                                                <th className="px-3 py-2 text-right">Costo unit.</th>
                                                <th className="px-3 py-2 text-center">Cantidad</th>
                                                <th className="px-3 py-2 text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {materiales.map((m) => {
                                                const sel = selecciones[m._id]
                                                const checked = sel?.checked ?? false
                                                const cantidad = sel?.cantidad ?? 1
                                                const costo = sel?.costo ?? m.costoUnitario
                                                return (
                                                    <tr key={m._id} className={checked ? 'bg-brand-50/40' : ''}>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) =>
                                                                    setSel(m._id, { checked: e.target.checked })
                                                                }
                                                                className="rounded"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 font-mono font-semibold text-brand-700">
                                                            {m.clave}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700">{m.concepto}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={costo}
                                                                disabled={!checked}
                                                                onChange={(e) =>
                                                                    setSel(m._id, { costo: Number(e.target.value) })
                                                                }
                                                                className="w-24 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={cantidad}
                                                                disabled={!checked}
                                                                onChange={(e) =>
                                                                    setSel(m._id, {
                                                                        cantidad: Number(e.target.value),
                                                                    })
                                                                }
                                                                className="w-20 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-medium text-slate-800">
                                                            {checked ? money(cantidad * costo) : '—'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {proveedorId && materiales.length > 0 && (
                        <div className="flex flex-col items-end gap-2 border-t border-slate-200 pt-4">
                            <div className="text-sm text-slate-500">
                                Subtotal calculado: <span className="font-semibold text-slate-700">{money(subtotal)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-700">Total estimado (editable):</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={totalEstimado}
                                    onChange={(e) => setTotalManual(Number(e.target.value))}
                                    className="w-36 text-right"
                                />
                                {totalManual !== null && (
                                    <button
                                        onClick={() => setTotalManual(null)}
                                        className="text-xs font-medium text-brand-600 hover:underline"
                                        title="Volver al subtotal calculado"
                                    >
                                        ↺ usar subtotal
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={guardar} disabled={guardando}>
                            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear orden'}
                        </Button>
                    </div>
                </div>
            )}
            {pendiente && (
                <ActualizarCostosGlobalModal
                    cambios={pendiente.cambios}
                    guardando={guardando}
                    onGuardar={(ids) => doGuardar(pendiente.items, ids)}
                    onCancelar={() => setPendiente(null)}
                />
            )}
        </Modal>
    )
}

// ---------- Modal: ¿actualizar costos en todo el sistema? ----------
function ActualizarCostosGlobalModal({
    cambios,
    guardando,
    onGuardar,
    onCancelar,
}: {
    cambios: CambioCosto[]
    guardando: boolean
    onGuardar: (materialesGlobal: string[]) => void
    onCancelar: () => void
}) {
    const [sel, setSel] = useState<string[]>([])
    const money2 = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

    return (
        <Modal open onClose={onCancelar} titulo="Cambiaron costos de materiales" ancho="max-w-lg">
            <p className="text-sm text-slate-600">
                Estos materiales cambiaron de costo en la orden. Marca los que quieras actualizar también en{' '}
                <span className="font-semibold">todo el sistema</span> (catálogo maestro y componentes). Los que no
                marques quedarán con ese costo <span className="font-semibold">solo para esta orden</span>.
            </p>
            <div className="mt-4 space-y-2">
                {cambios.map((c) => (
                    <label
                        key={c.material}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                        <input
                            type="checkbox"
                            checked={sel.includes(c.material)}
                            onChange={() =>
                                setSel((s) => (s.includes(c.material) ? s.filter((x) => x !== c.material) : [...s, c.material]))
                            }
                            className="rounded"
                        />
                        <span className="font-mono text-sm font-semibold text-brand-700">{c.clave}</span>
                        <span className="flex-1 truncate text-sm text-slate-700">{c.concepto}</span>
                        <span className="text-sm text-slate-500">
                            {money2(c.costoAnterior)} → <span className="font-semibold text-navy-900">{money2(c.costoNuevo)}</span>
                        </span>
                    </label>
                ))}
            </div>
            <div className="mt-5 flex flex-col justify-end gap-2 border-t border-slate-200 pt-4 sm:flex-row">
                <Button variant="secondary" onClick={() => onGuardar([])} disabled={guardando}>
                    Guardar solo en esta orden
                </Button>
                <Button onClick={() => onGuardar(sel)} disabled={guardando}>
                    {guardando ? 'Guardando…' : `Guardar y actualizar ${sel.length} en el sistema`}
                </Button>
            </div>
        </Modal>
    )
}

// ---------- Modal: editar costos de una orden ENVIADA (solo costos) ----------
function EditarCostosModal({
    orden,
    onClose,
    onSaved,
}: {
    orden: OrdenListItem
    onClose: () => void
    onSaved: () => void
}) {
    const detalle = useQuery({ queryKey: ['orden', orden._id], queryFn: () => getOrden(orden._id) })
    const [costos, setCostos] = useState<Record<string, number>>({})
    const [orig, setOrig] = useState<Record<string, number>>({})
    const [guardando, setGuardando] = useState(false)
    const [pendiente, setPendiente] = useState<{ items: OrdenItemInput[]; cambios: CambioCosto[] } | null>(null)

    const items = detalle.data?.items ?? []

    useEffect(() => {
        if (detalle.data) {
            const c: Record<string, number> = {}
            detalle.data.items.forEach((it) => {
                if (it.material) c[it.material] = it.costoUnitario
            })
            setCostos(c)
            setOrig({ ...c })
        }
    }, [detalle.data])

    const guardar = () => {
        const its: OrdenItemInput[] = items
            .filter((it) => it.material)
            .map((it) => ({ material: it.material as string, cantidad: it.cantidad, costoUnitario: costos[it.material!] ?? it.costoUnitario }))
        const cambios: CambioCosto[] = items
            .filter((it) => it.material)
            .map((it) => {
                const nuevo = costos[it.material!] ?? it.costoUnitario
                const ant = orig[it.material!] ?? it.costoUnitario
                return { material: it.material!, clave: it.clave, concepto: it.concepto, costoAnterior: ant, costoNuevo: nuevo }
            })
            .filter((c) => c.costoNuevo !== c.costoAnterior)

        if (cambios.length > 0) {
            setPendiente({ items: its, cambios })
            return
        }
        doGuardar(its, [])
    }

    const doGuardar = async (its: OrdenItemInput[], materialesGlobal: string[]) => {
        setGuardando(true)
        try {
            const res = await actualizarOrden(orden._id, { items: its, materialesGlobal })
            toast.success(res.mensaje)
            setPendiente(null)
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <Modal open onClose={onClose} titulo={`Editar costos — ${orden.folio}`} ancho="max-w-xl">
            {detalle.isLoading ? (
                <Spinner label="Cargando…" />
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Ajusta el costo unitario de cada material (las cantidades no cambian en órdenes enviadas).
                    </p>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-2">Clave</th>
                                    <th className="px-3 py-2">Concepto</th>
                                    <th className="px-3 py-2 text-center">Cant.</th>
                                    <th className="px-3 py-2 text-right">Costo unit.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((it) => (
                                    <tr key={it._id ?? it.material}>
                                        <td className="px-3 py-2 font-mono font-semibold text-brand-700">{it.clave}</td>
                                        <td className="px-3 py-2 text-slate-700">{it.concepto}</td>
                                        <td className="px-3 py-2 text-center text-slate-600">{it.cantidad}</td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={it.material ? (costos[it.material] ?? it.costoUnitario) : it.costoUnitario}
                                                onChange={(e) =>
                                                    it.material &&
                                                    setCostos((s) => ({ ...s, [it.material!]: Number(e.target.value) }))
                                                }
                                                className="w-28 rounded border border-slate-300 px-2 py-1 text-right"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={guardar} disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar costos'}
                        </Button>
                    </div>
                </div>
            )}
            {pendiente && (
                <ActualizarCostosGlobalModal
                    cambios={pendiente.cambios}
                    guardando={guardando}
                    onGuardar={(ids) => doGuardar(pendiente.items, ids)}
                    onCancelar={() => setPendiente(null)}
                />
            )}
        </Modal>
    )
}

// ---------- Modal: marcar faltantes ----------
function FaltantesModal({
    orden,
    onClose,
    onSaved,
}: {
    orden: OrdenListItem
    onClose: () => void
    onSaved: () => void
}) {
    const detalle = useQuery({ queryKey: ['orden', orden._id], queryFn: () => getOrden(orden._id) })
    const [faltas, setFaltas] = useState<Record<string, number>>({})
    const [guardando, setGuardando] = useState(false)

    const items = detalle.data?.items ?? []

    const guardar = async () => {
        const faltantes = items
            .filter((it) => it.material && (faltas[it.material] || 0) > 0)
            .map((it) => ({ material: it.material as string, cantidad: Math.min(faltas[it.material!], it.cantidad) }))
        if (faltantes.length === 0) return toast.error('Indica al menos un material faltante')

        setGuardando(true)
        try {
            const res = await registrarFaltantes(orden._id, faltantes)
            let msg = res.mensaje
            if (res.recomendacionesGeneradas > 0) msg += ` · ${res.recomendacionesGeneradas} recomendación(es) generada(s)`
            if (res.sinAlternativa.length > 0)
                toast.info(`Sin proveedor alternativo: ${res.sinAlternativa.join(', ')}`)
            toast.success(msg)
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <Modal open onClose={onClose} titulo={`Marcar faltantes — ${orden.folio}`} ancho="max-w-xl">
            {detalle.isLoading ? (
                <Spinner label="Cargando…" />
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Indica cuánto faltó de cada material. La orden se ajustará a lo que sí se surtirá y se
                        recomendarán otros proveedores para los faltantes.
                    </p>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-2">Clave</th>
                                    <th className="px-3 py-2">Concepto</th>
                                    <th className="px-3 py-2 text-center">Pedido</th>
                                    <th className="px-3 py-2 text-center">Faltó</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((it) => (
                                    <tr key={it._id ?? it.material}>
                                        <td className="px-3 py-2 font-mono font-semibold text-brand-700">{it.clave}</td>
                                        <td className="px-3 py-2 text-slate-700">{it.concepto}</td>
                                        <td className="px-3 py-2 text-center text-slate-600">{it.cantidad}</td>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                max={it.cantidad}
                                                value={it.material ? (faltas[it.material] ?? 0) : 0}
                                                onChange={(e) =>
                                                    it.material &&
                                                    setFaltas((f) => ({ ...f, [it.material!]: Number(e.target.value) }))
                                                }
                                                className="w-20 rounded border border-slate-300 px-2 py-1 text-center"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={guardar} disabled={guardando}>
                            {guardando ? 'Procesando…' : 'Registrar faltantes'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ---------- Modal: editar total estimado ----------
function EditarTotalModal({
    orden,
    onClose,
    onSaved,
}: {
    orden: OrdenListItem
    onClose: () => void
    onSaved: () => void
}) {
    const [total, setTotal] = useState<number>(orden.presupuestoEstimado)
    const [guardando, setGuardando] = useState(false)

    const guardar = async () => {
        setGuardando(true)
        try {
            const res = await actualizarOrden(orden._id, { presupuestoEstimado: total })
            toast.success(res.mensaje)
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <Modal open onClose={onClose} titulo={`Editar total estimado — ${orden.folio}`}>
            <Field label="Total estimado de lo que se surtirá (MXN)">
                <Input type="number" step="0.01" min="0" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
            </Field>
            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Button variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button onClick={guardar} disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
        </Modal>
    )
}

// ---------- Modal: confirmar recepción ----------
interface RecibidoSel {
    checked: boolean
    cantidad: number
}

function ConfirmarRecepcionModal({
    orden,
    onClose,
    onSaved,
}: {
    orden: OrdenListItem
    onClose: () => void
    onSaved: () => void
}) {
    const detalle = useQuery({ queryKey: ['orden', orden._id], queryFn: () => getOrden(orden._id) })
    const [recibidos, setRecibidos] = useState<Record<string, RecibidoSel>>({})
    const [costoReal, setCostoReal] = useState<number>(orden.presupuestoEstimado)
    const [guardando, setGuardando] = useState(false)

    const items = detalle.data?.items ?? []

    useEffect(() => {
        if (detalle.data) {
            const init: Record<string, RecibidoSel> = {}
            detalle.data.items.forEach((it) => {
                if (it.material) init[it.material] = { checked: true, cantidad: it.cantidad }
            })
            setRecibidos(init)
            setCostoReal(detalle.data.presupuestoEstimado)
        }
    }, [detalle.data])

    const setRec = (id: string, patch: Partial<RecibidoSel>) =>
        setRecibidos((s) => {
            const prev = s[id] ?? { checked: true, cantidad: 1 }
            return { ...s, [id]: { ...prev, ...patch } }
        })

    const guardar = async () => {
        const finales = items
            .filter((it) => it.material && recibidos[it.material]?.checked && (recibidos[it.material]?.cantidad || 0) > 0)
            .map((it) => ({ material: it.material as string, cantidad: recibidos[it.material!].cantidad }))
        if (finales.length === 0) return toast.error('Debe recibirse al menos un material')

        setGuardando(true)
        try {
            const res = await confirmarRecepcion(orden._id, { items: finales, costoRealTotal: costoReal })
            toast.success(`${res.mensaje} · ${res.materialesEnStock} material(es) sumado(s) al inventario`)
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <Modal open onClose={onClose} titulo={`Confirmar recepción — ${orden.folio}`} ancho="max-w-xl">
            {detalle.isLoading ? (
                <Spinner label="Cargando…" />
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Confirma lo que realmente llegó (puedes reducir cantidades o desmarcar). Al confirmar, el stock
                        se suma al inventario.
                    </p>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-2"></th>
                                    <th className="px-3 py-2">Clave</th>
                                    <th className="px-3 py-2">Concepto</th>
                                    <th className="px-3 py-2 text-center">Pedido</th>
                                    <th className="px-3 py-2 text-center">Recibido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((it) => {
                                    const rec = it.material ? recibidos[it.material] : undefined
                                    const checked = rec?.checked ?? true
                                    return (
                                        <tr key={it._id ?? it.material} className={checked ? '' : 'opacity-50'}>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) =>
                                                        it.material && setRec(it.material, { checked: e.target.checked })
                                                    }
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2 font-mono font-semibold text-brand-700">{it.clave}</td>
                                            <td className="px-3 py-2 text-slate-700">{it.concepto}</td>
                                            <td className="px-3 py-2 text-center text-slate-600">{it.cantidad}</td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={it.cantidad}
                                                    value={rec?.cantidad ?? it.cantidad}
                                                    disabled={!checked}
                                                    onChange={(e) =>
                                                        it.material &&
                                                        setRec(it.material, {
                                                            cantidad: Math.min(Number(e.target.value), it.cantidad),
                                                        })
                                                    }
                                                    className="w-20 rounded border border-slate-300 px-2 py-1 text-center disabled:bg-slate-100"
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Field label="Costo total real (MXN)" required>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={costoReal}
                            onChange={(e) => setCostoReal(Number(e.target.value))}
                        />
                    </Field>

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={guardar} disabled={guardando}>
                            {guardando ? 'Confirmando…' : 'Confirmar y sumar al inventario'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ---------- Panel de recomendaciones (pestaña) ----------
function RecomendacionesPanel({
    recomendaciones,
    cargando,
    puedeComprar,
}: {
    recomendaciones: Recomendacion[]
    cargando: boolean
    puedeComprar: boolean
}) {
    const queryClient = useQueryClient()

    const finalizar = useMutation({
        mutationFn: finalizarRecomendacion,
        onSuccess: (res) => {
            toast.success(`${res.mensaje} · ${res.folio}`)
            queryClient.invalidateQueries({ queryKey: ['recomendaciones'] })
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const descartar = useMutation({
        mutationFn: eliminarRecomendacion,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['recomendaciones'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (cargando) return <Spinner label="Cargando recomendaciones…" />
    if (recomendaciones.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <EmptyState
                    titulo="Sin recomendaciones pendientes"
                    descripcion="Cuando marques faltantes en una orden, aquí aparecerán las órdenes sugeridas a otros proveedores."
                />
            </div>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {recomendaciones.map((r) => (
                <div key={r._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-start justify-between">
                        <div>
                            <p className="font-display font-bold text-navy-900">{r.proveedorSnap.codigo}</p>
                            <p className="text-xs text-slate-500">{r.proveedorSnap.razonSocial}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            de {r.folioOrigen}
                        </span>
                    </div>
                    <ul className="mb-4 space-y-1 text-sm">
                        {r.items.map((it, i) => (
                            <li key={i} className="flex justify-between text-slate-700">
                                <span>
                                    <span className="font-mono text-brand-700">{it.clave}</span> {it.concepto}
                                </span>
                                <span className="font-medium">× {it.cantidad}</span>
                            </li>
                        ))}
                    </ul>
                    {puedeComprar && (
                        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (confirm('¿Descartar esta recomendación?')) descartar.mutate(r._id)
                                }}
                            >
                                Descartar
                            </Button>
                            <Button onClick={() => finalizar.mutate(r._id)} disabled={finalizar.isPending}>
                                Crear orden
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
