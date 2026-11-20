import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { agregarInventario, actualizarInventario, eliminarInventario, getInventario } from '../api/InventarioAPI'
import { getMateriales } from '../api/MaterialesAPI'
import { getMovimientos } from '../api/MovimientosAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, CategoriaBadge, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { SelectBuscable } from '../components/SelectBuscable'
import { Paginacion, usePaginacionLocal } from '../components/Paginacion'
import { CamposPersonalizadosForm, TdCampos, ThCampos, useCamposModulo } from '../components/CamposPersonalizados'
import { opcionesMaterial } from '../lib/opciones'
import { IconDownload, IconEdit, IconKardex, IconPlus, IconTrash } from '../components/icons'
import type { InventarioItem, Material, MovimientoInventario, TipoMovimiento } from '../types'

export function InventarioView() {
    const { usuario, puede } = useAuth()
    const puedeCrear = puede('inventario', 'crear')
    const puedeEditar = puede('inventario', 'editar')
    const puedeEliminar = puede('inventario', 'eliminar')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<InventarioItem | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [tab, setTab] = useState<'existencias' | 'movimientos'>('existencias')
    const [filtroMaterial, setFiltroMaterial] = useState('')

    const inventario = useQuery({ queryKey: ['inventario'], queryFn: getInventario })
    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    const { campos: camposActivos } = useCamposModulo('inventario')

    const eliminar = useMutation({
        mutationFn: eliminarInventario,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['inventario'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

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
    const { visibles, control } = usePaginacionLocal(itemsFiltrados)

    if (inventario.isLoading || materiales.isLoading) return <Spinner label="Cargando inventario…" />

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
                        {puedeCrear && (
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

            {/* Pestañas: existencias (saldo actual) vs kárdex (rastro de movimientos) */}
            <div className="mb-4 flex gap-1 border-b border-slate-200">
                {(
                    [
                        ['existencias', 'Existencias'],
                        ['movimientos', 'Movimientos (kárdex)'],
                    ] as const
                ).map(([k, t]) => (
                    <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                            tab === k
                                ? 'border-brand-600 text-brand-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'movimientos' && (
                <MovimientosPanel
                    materialInicial={filtroMaterial}
                    materiales={materiales.data ?? []}
                    onLimpiarFiltro={() => setFiltroMaterial('')}
                />
            )}

            {tab === 'existencias' && (
            <>
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
                                    <ThCampos campos={camposActivos} />
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((it) => (
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
                                        <TdCampos campos={camposActivos} valores={it.personalizados} className="px-4 py-3 text-slate-500" />
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {/* El kárdex es consulta: disponible para quien ve el inventario */}
                                                <button
                                                    onClick={() => {
                                                        if (it.material?._id) setFiltroMaterial(it.material._id)
                                                        setTab('movimientos')
                                                    }}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                    title="Ver movimientos de este material"
                                                >
                                                    <IconKardex />
                                                </button>
                                                {puedeEditar && (
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
                                                )}
                                                {puedeEliminar && (
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
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Paginacion {...control} />
            </div>

            <p className="mt-3 text-xs text-slate-400">
                El stock entra solo al recibir órdenes de compra y sale al declarar salidas de cotización; los ajustes
                manuales y la carga inicial también quedan registrados. Todo movimiento se ve en la pestaña
                “Movimientos (kárdex)”.
            </p>
            </>
            )}

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
    motivo: string
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
    const { campos } = useCamposModulo('inventario')
    const [pers, setPers] = useState<Record<string, unknown>>(item?.personalizados ?? {})
    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        defaultValues: {
            material: item?.material?._id ?? '',
            cantidad: item?.cantidad ?? 0,
            ubicacion: item?.ubicacion ?? '',
            motivo: '',
        },
    })

    const onSubmit = async (datos: FormData) => {
        try {
            if (esEdicion && item) {
                const res = await actualizarInventario(item._id, {
                    cantidad: Number(datos.cantidad),
                    ubicacion: datos.ubicacion,
                    motivo: datos.motivo || undefined,
                    personalizados: pers,
                })
                toast.success(res.mensaje)
            } else {
                const res = await agregarInventario({
                    material: datos.material,
                    cantidad: Number(datos.cantidad),
                    ubicacion: datos.ubicacion,
                    motivo: datos.motivo || undefined,
                    personalizados: pers,
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
                        <Controller
                            control={control}
                            name="material"
                            rules={{ required: 'Selecciona un material' }}
                            render={({ field }) => (
                                <SelectBuscable
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    opciones={opcionesMaterial(disponibles)}
                                    placeholder="Buscar por clave o concepto…"
                                    invalido={!!errors.material}
                                    disabled={disponibles.length === 0}
                                />
                            )}
                        />
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

                <Field label={esEdicion ? 'Motivo del ajuste (para el kárdex)' : 'Motivo (opcional)'}>
                    <Input
                        placeholder={esEdicion ? 'Ej. Merma, conteo físico, corrección…' : 'Ej. Carga inicial'}
                        {...register('motivo')}
                    />
                </Field>

                <CamposPersonalizadosForm campos={campos} valores={pers} onChange={setPers} />

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

// ---------- Kárdex: movimientos de inventario ----------
const fechaFmt = (s: string) =>
    new Date(s).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const TIPO_INFO: Record<TipoMovimiento, { texto: string; clase: string; signo: string }> = {
    entrada: { texto: 'Entrada', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200', signo: '+' },
    salida: { texto: 'Salida', clase: 'bg-red-50 text-red-700 ring-red-200', signo: '−' },
    ajuste: { texto: 'Ajuste', clase: 'bg-amber-50 text-amber-700 ring-amber-200', signo: '±' },
}

function MovimientosPanel({
    materialInicial,
    materiales,
    onLimpiarFiltro,
}: {
    materialInicial: string
    materiales: Material[]
    onLimpiarFiltro: () => void
}) {
    const [material, setMaterial] = useState(materialInicial)
    const [tipo, setTipo] = useState<'' | TipoMovimiento>('')

    // Sincroniza si llegan desde "ver movimientos" de un renglón
    useEffect(() => {
        setMaterial(materialInicial)
    }, [materialInicial])

    const { data, isLoading } = useQuery({
        queryKey: ['movimientos', material, tipo],
        queryFn: () => getMovimientos({ material: material || undefined, tipo: tipo || undefined }),
    })

    const movs: MovimientoInventario[] = data ?? []

    return (
        <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-72">
                    <SelectBuscable
                        value={material}
                        onChange={setMaterial}
                        opciones={opcionesMaterial(materiales)}
                        vacio="Todos los materiales"
                        aria-label="Filtrar por material"
                    />
                </div>
                <Select value={tipo} onChange={(e) => setTipo(e.target.value as '' | TipoMovimiento)} className="sm:w-48">
                    <option value="">Todos los tipos</option>
                    <option value="entrada">Entradas</option>
                    <option value="salida">Salidas</option>
                    <option value="ajuste">Ajustes</option>
                </Select>
                {(material || tipo) && (
                    <button
                        onClick={() => {
                            setTipo('')
                            setMaterial('')
                            onLimpiarFiltro()
                        }}
                        className="text-sm text-slate-500 underline hover:text-brand-700"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {isLoading ? (
                <Spinner label="Cargando movimientos…" />
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {movs.length === 0 ? (
                        <EmptyState
                            titulo="Sin movimientos"
                            descripcion="Aún no hay entradas, salidas ni ajustes registrados para este filtro."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Material</th>
                                        <th className="px-4 py-3 text-center">Tipo</th>
                                        <th className="px-4 py-3 text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-right">Saldo</th>
                                        <th className="px-4 py-3">Documento</th>
                                        <th className="px-4 py-3">Motivo</th>
                                        <th className="px-4 py-3">Responsable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {movs.map((m) => {
                                        const info = TIPO_INFO[m.tipo]
                                        return (
                                            <tr key={m._id} className="hover:bg-slate-50">
                                                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                                                    {fechaFmt(m.createdAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono font-semibold text-brand-700">{m.clave}</span>
                                                    <span className="ml-1 text-slate-600">{m.concepto}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ring-1 ${info.clase}`}
                                                    >
                                                        {info.texto}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                                    {info.signo}
                                                    {m.cantidad}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {m.saldoAnterior} → <span className="font-medium text-slate-700">{m.saldoNuevo}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{m.documento || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{m.motivo || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{m.usuario || '—'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            <p className="mt-3 text-xs text-slate-400">
                Rastro auditable de cada movimiento de stock (entradas por recepción, salidas por cotización y ajustes
                manuales). Se muestran los 300 más recientes.
            </p>
        </div>
    )
}
