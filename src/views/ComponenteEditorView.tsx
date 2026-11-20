import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { actualizarComponente, getComponente } from '../api/ComponentesAPI'
import { getMateriales, getCategorias } from '../api/MaterialesAPI'
import { getConfiguracion } from '../api/ConfiguracionAPI'
import { useAuth } from '../hooks/useAuth'
import { BarraGuardado, CategoriaBadge, Field, Input, Spinner } from '../components/ui'
import { SelectBuscable } from '../components/SelectBuscable'
import { opcionesMaterial } from '../lib/opciones'
import { CamposPersonalizadosForm, mismosDatos, useCamposModulo } from '../components/CamposPersonalizados'
import { IconBack, IconPlus, IconTrash } from '../components/icons'
import type { CategoriaId, MaterialAsignado, Variacion } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export function ComponenteEditorView() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { puede } = useAuth()
    // Todo el editor (concepto, variaciones, materiales) se guarda como edición del componente
    const puedeEditar = puede('componentes', 'editar')

    const componente = useQuery({ queryKey: ['componente', id], queryFn: () => getComponente(id!), enabled: !!id })
    const materiales = useQuery({ queryKey: ['materiales'], queryFn: getMateriales })
    const categorias = useQuery({ queryKey: ['categorias'], queryFn: getCategorias })
    const config = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion })
    const unidades = config.data?.unidades ?? []

    const [concepto, setConcepto] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [variaciones, setVariaciones] = useState<Variacion[]>([])
    const [pers, setPers] = useState<Record<string, unknown>>({})
    const [guardando, setGuardando] = useState(false)
    const { campos: camposPers } = useCamposModulo('componentes')

    // Carga (o restablece) el formulario con lo guardado en el servidor
    const restablecer = () => {
        if (!componente.data) return
        setConcepto(componente.data.concepto)
        setDescripcion(componente.data.descripcion)
        setVariaciones(componente.data.variaciones)
        setPers(componente.data.personalizados ?? {})
    }
    useEffect(restablecer, [componente.data])

    if (componente.isLoading || materiales.isLoading || categorias.isLoading)
        return <Spinner label="Cargando componente…" />

    const catMateriales = materiales.data ?? []
    const cats = categorias.data ?? []

    // ¿Lo que hay en pantalla difiere de lo guardado?
    const guardado = componente.data
    const hayCambios =
        !!guardado &&
        (concepto !== guardado.concepto ||
            descripcion !== guardado.descripcion ||
            JSON.stringify(variaciones) !== JSON.stringify(guardado.variaciones) ||
            !mismosDatos(pers, guardado.personalizados ?? {}))

    // ---------- operaciones sobre el árbol ----------
    const addVariacion = () =>
        setVariaciones((v) => [...v, { nombre: `Variación ${v.length + 1}`, materiales: [] }])

    const renameVariacion = (vi: number, nombre: string) =>
        setVariaciones((v) => v.map((va, i) => (i === vi ? { ...va, nombre } : va)))

    const removeVariacion = (vi: number) => setVariaciones((v) => v.filter((_, i) => i !== vi))

    const addMaterial = (vi: number, materialId: string) => {
        const cat = catMateriales.find((m) => m._id === materialId)
        if (!cat) return
        const nuevo: MaterialAsignado = {
            material: cat._id,
            clave: cat.clave,
            concepto: cat.concepto,
            proveedor: {
                proveedor: cat.proveedorPrincipal?._id,
                codigo: cat.proveedorPrincipal?.codigo ?? '',
                razonSocial: cat.proveedorPrincipal?.razonSocial ?? '',
            },
            tipo: cat.categoriaPrincipal,
            cantidad: 1,
            unidad: 'Pieza',
            costoMXN: cat.costoUnitario,
            costoUSD: cat.costoUSD,
            paridad: 0,
            importeMXN: cat.costoUnitario,
            importeUSD: cat.costoUSD,
        }
        setVariaciones((v) => v.map((va, i) => (i === vi ? { ...va, materiales: [...va.materiales, nuevo] } : va)))
    }

    const updateMaterial = (vi: number, mi: number, campo: keyof MaterialAsignado, valor: string | number) => {
        setVariaciones((v) =>
            v.map((va, i) => {
                if (i !== vi) return va
                const materiales = va.materiales.map((m, j) => (j === mi ? { ...m, [campo]: valor } : m))
                return { ...va, materiales }
            })
        )
    }

    const removeMaterial = (vi: number, mi: number) =>
        setVariaciones((v) =>
            v.map((va, i) => (i === vi ? { ...va, materiales: va.materiales.filter((_, j) => j !== mi) } : va))
        )

    const guardar = async () => {
        if (!concepto.trim()) {
            toast.error('El concepto es obligatorio')
            return
        }
        setGuardando(true)
        try {
            const res = await actualizarComponente(id!, { concepto, descripcion, variaciones, personalizados: pers })
            toast.success(res.mensaje)
            componente.refetch()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div>
            <button
                onClick={() => navigate('/componentes')}
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700"
            >
                <IconBack /> Volver a componentes
            </button>

            {/* Encabezado */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-1 flex-wrap gap-4">
                    <div className="min-w-56 flex-1">
                        <Field label="Concepto del componente" required>
                            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} disabled={!puedeEditar} />
                        </Field>
                    </div>
                    <div className="min-w-56 flex-1">
                        <Field label="Descripción">
                            <Input
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                disabled={!puedeEditar}
                            />
                        </Field>
                    </div>
                </div>
                {camposPers.length > 0 && (
                    <div className="mt-4">
                        <CamposPersonalizadosForm campos={camposPers} valores={pers} onChange={setPers} disabled={!puedeEditar} columnas={3} />
                    </div>
                )}
            </div>

            {/* Variaciones */}
            <div className="space-y-6">
                {variaciones.map((va, vi) => (
                    <div key={vi} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Variación
                                </span>
                                <input
                                    value={va.nombre}
                                    onChange={(e) => renameVariacion(vi, e.target.value)}
                                    disabled={!puedeEditar}
                                    className="rounded-md border border-transparent px-2 py-1 font-display font-bold text-navy-900 hover:border-slate-300 focus:border-brand-500 focus:outline-none disabled:bg-transparent"
                                />
                            </div>
                            {puedeEditar && (
                                <button
                                    onClick={() => removeVariacion(vi)}
                                    className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title="Eliminar variación"
                                >
                                    <IconTrash />
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Clave</th>
                                        <th className="px-3 py-2">Concepto</th>
                                        <th className="px-3 py-2 text-center">Tipo</th>
                                        <th className="px-3 py-2">Cant.</th>
                                        <th className="px-3 py-2">Unidad</th>
                                        <th className="px-3 py-2 text-right">Costo MXN</th>
                                        <th className="px-3 py-2 text-right">Costo USD</th>
                                        <th className="px-3 py-2 text-right">Import. MXN</th>
                                        <th className="px-3 py-2 text-right">Import. USD</th>
                                        {puedeEditar && <th className="px-3 py-2" />}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {va.materiales.length === 0 && (
                                        <tr>
                                            <td colSpan={puedeEditar ? 10 : 9} className="px-3 py-6 text-center text-slate-400">
                                                Sin materiales en esta variación
                                            </td>
                                        </tr>
                                    )}
                                    {va.materiales.map((m, mi) => (
                                        <tr key={mi} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-mono font-semibold text-brand-700">{m.clave}</td>
                                            <td className="px-3 py-2 text-slate-700">{m.concepto}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    <CategoriaBadge id={m.tipo} />
                                                    {puedeEditar && (
                                                        <select
                                                            value={m.tipo}
                                                            onChange={(e) =>
                                                                updateMaterial(vi, mi, 'tipo', e.target.value as CategoriaId)
                                                            }
                                                            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
                                                            title="Reclasificar categoría"
                                                        >
                                                            {cats.map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.id}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <CellNumber
                                                    value={m.cantidad}
                                                    disabled={!puedeEditar}
                                                    onChange={(n) => updateMaterial(vi, mi, 'cantidad', n)}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={m.unidad}
                                                    disabled={!puedeEditar}
                                                    onChange={(e) => updateMaterial(vi, mi, 'unidad', e.target.value)}
                                                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm disabled:border-transparent disabled:bg-transparent"
                                                >
                                                    {/* Conserva el valor actual aunque ya no esté en el catálogo */}
                                                    {m.unidad && !unidades.includes(m.unidad) && (
                                                        <option value={m.unidad}>{m.unidad}</option>
                                                    )}
                                                    {unidades.map((u) => (
                                                        <option key={u} value={u}>
                                                            {u}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <CellNumber
                                                    value={m.costoMXN}
                                                    disabled={!puedeEditar}
                                                    onChange={(n) => updateMaterial(vi, mi, 'costoMXN', n)}
                                                    ancho="w-24"
                                                    alinear="text-right"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <CellNumber
                                                    value={m.costoUSD}
                                                    disabled={!puedeEditar}
                                                    onChange={(n) => updateMaterial(vi, mi, 'costoUSD', n)}
                                                    ancho="w-24"
                                                    alinear="text-right"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-slate-700">
                                                {money(m.cantidad * m.costoMXN)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-slate-700">
                                                {money(m.cantidad * m.costoUSD)}
                                            </td>
                                            {puedeEditar && (
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        onClick={() => removeMaterial(vi, mi)}
                                                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                        title="Quitar material"
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {puedeEditar && (
                            <div className="border-t border-slate-200 px-5 py-3">
                                <AgregarMaterial
                                    materiales={catMateriales}
                                    yaAgregados={va.materiales.map((m) => String(m.material ?? ''))}
                                    onAdd={(mid) => addMaterial(vi, mid)}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {puedeEditar && (
                <button
                    onClick={addVariacion}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700"
                >
                    <IconPlus /> Agregar variación
                </button>
            )}

            {/* Guardar siempre a la vista, aunque se edite muy abajo */}
            {puedeEditar && (
                <BarraGuardado hayCambios={hayCambios} guardando={guardando} onGuardar={guardar} onDescartar={restablecer} />
            )}
        </div>
    )
}

// Celda numérica con edición ligera
function CellNumber({
    value,
    onChange,
    disabled,
    ancho = 'w-16',
    alinear = '',
}: {
    value: number
    onChange: (n: number) => void
    disabled?: boolean
    ancho?: string
    alinear?: string
}) {
    return (
        <input
            type="number"
            step="any"
            min="0"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`${ancho} ${alinear} rounded border border-slate-300 px-2 py-1 text-sm disabled:border-transparent disabled:bg-transparent`}
        />
    )
}

// Selector con buscador para agregar un material del catálogo a la variación:
// al elegirlo se agrega de inmediato (busca por clave, concepto o proveedor).
function AgregarMaterial({
    materiales,
    yaAgregados,
    onAdd,
}: {
    materiales: { _id: string; clave: string; concepto: string; proveedorPrincipal?: { codigo?: string } | null }[]
    yaAgregados: string[]
    onAdd: (id: string) => void
}) {
    const opciones = useMemo(
        () =>
            opcionesMaterial(materiales).map((o) =>
                yaAgregados.includes(o.value)
                    ? { ...o, detalle: [o.detalle, 'ya en esta variación'].filter(Boolean).join(' · ') }
                    : o
            ),
        [materiales, yaAgregados]
    )
    return (
        <div className="max-w-md">
            <SelectBuscable
                value=""
                onChange={(id) => id && onAdd(id)}
                opciones={opciones}
                placeholder="+ Agregar material del catálogo…"
                aria-label="Agregar material del catálogo"
            />
        </div>
    )
}
