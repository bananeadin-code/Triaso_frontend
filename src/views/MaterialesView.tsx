import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
    actualizarMaterial,
    crearMaterial,
    eliminarMaterial,
    getCategorias,
    getMateriales,
} from '../api/MaterialesAPI'
import { getProveedores } from '../api/ProveedoresAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, CategoriaBadge, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { IconDownload, IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons'
import type { Categoria, Material, MaterialFormData, Proveedor } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function MaterialesView() {
    const { usuario, puede } = useAuth()
    const puedeEditar = puede('materiales', 'escritura')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Material | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtroCat, setFiltroCat] = useState('')

    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    const proveedores = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const categorias = useQuery({ queryKey: ['categorias'], queryFn: getCategorias })

    const eliminar = useMutation({
        mutationFn: eliminarMaterial,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['materiales'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (materiales.isLoading || proveedores.isLoading || categorias.isLoading)
        return <Spinner label="Cargando materiales…" />

    const lista = (materiales.data ?? []).filter((m) => {
        const q = busqueda.toLowerCase()
        const coincide = m.clave.toLowerCase().includes(q) || m.concepto.toLowerCase().includes(q)
        const cat = filtroCat === '' || m.categoriaPrincipal === filtroCat
        return coincide && cat
    })

    return (
        <div>
            <PageHeader
                titulo="Materiales"
                descripcion="Catálogo maestro de materiales que usa Triaso"
                accion={
                    <div className="flex gap-2">
                        {puedeReporte && (
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    descargarReporte('materiales', 'catalogo-materiales-triaso.pdf').catch((e) =>
                                        toast.error(e.message)
                                    )
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
                                <IconPlus /> Nuevo material
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Buscador + filtro por categoría */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm sm:max-w-xs sm:flex-1">
                    <IconSearch className="text-slate-400" />
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por clave o concepto…"
                        className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                </div>
                <Select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="sm:w-56">
                    <option value="">Todas las categorías</option>
                    {(categorias.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.id} · {c.nombre}
                        </option>
                    ))}
                </Select>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {lista.length === 0 ? (
                    <EmptyState titulo="Sin materiales" descripcion="No hay materiales que coincidan con tu búsqueda." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Clave</th>
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3 text-center">Cat.</th>
                                    <th className="px-4 py-3">Proveedor</th>
                                    <th className="px-4 py-3 text-right">Costo MXN</th>
                                    <th className="px-4 py-3 text-right">Costo USD</th>
                                    {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lista.map((m) => (
                                    <tr key={m._id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-brand-700">{m.clave}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{m.concepto}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center">
                                                <CategoriaBadge id={m.categoriaPrincipal} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {m.proveedorPrincipal?.codigo ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                                            {money(m.costoUnitario)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">{usd(m.costoUSD)}</td>
                                        {puedeEditar && (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditando(m)
                                                            setModalAbierto(true)
                                                        }}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                        title="Editar"
                                                    >
                                                        <IconEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Eliminar el material ${m.clave}?`))
                                                                eliminar.mutate(m._id)
                                                        }}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                        title="Eliminar"
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

            {modalAbierto && (
                <MaterialFormModal
                    material={editando}
                    proveedores={proveedores.data ?? []}
                    categorias={categorias.data ?? []}
                    onClose={() => setModalAbierto(false)}
                    onSaved={() => {
                        setModalAbierto(false)
                        queryClient.invalidateQueries({ queryKey: ['materiales'] })
                    }}
                />
            )}
        </div>
    )
}

// ---------- Modal con formulario ----------
function MaterialFormModal({
    material,
    proveedores,
    categorias,
    onClose,
    onSaved,
}: {
    material: Material | null
    proveedores: Proveedor[]
    categorias: Categoria[]
    onClose: () => void
    onSaved: () => void
}) {
    const esEdicion = Boolean(material)
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<MaterialFormData>({
        defaultValues: {
            concepto: material?.concepto ?? '',
            categoriaPrincipal: material?.categoriaPrincipal ?? 'A',
            proveedorPrincipal: material?.proveedorPrincipal?._id ?? '',
            proveedoresAsociados: material?.proveedoresAsociados?.map((p) => p._id) ?? [],
            costoUnitario: material?.costoUnitario ?? 0,
            costoUSD: material?.costoUSD ?? 0,
        },
    })

    const onSubmit = async (datos: MaterialFormData) => {
        // Normaliza el array que RHF entrega como string cuando hay un solo checkbox
        const payload: MaterialFormData = {
            ...datos,
            costoUnitario: Number(datos.costoUnitario),
            costoUSD: Number(datos.costoUSD),
            proveedoresAsociados: ([] as string[]).concat(datos.proveedoresAsociados ?? []),
        }
        try {
            if (esEdicion && material) {
                const res = await actualizarMaterial(material._id, payload)
                toast.success(res.mensaje)
            } else {
                const res = await crearMaterial(payload)
                toast.success(`${res.mensaje} · Clave ${res.clave}`)
            }
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        }
    }

    return (
        <Modal open onClose={onClose} titulo={esEdicion ? 'Editar material' : 'Nuevo material'} ancho="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {esEdicion && material && (
                    <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                        Clave <span className="font-mono font-bold">{material.clave}</span> — no cambia al editar.
                    </div>
                )}

                <Field label="Concepto" error={errors.concepto?.message} required>
                    <Input
                        placeholder="Nombre del material"
                        {...register('concepto', { required: 'El concepto es obligatorio' })}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Categoría principal" error={errors.categoriaPrincipal?.message} required>
                        <Select {...register('categoriaPrincipal', { required: true })}>
                            {categorias.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.id} · {c.nombre} ({c.prefijo})
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Costo unitario MXN" error={errors.costoUnitario?.message} required>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('costoUnitario', {
                                required: 'El costo unitario es obligatorio',
                                min: { value: 0, message: 'Debe ser positivo' },
                                valueAsNumber: true,
                            })}
                        />
                    </Field>
                </div>

                <Field label="Costo unitario USD" error={errors.costoUSD?.message}>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('costoUSD', { min: { value: 0, message: 'Debe ser positivo' }, valueAsNumber: true })}
                    />
                </Field>
                <p className="-mt-2 text-xs text-slate-400">
                    Al guardar, el costo se sincroniza automáticamente en todos los componentes que usan este material.
                </p>

                <Field label="Proveedor principal" error={errors.proveedorPrincipal?.message} required>
                    <Select {...register('proveedorPrincipal', { required: 'Selecciona un proveedor' })}>
                        <option value="">— Selecciona —</option>
                        {proveedores.map((p) => (
                            <option key={p._id} value={p._id}>
                                {p.codigo} · {p.razonSocial}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Proveedores asociados (alternativas ante faltantes)">
                    <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 p-3">
                        {proveedores.length === 0 && <span className="text-sm text-slate-400">Sin proveedores</span>}
                        {proveedores.map((p) => (
                            <label key={p._id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    value={p._id}
                                    {...register('proveedoresAsociados')}
                                    className="rounded"
                                />
                                {p.codigo}
                            </label>
                        ))}
                    </div>
                </Field>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear material'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
