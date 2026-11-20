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
    importarProveedores,
    type ResultadoImport,
} from '../api/ProveedoresAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { leerProveedoresDeExcel, type FilaProveedor } from '../lib/importarExcel'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, CategoriaBadge, EmptyState, Field, Input, PageHeader, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { Paginacion, usePaginacionLocal } from '../components/Paginacion'
import { BadgePorValidar, BotonValidar, FiltroPorValidar, usePorValidar } from '../components/PorValidar'
import { CamposPersonalizadosForm, TdCampos, ThCampos, useCamposModulo } from '../components/CamposPersonalizados'
import { IconDownload, IconEdit, IconEye, IconPlus, IconTrash, IconUpload } from '../components/icons'
import type { Proveedor, ProveedorFormData } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const moneyOr = (n: number) => (n > 0 ? money(n) : '—')

export function ProveedoresView() {
    const { usuario, puede } = useAuth()
    const puedeCrear = puede('proveedores', 'crear')
    const puedeEditar = puede('proveedores', 'editar')
    const puedeEliminar = puede('proveedores', 'eliminar')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Proveedor | null>(null)
    const [detalleId, setDetalleId] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [importAbierto, setImportAbierto] = useState(false)

    const { data, isLoading } = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const { campos: camposActivos } = useCamposModulo('proveedores')

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

    const q = busqueda.toLowerCase()
    const pv = usePorValidar('proveedores', data ?? [])
    const proveedores = pv.filtrar(data ?? []).filter(
        (p) => p.codigo.toLowerCase().includes(q) || p.razonSocial.toLowerCase().includes(q)
    )
    const { visibles, control } = usePaginacionLocal(proveedores)

    if (isLoading) return <Spinner label="Cargando proveedores…" />

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
                        {puedeCrear && (
                            <Button variant="secondary" onClick={() => setImportAbierto(true)}>
                                <IconUpload /> Importar Excel
                            </Button>
                        )}
                        {puedeCrear && (
                            <Button onClick={abrirNuevo}>
                                <IconPlus /> Nuevo proveedor
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por código o razón social…" />
                <FiltroPorValidar
                    pendientes={pv.pendientes}
                    solo={pv.solo}
                    onSolo={pv.setSolo}
                    mostrados={proveedores.length}
                    onValidarTodos={() => pv.validar.mutate(proveedores.filter((p) => p.porValidar).map((p) => p._id))}
                    puedeValidar={puedeEditar}
                    validando={pv.validar.isPending}
                />
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
                                    <ThCampos campos={camposActivos} />
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((p) => (
                                    <tr key={p._id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-navy-900">{p.codigo}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {p.razonSocial}
                                            {p.porValidar && <BadgePorValidar />}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{p.rfc || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {p.contacto || p.email || p.telefono ? (
                                                <div className="leading-tight">
                                                    {p.contacto && (
                                                        <div className="font-medium text-slate-700">{p.contacto}</div>
                                                    )}
                                                    {p.email && <div className="text-xs">{p.email}</div>}
                                                    {p.telefono && <div className="text-xs">{p.telefono}</div>}
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <TdCampos campos={camposActivos} valores={p.personalizados} className="px-4 py-3 text-slate-500" />
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setDetalleId(p._id)}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                    title="Ver materiales asociados"
                                                >
                                                    <IconEye />
                                                </button>
                                                {puedeEditar && p.porValidar && (
                                                    <BotonValidar onClick={() => pv.validar.mutate([p._id])} disabled={pv.validar.isPending} />
                                                )}
                                                {puedeEditar && (
                                                    <button
                                                        onClick={() => abrirEditar(p)}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                        title="Editar"
                                                    >
                                                        <IconEdit />
                                                    </button>
                                                )}
                                                {puedeEliminar && (
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

            {importAbierto && (
                <ProveedorImportModal
                    existentes={new Set((data ?? []).map((p) => p.codigo.toUpperCase()))}
                    onClose={() => setImportAbierto(false)}
                    onImportado={() => queryClient.invalidateQueries({ queryKey: ['proveedores'] })}
                />
            )}
        </div>
    )
}

// ---------- Modal de importación desde Excel ----------
type EstadoFila = 'nuevo' | 'actualiza' | 'error'

function ProveedorImportModal({
    existentes,
    onClose,
    onImportado,
}: {
    existentes: Set<string>
    onClose: () => void
    onImportado: () => void
}) {
    const [filas, setFilas] = useState<FilaProveedor[] | null>(null)
    const [columnas, setColumnas] = useState<string[]>([])
    const [error, setError] = useState('')
    const [leyendo, setLeyendo] = useState(false)
    const [resultado, setResultado] = useState<ResultadoImport | null>(null)

    const estadoDe = (f: FilaProveedor): EstadoFila => {
        if (!f.codigo || !f.razonSocial) return 'error'
        return existentes.has(f.codigo.toUpperCase()) ? 'actualiza' : 'nuevo'
    }

    const onFile = async (file?: File) => {
        if (!file) return
        setError('')
        setResultado(null)
        setLeyendo(true)
        try {
            const { filas, columnasDetectadas } = await leerProveedoresDeExcel(file)
            setFilas(filas)
            setColumnas(columnasDetectadas)
            if (filas.length === 0) setError('No se encontraron filas de proveedores en el archivo.')
        } catch (e) {
            setFilas(null)
            setError(e instanceof Error ? e.message : 'No se pudo leer el archivo')
        } finally {
            setLeyendo(false)
        }
    }

    const importar = useMutation({
        mutationFn: (validas: FilaProveedor[]) => importarProveedores(validas),
        onSuccess: (res) => {
            if (res) {
                setResultado(res)
                onImportado()
                toast.success(res.mensaje)
            }
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const validas = (filas ?? []).filter((f) => estadoDe(f) !== 'error')
    const conteo = {
        nuevo: (filas ?? []).filter((f) => estadoDe(f) === 'nuevo').length,
        actualiza: (filas ?? []).filter((f) => estadoDe(f) === 'actualiza').length,
        error: (filas ?? []).filter((f) => estadoDe(f) === 'error').length,
    }

    const BADGE: Record<EstadoFila, { txt: string; cls: string }> = {
        nuevo: { txt: 'Nuevo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
        actualiza: { txt: 'Actualiza', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
        error: { txt: 'Se omite', cls: 'bg-red-50 text-red-700 ring-red-200' },
    }

    return (
        <Modal open onClose={onClose} titulo="Importar proveedores desde Excel" ancho="max-w-3xl">
            {/* Resultado final */}
            {resultado ? (
                <div className="space-y-4">
                    <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {resultado.creados} creado(s) · {resultado.actualizados} actualizado(s) ·{' '}
                        {resultado.omitidos.length} omitido(s)
                    </div>
                    {resultado.omitidos.length > 0 && (
                        <div className="rounded-lg border border-slate-200">
                            <p className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                                Filas omitidas
                            </p>
                            <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto text-sm">
                                {resultado.omitidos.map((o, i) => (
                                    <li key={i} className="flex justify-between px-3 py-2">
                                        <span className="text-slate-600">
                                            Fila {o.fila} {o.codigo && <span className="font-mono">· {o.codigo}</span>}
                                        </span>
                                        <span className="text-red-600">{o.motivo}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex justify-end border-t border-slate-200 pt-4">
                        <Button onClick={onClose}>Cerrar</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Selector de archivo */}
                    {!filas && (
                        <div>
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50/40">
                                <IconUpload className="text-slate-400" width={28} height={28} />
                                <span className="text-sm font-medium text-slate-700">
                                    {leyendo ? 'Leyendo…' : 'Selecciona el archivo Excel de proveedores'}
                                </span>
                                <span className="text-xs text-slate-400">.xlsx o .xls</span>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => onFile(e.target.files?.[0])}
                                />
                            </label>
                            <p className="mt-3 text-xs text-slate-400">
                                Se reconocen columnas como <strong>Proveedor</strong> (código), <strong>Beneficiario</strong>,
                                RFC, Contacto, Teléfono, Correo, Cuenta, CLABE, Banco y Ref. Los que ya existan (por código)
                                se actualizan; los nuevos se dan de alta.
                            </p>
                        </div>
                    )}

                    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                    {/* Vista previa */}
                    {filas && filas.length > 0 && (
                        <>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-slate-600">
                                    {filas.length} fila(s) leída(s) · columnas: {columnas.join(', ')}
                                </span>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                                    {conteo.nuevo} nuevos
                                </span>
                                <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                                    {conteo.actualiza} actualizan
                                </span>
                                {conteo.error > 0 && (
                                    <span className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-700">
                                        {conteo.error} se omiten
                                    </span>
                                )}
                            </div>

                            <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-50">
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <th className="px-3 py-2">Código</th>
                                            <th className="px-3 py-2">Beneficiario</th>
                                            <th className="px-3 py-2">RFC</th>
                                            <th className="px-3 py-2">Banco</th>
                                            <th className="px-3 py-2 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filas.map((f, i) => {
                                            const est = estadoDe(f)
                                            return (
                                                <tr key={i} className={est === 'error' ? 'bg-red-50/40' : ''}>
                                                    <td className="px-3 py-2 font-mono font-semibold text-brand-700">
                                                        {f.codigo || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-700">{f.razonSocial || '—'}</td>
                                                    <td className="px-3 py-2 text-slate-500">{f.rfc || '—'}</td>
                                                    <td className="px-3 py-2 text-slate-500">{f.banco || '—'}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ring-1 ${BADGE[est].cls}`}>
                                                            {BADGE[est].txt}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                                <button
                                    onClick={() => {
                                        setFilas(null)
                                        setColumnas([])
                                        setError('')
                                    }}
                                    className="text-sm text-slate-500 hover:text-brand-700"
                                >
                                    ← Elegir otro archivo
                                </button>
                                <div className="flex gap-3">
                                    <Button variant="secondary" onClick={onClose}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={() => importar.mutate(validas)}
                                        disabled={importar.isPending || validas.length === 0}
                                    >
                                        {importar.isPending ? 'Importando…' : `Importar ${validas.length} proveedor(es)`}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Modal>
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
                                                {moneyOr(m.costoUnitario)}
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
    const { campos } = useCamposModulo('proveedores')
    const [pers, setPers] = useState<Record<string, unknown>>(proveedor?.personalizados ?? {})
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
            contacto: proveedor?.contacto ?? '',
            telefono: proveedor?.telefono ?? '',
            email: proveedor?.email ?? '',
            cuenta: proveedor?.cuenta ?? '',
            clabe: proveedor?.clabe ?? '',
            banco: proveedor?.banco ?? '',
            referencia: proveedor?.referencia ?? '',
        },
    })

    const onSubmit = async (form: ProveedorFormData) => {
        const datos = { ...form, personalizados: pers }
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
        <Modal open onClose={onClose} titulo={esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'} ancho="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Código" error={errors.codigo?.message} required>
                        <Input
                            placeholder="Aceromex"
                            {...register('codigo', { required: 'El código es obligatorio' })}
                        />
                    </Field>
                    <Field label="RFC" error={errors.rfc?.message}>
                        <Input placeholder="ACE900319JT9" {...register('rfc')} />
                    </Field>
                </div>

                <Field label="Beneficiario / Razón social" error={errors.razonSocial?.message} required>
                    <Input
                        placeholder="Aceromex s.a. de c.v."
                        {...register('razonSocial', { required: 'La razón social es obligatoria' })}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Contacto" error={errors.contacto?.message}>
                        <Input placeholder="Nombre de la persona" {...register('contacto')} />
                    </Field>
                    <Field label="Teléfono" error={errors.telefono?.message}>
                        <Input placeholder="(618) 134 0592" {...register('telefono')} />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Correo" error={errors.email?.message}>
                        <Input
                            type="email"
                            placeholder="ventas@proveedor.com"
                            {...register('email', {
                                pattern: { value: /\S+@\S+\.\S+/, message: 'Correo no válido' },
                            })}
                        />
                    </Field>
                    <Field label="Dirección" error={errors.direccion?.message}>
                        <Input placeholder="Calle, ciudad, estado" {...register('direccion')} />
                    </Field>
                </div>

                {/* Datos bancarios (para el pago) */}
                <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Datos bancarios (para el pago)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Banco" error={errors.banco?.message}>
                            <Input placeholder="Santander" {...register('banco')} />
                        </Field>
                        <Field label="Cuenta" error={errors.cuenta?.message}>
                            <Input placeholder="65500875323" {...register('cuenta')} />
                        </Field>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <Field label="CLABE interbancaria" error={errors.clabe?.message}>
                            <Input placeholder="014 580 655 008 753 236" {...register('clabe')} />
                        </Field>
                        <Field label="Referencia (opcional)" error={errors.referencia?.message}>
                            <Input placeholder="Referencia de pago" {...register('referencia')} />
                        </Field>
                    </div>
                </div>

                {/* Campos personalizados (informativos, definidos en Configuración) */}
                <CamposPersonalizadosForm campos={campos} valores={pers} onChange={setPers} />

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
