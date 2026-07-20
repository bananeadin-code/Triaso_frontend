import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { agregarInventario, actualizarInventario, eliminarInventario, getInventario } from '../api/InventarioAPI'
import { getMateriales } from '../api/MaterialesAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, CategoriaBadge, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { IconDownload, IconEdit, IconPlus, IconTrash } from '../components/icons'
import type { InventarioItem, Material } from '../types'

export function InventarioView() {
    const { usuario, puede } = useAuth()
    const puedeEditar = puede('inventario', 'escritura')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<InventarioItem | null>(null)
    const [busqueda, setBusqueda] = useState('')

    const inventario = useQuery({ queryKey: ['inventario'], queryFn: getInventario })
    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })

    const eliminar = useMutation({
        mutationFn: eliminarInventario,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['inventario'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (inventario.isLoading || materiales.isLoading) return <Spinner label="Cargando inventario…" />

    const items = inventario.data ?? []
    // Materiales del catálogo que aún NO están en inventario (para el alta)
    const idsEnInventario = new Set(items.map((i) => i.material?._id).filter(Boolean))
    const disponibles = (materiales.data ?? []).filter((m) => !idsEnInventario.has(m._id))
    // Filtro por clave, concepto o ubicación
    const q = busqueda.toLowerCase()
    const itemsFiltrados = items.filter(
        (it) =>
            (it.material?.clave ?? '').toLowerCase().includes(q) ||
            (it.material?.concepto ?? '').toLowerCase().includes(q) ||
            (it.ubicacion ?? '').toLowerCase().includes(q)
    )

    return (
        <div>
            <PageHeader
                titulo="Inventario"
                descripcion="Materiales físicamente en almacén, con su stock y ubicación"
                accion={
                    <div className="flex gap-2">
                        {puedeReporte && (
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    descargarReporte('inventario', 'inventario-triaso.pdf').catch((e) => toast.error(e.message))
                                }
                            >
                                <IconDownload /> Reporte PDF
                            </Button>
                        )}
                        {puedeEditar && (
                            <Button
                                onClick={() => {
                                    setEditando(null)
                                    setModalAbierto(true)
                                }}
                            >
                                <IconPlus /> Agregar material
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="mb-4">
                <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por clave, concepto o ubicación…" />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {itemsFiltrados.length === 0 ? (
                    <EmptyState
                        titulo="Inventario vacío"
                        descripcion="No hay materiales que coincidan."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Clave</th>
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3 text-center">Cat.</th>
                                    <th className="px-4 py-3 text-right">Stock</th>
                                    <th className="px-4 py-3">Ubicación</th>
                                    {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {itemsFiltrados.map((it) => (
                                    <tr key={it._id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-brand-700">
                                                {it.material?.clave ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{it.material?.concepto ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                {it.material && <CategoriaBadge id={it.material.categoriaPrincipal} />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span
                                                className={`font-semibold ${
                                                    it.cantidad <= 0 ? 'text-red-600' : 'text-slate-800'
                                                }`}
                                            >
                                                {it.cantidad}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{it.ubicacion || '—'}</td>
                                        {puedeEditar && (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditando(it)
                                                            setModalAbierto(true)
                                                        }}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                        title="Editar stock / ubicación"
                                                    >
                                                        <IconEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Quitar ${it.material?.clave} del inventario?`))
                                                                eliminar.mutate(it._id)
                                                        }}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                        title="Quitar del inventario"
                                                    >
                                                        <IconTrash />
                                                    </button>
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

            <p className="mt-3 text-xs text-slate-400">
                El stock se ajustará automáticamente al recibir órdenes de compra y al declarar salidas para
                fabricación/reparación (próximos módulos). Aquí puedes cargar el stock inicial y los sobrantes.
            </p>

            {modalAbierto && (
                <InventarioFormModal
                    item={editando}
                    disponibles={disponibles}
                    onClose={() => setModalAbierto(false)}
                    onSaved={() => {
                        setModalAbierto(false)
                        queryClient.invalidateQueries({ queryKey: ['inventario'] })
                    }}
                />
            )}
        </div>
    )
}

// ---------- Modal alta/edición ----------
interface FormData {
    material: string
    cantidad: number
    ubicacion: string
}

function InventarioFormModal({
    item,
    disponibles,
    onClose,
    onSaved,
}: {
    item: InventarioItem | null
    disponibles: Material[]
    onClose: () => void
    onSaved: () => void
}) {
    const esEdicion = Boolean(item)
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        defaultValues: {
            material: item?.material?._id ?? '',
            cantidad: item?.cantidad ?? 0,
            ubicacion: item?.ubicacion ?? '',
        },
    })

    const onSubmit = async (datos: FormData) => {
        try {
            if (esEdicion && item) {
                const res = await actualizarInventario(item._id, {
                    cantidad: Number(datos.cantidad),
                    ubicacion: datos.ubicacion,
                })
                toast.success(res.mensaje)
            } else {
                const res = await agregarInventario({
                    material: datos.material,
                    cantidad: Number(datos.cantidad),
                    ubicacion: datos.ubicacion,
                })
                toast.success(res.mensaje)
            }
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        }
    }

    return (
        <Modal open onClose={onClose} titulo={esEdicion ? 'Editar inventario' : 'Agregar material al inventario'}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {esEdicion && item ? (
                    <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                        <span className="font-mono font-bold">{item.material?.clave}</span> · {item.material?.concepto}
                    </div>
                ) : (
                    <Field label="Material del catálogo" error={errors.material?.message} required>
                        <Select {...register('material', { required: 'Selecciona un material' })}>
                            <option value="">— Selecciona —</option>
                            {disponibles.map((m) => (
                                <option key={m._id} value={m._id}>
                                    {m.clave} · {m.concepto}
                                </option>
                            ))}
                        </Select>
                        {disponibles.length === 0 && (
                            <span className="mt-1 block text-xs text-slate-400">
                                Todos los materiales del catálogo ya están en el inventario.
                            </span>
                        )}
                    </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Stock (cantidad)" error={errors.cantidad?.message} required>
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            {...register('cantidad', {
                                required: 'La cantidad es obligatoria',
                                min: { value: 0, message: 'Debe ser positivo' },
                                valueAsNumber: true,
                            })}
                        />
                    </Field>
                    <Field label="Ubicación en almacén">
                        <Input placeholder="Ej. Rack E-3, Patio A…" {...register('ubicacion')} />
                    </Field>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar' : 'Agregar'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
