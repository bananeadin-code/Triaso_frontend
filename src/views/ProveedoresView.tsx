import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    getProveedor,
    getProveedores,
} from '../api/ProveedoresAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, CategoriaBadge, EmptyState, Field, Input, PageHeader, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { IconDownload, IconEdit, IconEye, IconPlus, IconTrash } from '../components/icons'
import type { Proveedor, ProveedorFormData } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export function ProveedoresView() {
    const { usuario, puede } = useAuth()
    const puedeEditar = puede('proveedores', 'escritura')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Proveedor | null>(null)
    const [detalleId, setDetalleId] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')

    const { data, isLoading } = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })

    const eliminar = useMutation({
        mutationFn: eliminarProveedor,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['proveedores'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const abrirNuevo = () => {
        setEditando(null)
        setModalAbierto(true)
    }
    const abrirEditar = (p: Proveedor) => {
        setEditando(p)
        setModalAbierto(true)
    }

    if (isLoading) return <Spinner label="Cargando proveedores…" />

    const q = busqueda.toLowerCase()
    const proveedores = (data ?? []).filter(
        (p) => p.codigo.toLowerCase().includes(q) || p.razonSocial.toLowerCase().includes(q)
    )

    return (
        <div>
            <PageHeader
                titulo="Proveedores"
                descripcion="Directorio de proveedores y sus datos de contacto"
                accion={
                    <div className="flex gap-2">
                        {puedeReporte && (
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    descargarReporte('proveedores', 'proveedores-triaso.pdf').catch((e) => toast.error(e.message))
                                }
                            >
                                <IconDownload /> Reporte PDF
                            </Button>
                        )}
                        {puedeEditar && (
                            <Button onClick={abrirNuevo}>
                                <IconPlus /> Nuevo proveedor
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="mb-4">
                <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por código o razón social…" />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {proveedores.length === 0 ? (
                    <EmptyState titulo="Sin proveedores" descripcion="No hay proveedores que coincidan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Razón social</th>
                                    <th className="px-4 py-3">RFC</th>
                                    <th className="px-4 py-3">Contacto</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {proveedores.map((p) => (
                                    <tr key={p._id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-navy-900">{p.codigo}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{p.razonSocial}</td>
                                        <td className="px-4 py-3 text-slate-500">{p.rfc || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {p.email || p.telefono ? (
                                                <div className="leading-tight">
                                                    {p.email && <div>{p.email}</div>}
                                                    {p.telefono && <div className="text-xs">{p.telefono}</div>}
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setDetalleId(p._id)}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                    title="Ver materiales asociados"
                                                >
                                                    <IconEye />
                                                </button>
                                                {puedeEditar && (
                                                    <>
                                                        <button
                                                            onClick={() => abrirEditar(p)}
                                                            className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                            title="Editar"
                                                        >
                                                            <IconEdit />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`¿Eliminar el proveedor ${p.codigo}?`))
                                                                    eliminar.mutate(p._id)
                                                            }}
                                                            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                            title="Eliminar"
                                                        >
                                                            <IconTrash />
                                                        </button>
                                                    </>
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

            {detalleId && <DetalleProveedorModal id={detalleId} onClose={() => setDetalleId(null)} />}

            {modalAbierto && (
                <ProveedorFormModal
                    proveedor={editando}
                    onClose={() => setModalAbierto(false)}
                    onSaved={() => {
                        setModalAbierto(false)
                        queryClient.invalidateQueries({ queryKey: ['proveedores'] })
                    }}
                />
            )}
        </div>
    )
}

// ---------- Modal de detalle: materiales asociados al proveedor ----------
function DetalleProveedorModal({ id, onClose }: { id: string; onClose: () => void }) {
    const { data, isLoading } = useQuery({ queryKey: ['proveedor', id], queryFn: () => getProveedor(id) })

    return (
        <Modal open onClose={onClose} titulo="Materiales asociados" ancho="max-w-2xl">
            {isLoading || !data ? (
                <Spinner label="Cargando…" />
            ) : (
                <div>
                    <div className="mb-4">
                        <p className="font-display text-lg font-bold text-navy-900">
                            {data.proveedor.codigo} · {data.proveedor.razonSocial}
                        </p>
                        {data.proveedor.email && <p className="text-sm text-slate-500">{data.proveedor.email}</p>}
                    </div>

                    {data.materiales.length === 0 ? (
                        <EmptyState
                            titulo="Sin materiales asociados"
                            descripcion="Este proveedor aún no está ligado a ningún material."
                        />
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Clave</th>
                                        <th className="px-3 py-2">Concepto</th>
                                        <th className="px-3 py-2 text-center">Cat.</th>
                                        <th className="px-3 py-2 text-right">Costo unitario</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.materiales.map((m) => (
                                        <tr key={m._id} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-mono font-semibold text-brand-700">{m.clave}</td>
                                            <td className="px-3 py-2 text-slate-700">{m.concepto}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex justify-center">
                                                    <CategoriaBadge id={m.categoriaPrincipal} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-slate-700">
                                                {money(m.costoUnitario)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="mt-3 text-xs text-slate-400">{data.materiales.length} material(es) asociado(s)</p>
                </div>
            )}
        </Modal>
    )
}

// ---------- Modal con formulario ----------
function ProveedorFormModal({
    proveedor,
    onClose,
    onSaved,
}: {
    proveedor: Proveedor | null
    onClose: () => void
    onSaved: () => void
}) {
    const esEdicion = Boolean(proveedor)
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ProveedorFormData>({
        defaultValues: {
            codigo: proveedor?.codigo ?? '',
            razonSocial: proveedor?.razonSocial ?? '',
            rfc: proveedor?.rfc ?? '',
            direccion: proveedor?.direccion ?? '',
            telefono: proveedor?.telefono ?? '',
            email: proveedor?.email ?? '',
        },
    })

    const onSubmit = async (datos: ProveedorFormData) => {
        try {
            if (esEdicion && proveedor) {
                const res = await actualizarProveedor(proveedor._id, datos)
                toast.success(res.mensaje)
            } else {
                const res = await crearProveedor(datos)
                toast.success(res.mensaje)
            }
            onSaved()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        }
    }

    return (
        <Modal open onClose={onClose} titulo={esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Código" error={errors.codigo?.message} required>
                        <Input
                            placeholder="ISSSTE"
                            {...register('codigo', { required: 'El código es obligatorio' })}
                        />
                    </Field>
                    <Field label="RFC" error={errors.rfc?.message}>
                        <Input placeholder="XAXX010101000" {...register('rfc')} />
                    </Field>
                </div>

                <Field label="Razón social" error={errors.razonSocial?.message} required>
                    <Input
                        placeholder="Nombre completo del proveedor"
                        {...register('razonSocial', { required: 'La razón social es obligatoria' })}
                    />
                </Field>

                <Field label="Dirección" error={errors.direccion?.message}>
                    <Input placeholder="Calle, ciudad, estado" {...register('direccion')} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Teléfono" error={errors.telefono?.message}>
                        <Input placeholder="618-000-0000" {...register('telefono')} />
                    </Field>
                    <Field label="Correo" error={errors.email?.message}>
                        <Input
                            type="email"
                            placeholder="ventas@proveedor.com"
                            {...register('email', {
                                pattern: { value: /\S+@\S+\.\S+/, message: 'Correo no válido' },
                            })}
                        />
                    </Field>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear proveedor'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
