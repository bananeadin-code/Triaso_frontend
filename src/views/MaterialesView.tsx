import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { SelectBuscable } from '../components/SelectBuscable'
import { Paginacion, usePaginacionLocal } from '../components/Paginacion'
import { BadgePorValidar, BotonValidar, FiltroPorValidar, usePorValidar } from '../components/PorValidar'
import { CamposPersonalizadosForm, TdCampos, ThCampos, useCamposModulo } from '../components/CamposPersonalizados'
import { opcionesProveedor } from '../lib/opciones'
import { IconDownload, IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons'
import type { CampoDef, Categoria, Material, MaterialFormData, Proveedor } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
// Muestra "—" cuando el material no se compra en esa moneda (costo 0 = vacío)
const moneyOr = (n: number) => (n > 0 ? money(n) : '—')
const usdOr = (n: number) => (n > 0 ? usd(n) : '—')

export function MaterialesView() {
    const { usuario, puede } = useAuth()
    const puedeCrear = puede('materiales', 'crear')
    const puedeEditar = puede('materiales', 'editar')
    const puedeEliminar = puede('materiales', 'eliminar')
    const conAcciones = puedeEditar || puedeEliminar
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Material | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtroCat, setFiltroCat] = useState('')

    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    const proveedores = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const categorias = useQuery({ queryKey: ['categorias'], queryFn: getCategorias })
    const { campos: camposActivos, cargando: cargandoCampos } = useCamposModulo('materiales')

    const eliminar = useMutation({
        mutationFn: eliminarMaterial,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['materiales'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const pv = usePorValidar('materiales', materiales.data ?? [])
    const lista = pv.filtrar(materiales.data ?? []).filter((m) => {
        const q = busqueda.toLowerCase()
        const coincide = m.clave.toLowerCase().includes(q) || m.concepto.toLowerCase().includes(q)
        const cat = filtroCat === '' || m.categoriaPrincipal === filtroCat
        return coincide && cat
    })
    // Se pintan 25 renglones por página (el catálogo completo sí se carga: lo usan los buscadores)
    const { visibles, control } = usePaginacionLocal(lista)

    if (materiales.isLoading || proveedores.isLoading || categorias.isLoading || cargandoCampos)
        return <Spinner label="Cargando materiales…" />

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
                        {puedeCrear && (
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
                <FiltroPorValidar
                    pendientes={pv.pendientes}
                    solo={pv.solo}
                    onSolo={pv.setSolo}
                    mostrados={lista.length}
                    onValidarTodos={() => pv.validar.mutate(lista.filter((m) => m.porValidar).map((m) => m._id))}
                    puedeValidar={puedeEditar}
                    validando={pv.validar.isPending}
                />
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
                                    <ThCampos campos={camposActivos} />
                                    {conAcciones && <th className="px-4 py-3 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((m) => (
                                    <tr key={m._id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-brand-700">{m.clave}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {m.concepto}
                                            {m.porValidar && <BadgePorValidar />}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center">
                                                <CategoriaBadge id={m.categoriaPrincipal} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {m.proveedorPrincipal?.codigo ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                                            {moneyOr(m.costoUnitario)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">{usdOr(m.costoUSD)}</td>
                                        <TdCampos campos={camposActivos} valores={m.personalizados} />
                                        {conAcciones && (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {puedeEditar && m.porValidar && (
                                                        <BotonValidar onClick={() => pv.validar.mutate([m._id])} disabled={pv.validar.isPending} />
                                                    )}
                                                    {puedeEditar && (
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
                                                    )}
                                                    {puedeEliminar && (
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
                <Paginacion {...control} />
            </div>

            {modalAbierto && (
                <MaterialFormModal
                    material={editando}
                    proveedores={proveedores.data ?? []}
                    categorias={categorias.data ?? []}
                    campos={camposActivos}
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
    campos,
    onClose,
    onSaved,
}: {
    material: Material | null
    proveedores: Proveedor[]
    categorias: Categoria[]
    campos: CampoDef[]
    onClose: () => void
    onSaved: () => void
}) {
    const esEdicion = Boolean(material)
    const [pers, setPers] = useState<Record<string, unknown>>(material?.personalizados ?? {})
    const {
        register,
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<MaterialFormData>({
        defaultValues: {
            concepto: material?.concepto ?? '',
            categoriaPrincipal: material?.categoriaPrincipal ?? 'A',
            proveedorPrincipal: material?.proveedorPrincipal?._id ?? '',
            proveedoresAsociados: material?.proveedoresAsociados?.map((p) => p._id) ?? [],
            moneda: material?.moneda ?? 'mxn',
            monedaPrincipal: material?.monedaPrincipal ?? 'mxn',
            costoUnitario: material?.costoUnitario ?? 0,
            costoUSD: material?.costoUSD ?? 0,
        },
    })
    const moneda = watch('moneda')
    const principalSel = watch('monedaPrincipal')
    const asociados = ([] as string[]).concat(watch('proveedoresAsociados') ?? [])
    const [filtroAsoc, setFiltroAsoc] = useState('')
    const coincideAsoc = (p: Proveedor) => {
        const q = filtroAsoc.trim().toLowerCase()
        return !q || `${p.codigo} ${p.razonSocial}`.toLowerCase().includes(q)
    }
    const usaMXN = moneda !== 'usd'
    const usaUSD = moneda !== 'mxn'

    const onSubmit = async (datos: MaterialFormData) => {
        // La moneda que no aplica se manda en 0 (vacía). La principal solo importa con 'ambos';
        // con una sola moneda el backend la fija sola.
        const payload: MaterialFormData = {
            ...datos,
            monedaPrincipal: moneda === 'ambos' ? datos.monedaPrincipal : moneda === 'usd' ? 'usd' : 'mxn',
            costoUnitario: usaMXN ? Number(datos.costoUnitario) || 0 : 0,
            costoUSD: usaUSD ? Number(datos.costoUSD) || 0 : 0,
            proveedoresAsociados: ([] as string[]).concat(datos.proveedoresAsociados ?? []),
            personalizados: pers,
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

                <Field label="Categoría principal" error={errors.categoriaPrincipal?.message} required>
                    <Select {...register('categoriaPrincipal', { required: true })}>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.id} · {c.nombre} ({c.prefijo})
                            </option>
                        ))}
                    </Select>
                </Field>

                {/* Moneda de compra: pesos, dólares o ambos (lo declara Triaso) */}
                <Field label="¿En qué moneda se compra?">
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                { v: 'mxn', t: 'Solo pesos (MXN)' },
                                { v: 'usd', t: 'Solo dólares (USD)' },
                                { v: 'ambos', t: 'Ambos' },
                            ] as const
                        ).map((op) => (
                            <label
                                key={op.v}
                                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                    moneda === op.v
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <input type="radio" value={op.v} {...register('moneda')} className="sr-only" />
                                {op.t}
                            </label>
                        ))}
                    </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    {usaMXN && (
                        <Field label="Costo unitario MXN" error={errors.costoUnitario?.message} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('costoUnitario', {
                                    required: usaMXN ? 'Captura el costo en pesos' : false,
                                    min: { value: 0, message: 'Debe ser positivo' },
                                    valueAsNumber: true,
                                })}
                            />
                        </Field>
                    )}
                    {usaUSD && (
                        <Field label="Costo unitario USD" error={errors.costoUSD?.message} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('costoUSD', {
                                    required: usaUSD ? 'Captura el costo en dólares' : false,
                                    min: { value: 0, message: 'Debe ser positivo' },
                                    valueAsNumber: true,
                                })}
                            />
                        </Field>
                    )}
                </div>

                {moneda === 'ambos' && (
                    <Field label="¿Cuál precio es el PRINCIPAL (el que se usa para costear el BOM)?">
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    { v: 'mxn', t: 'Pesos (MXN)' },
                                    { v: 'usd', t: 'Dólares (USD)' },
                                ] as const
                            ).map((op) => (
                                <label
                                    key={op.v}
                                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                        principalSel === op.v
                                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <input type="radio" value={op.v} {...register('monedaPrincipal')} className="sr-only" />
                                    {op.t}
                                </label>
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                            El otro precio queda como dato secundario (por si lo mandan a pedir en esa moneda). El costeo del
                            BOM y la cotización usa solo el principal, para no duplicar.
                        </p>
                    </Field>
                )}

                <p className="-mt-2 text-xs text-slate-400">
                    Deja fuera la moneda que no manejan para este material. Al guardar, el costo se sincroniza en todos los
                    componentes que lo usan.
                </p>

                <Field label="Proveedor principal" error={errors.proveedorPrincipal?.message} required>
                    <Controller
                        control={control}
                        name="proveedorPrincipal"
                        rules={{ required: 'Selecciona un proveedor' }}
                        render={({ field }) => (
                            <SelectBuscable
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                opciones={opcionesProveedor(proveedores)}
                                placeholder="Buscar por código, razón social o RFC…"
                                invalido={!!errors.proveedorPrincipal}
                            />
                        )}
                    />
                </Field>

                {/* Asociados: casillas con filtro. Las que no coinciden se OCULTAN (no se desmontan)
                    para que el formulario conserve lo ya marcado. */}
                <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-700">
                            Proveedores asociados (alternativas ante faltantes)
                        </span>
                        {asociados.length > 0 && (
                            <span className="text-xs font-medium text-brand-700">{asociados.length} seleccionado(s)</span>
                        )}
                    </div>
                    <div className="rounded-lg border border-slate-200">
                        {proveedores.length > 8 && (
                            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                                <IconSearch width={16} height={16} className="text-slate-400" />
                                <input
                                    value={filtroAsoc}
                                    onChange={(e) => setFiltroAsoc(e.target.value)}
                                    placeholder="Filtrar proveedores…"
                                    aria-label="Filtrar proveedores asociados"
                                    className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                />
                            </div>
                        )}
                        <div className="flex max-h-40 flex-wrap gap-3 overflow-y-auto p-3">
                            {proveedores.length === 0 && <span className="text-sm text-slate-400">Sin proveedores</span>}
                            {proveedores.map((p) => (
                                <label
                                    key={p._id}
                                    title={p.razonSocial}
                                    className={`${coincideAsoc(p) ? 'inline-flex' : 'hidden'} items-center gap-2 text-sm text-slate-700`}
                                >
                                    <input
                                        type="checkbox"
                                        value={p._id}
                                        {...register('proveedoresAsociados')}
                                        className="rounded"
                                    />
                                    {p.codigo}
                                </label>
                            ))}
                            {filtroAsoc && !proveedores.some(coincideAsoc) && (
                                <span className="text-sm text-slate-400">Sin coincidencias</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Campos personalizados (informativos, definidos en Configuración) */}
                <CamposPersonalizadosForm campos={campos} valores={pers} onChange={setPers} />

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
