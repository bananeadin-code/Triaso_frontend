import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { crearParidad, actualizarParidad, eliminarParidad, getParidad, traerParidadHoy } from '../api/ParidadAPI'
import { Button, EmptyState, Field, Input, PageHeader, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { IconDownload, IconEdit, IconPlus, IconTrash } from '../components/icons'
import type { OrigenParidad, Paridad } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const fechaInput = (iso: string) => {
    const d = new Date(iso)
    const off = d.getTimezoneOffset()
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const ORIGEN: Record<OrigenParidad, { txt: string; cls: string }> = {
    manual: { txt: 'Manual', cls: 'bg-slate-100 text-slate-600' },
    api: { txt: 'Banxico', cls: 'bg-emerald-50 text-emerald-700' },
    config: { txt: 'Config', cls: 'bg-blue-50 text-blue-700' },
}

export function ParidadView() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { data, isLoading } = useQuery({ queryKey: ['paridad'], queryFn: getParidad })
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Paridad | null>(null)

    const invalidar = () => {
        queryClient.invalidateQueries({ queryKey: ['paridad'] })
        queryClient.invalidateQueries({ queryKey: ['configuracion'] })
        queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
    }

    const traerHoy = useMutation({
        mutationFn: traerParidadHoy,
        onSuccess: (res) => {
            if (res) toast.success(res.mensaje)
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const eliminar = useMutation({
        mutationFn: eliminarParidad,
        onSuccess: (res) => {
            if (res) toast.success(res.mensaje)
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading) return <Spinner label="Cargando paridad…" />
    const registros = data ?? []
    const vigente = registros[0] // el más reciente

    return (
        <div>
            <PageHeader
                titulo="Paridad"
                descripcion="Bitácora del tipo de cambio (MXN por USD). Cada cotización conserva el valor de su fecha."
                accion={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => traerHoy.mutate()}
                            disabled={traerHoy.isPending}
                            title="Traer el tipo de cambio de hoy desde Banxico (requiere token en Configuración)"
                        >
                            <IconDownload /> {traerHoy.isPending ? 'Consultando…' : 'Traer de hoy'}
                        </Button>
                        <Button
                            onClick={() => {
                                setEditando(null)
                                setModalAbierto(true)
                            }}
                        >
                            <IconPlus /> Nuevo registro
                        </Button>
                    </div>
                }
            />

            {vigente && (
                <div className="mb-5 inline-flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3">
                    <span className="text-xs font-medium text-brand-700">Valor vigente</span>
                    <span className="font-display text-2xl font-extrabold text-brand-800">{money(vigente.valor)}</span>
                    <span className="text-xs text-brand-600/80">/ USD · {fechaCorta(vigente.fecha)}</span>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {registros.length === 0 ? (
                    <EmptyState titulo="Sin registros" descripcion="Agrega el primer valor del tipo de cambio." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-center">Origen</th>
                                    <th className="px-4 py-3">Responsable</th>
                                    <th className="px-4 py-3">Nota</th>
                                    <th className="px-4 py-3 text-center">Cotizaciones</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registros.map((r) => (
                                    <tr key={r._id} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fechaCorta(r.fecha)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-navy-900">{money(r.valor)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${ORIGEN[r.origen].cls}`}>
                                                {ORIGEN[r.origen].txt}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{r.creadoPor || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">{r.nota || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {r.cotizaciones > 0 ? (
                                                // Abre Cotizaciones filtrada por este registro
                                                <button
                                                    onClick={() => navigate(`/cotizaciones?paridad=${r._id}`)}
                                                    className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 underline-offset-2 hover:bg-amber-100 hover:underline"
                                                    title="Ver qué cotizaciones usan este valor"
                                                >
                                                    {r.cotizaciones} · ver
                                                </button>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditando(r)
                                                        setModalAbierto(true)
                                                    }}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                    title="Editar"
                                                >
                                                    <IconEdit />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Eliminar el registro de ${money(r.valor)} (${fechaCorta(r.fecha)})?`))
                                                            eliminar.mutate(r._id)
                                                    }}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                    title="Eliminar"
                                                >
                                                    <IconTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="mt-3 text-xs text-slate-400">
                Editar el valor de un registro <strong>actualiza la conversión</strong> de las cotizaciones que lo usaron
                (incluidas las ya surtidas), porque el total se recalcula con el tipo de cambio de su fecha.
            </p>

            {modalAbierto && (
                <ParidadFormModal
                    registro={editando}
                    onClose={() => setModalAbierto(false)}
                    onSaved={() => {
                        setModalAbierto(false)
                        invalidar()
                    }}
                />
            )}
        </div>
    )
}

interface FormData {
    valor: number
    fecha: string
    nota: string
}

function ParidadFormModal({ registro, onClose, onSaved }: { registro: Paridad | null; onClose: () => void; onSaved: () => void }) {
    const esEdicion = Boolean(registro)
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        defaultValues: {
            valor: registro?.valor ?? 0,
            fecha: registro ? fechaInput(registro.fecha) : fechaInput(new Date().toISOString()),
            nota: registro?.nota ?? '',
        },
    })

    const onSubmit = async (datos: FormData) => {
        try {
            if (esEdicion && registro) {
                const res = await actualizarParidad(registro._id, { valor: Number(datos.valor), fecha: datos.fecha, nota: datos.nota })
                if (res && res.cotizacionesActualizadas > 0) {
                    toast.success(`Actualizado · se recalcularon ${res.cotizacionesActualizadas} cotización(es)`)
                } else {
                    toast.success('Registro actualizado')
                }
            } else {
                const res = await crearParidad({ valor: Number(datos.valor), fecha: datos.fecha, nota: datos.nota })
                if (res) toast.success(res.mensaje)
            }
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        }
    }

    return (
        <Modal open onClose={onClose} titulo={esEdicion ? 'Editar registro de paridad' : 'Nuevo registro de paridad'}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {esEdicion && registro && registro.cotizaciones > 0 && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Este valor lo usan <strong>{registro.cotizaciones}</strong> cotización(es). Cambiar el valor
                        recalculará su conversión (incluidas las surtidas).
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Valor (MXN por USD)" error={errors.valor?.message} required>
                        <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            {...register('valor', { required: 'El valor es obligatorio', min: { value: 0.0001, message: 'Debe ser positivo' }, valueAsNumber: true })}
                        />
                    </Field>
                    <Field label="Fecha" error={errors.fecha?.message} required>
                        <Input type="date" {...register('fecha', { required: 'La fecha es obligatoria' })} />
                    </Field>
                </div>
                <Field label="Nota (opcional)">
                    <Input placeholder="Ej. ajuste manual, cierre de mes…" {...register('nota')} />
                </Field>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear registro'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
