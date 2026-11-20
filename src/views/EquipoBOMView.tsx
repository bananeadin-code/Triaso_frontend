import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { actualizarEquipo, getEquipo } from '../api/EquiposAPI'
import { getComponentes } from '../api/ComponentesAPI'
import { useAuth } from '../hooks/useAuth'
import { descargarReporte } from '../api/ReportesAPI'
import { BarraGuardado, Button, CategoriaBadge, Select, Spinner } from '../components/ui'
import { SelectBuscable } from '../components/SelectBuscable'
import { CamposPersonalizadosForm, mismosDatos, useCamposModulo } from '../components/CamposPersonalizados'
import { Modal } from '../components/Modal'
import { IconBack, IconDownload, IconPlus, IconTrash } from '../components/icons'
import type { BOMLinea, LineaInput, ResumenCategoria } from '../types'

const mxn = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
// "—" cuando el material no se compra en esa moneda (costo 0 = vacío)
const mxnOr = (n: number) => (n > 0 ? mxn(n) : '—')
const usdOr = (n: number) => (n > 0 ? usd(n) : '—')

// Recalcula el resumen por categoría a partir de un subconjunto de líneas
// (los importes de cada material ya incluyen el factor de cantidad de su línea).
function calcularResumen(lineas: BOMLinea[], plantilla: ResumenCategoria[]) {
    const acc: Record<string, { mxn: number; usd: number }> = {}
    plantilla.forEach((c) => (acc[c.id] = { mxn: 0, usd: 0 }))
    let tMxn = 0
    let tUsd = 0
    lineas.forEach((l) =>
        l.materiales.forEach((m) => {
            if (acc[m.tipo]) {
                acc[m.tipo].mxn += m.importeMXN
                acc[m.tipo].usd += m.importeUSD
            }
            tMxn += m.importeMXN
            tUsd += m.importeUSD
        })
    )
    return {
        porCategoria: plantilla.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            mxn: +acc[c.id].mxn.toFixed(2),
            usd: +acc[c.id].usd.toFixed(2),
        })),
        totalGeneral: { mxn: +tMxn.toFixed(2), usd: +tUsd.toFixed(2) },
    }
}

export function EquipoBOMView() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { usuario, puede } = useAuth()
    // Cambiar la composición del BOM es una edición del equipo
    const puedeEditar = puede('equipos', 'editar')
    const puedeReporte = !!usuario?.permisos.generarReportes

    const equipo = useQuery({ queryKey: ['equipo', id], queryFn: () => getEquipo(id!), enabled: !!id })
    const componentes = useQuery({ queryKey: ['componentes'], queryFn: getComponentes })

    const [lineas, setLineas] = useState<LineaInput[]>([])
    const [pers, setPers] = useState<Record<string, unknown>>({})
    const [guardando, setGuardando] = useState(false)
    const { campos: camposPers } = useCamposModulo('equipos')

    // Modo reparación: cotización parcial de solo algunos componentes del equipo
    const [modoReparacion, setModoReparacion] = useState(false)
    const [seleccionRep, setSeleccionRep] = useState<string[]>([])
    const [modalRepAbierto, setModalRepAbierto] = useState(false)

    useEffect(() => {
        if (equipo.data) {
            setLineas(
                equipo.data.lineas.map((l) => ({
                    componente: l.componenteId,
                    variacion: l.variacionId,
                    cantidad: l.cantidad,
                }))
            )
            setPers(equipo.data.personalizados ?? {})
        }
    }, [equipo.data])

    const lineasGuardadas = useMemo(
        () =>
            (equipo.data?.lineas ?? []).map((l) => ({
                componente: l.componenteId,
                variacion: l.variacionId,
                cantidad: l.cantidad,
            })),
        [equipo.data]
    )
    const cambiaronLineas = JSON.stringify(lineas) !== JSON.stringify(lineasGuardadas)
    const cambiaronPers = !mismosDatos(pers, equipo.data?.personalizados ?? {})
    const hayCambios = cambiaronLineas || cambiaronPers

    if (equipo.isLoading || componentes.isLoading) return <Spinner label="Cargando BOM…" />
    if (!equipo.data) return null

    const bom = equipo.data
    const catComponentes = componentes.data ?? []

    // Datos mostrados según el modo (completo = creación, filtrado = reparación)
    const lineasMostradas = modoReparacion
        ? bom.lineas.filter((l) => seleccionRep.includes(l.lineaId))
        : bom.lineas
    const resumenMostrado = modoReparacion
        ? calcularResumen(lineasMostradas, bom.resumen.porCategoria)
        : bom.resumen

    const aplicarReparacion = (seleccion: string[]) => {
        setSeleccionRep(seleccion)
        setModoReparacion(true)
        setModalRepAbierto(false)
    }
    const salirReparacion = () => {
        setModoReparacion(false)
        setSeleccionRep([])
    }

    const nombreComponente = (compId: string) =>
        catComponentes.find((c) => c._id === compId)?.concepto ?? '(componente)'
    const nombreVariacion = (compId: string, varId: string) => {
        const c = catComponentes.find((x) => x._id === compId)
        return c?.variaciones.find((v) => v._id === varId)?.nombre ?? '(variación)'
    }

    const removeLinea = (i: number) => setLineas((l) => l.filter((_, j) => j !== i))
    const setCantidad = (i: number, n: number) =>
        setLineas((l) => l.map((li, j) => (j === i ? { ...li, cantidad: n } : li)))

    const guardar = async () => {
        setGuardando(true)
        try {
            // Solo se manda lo que cambió (así la bitácora no registra composiciones sin cambios)
            const res = await actualizarEquipo(id!, {
                ...(cambiaronLineas ? { lineas } : {}),
                ...(cambiaronPers ? { personalizados: pers } : {}),
            })
            toast.success(res.mensaje)
            equipo.refetch()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div>
            <button
                onClick={() => navigate('/equipos')}
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700"
            >
                <IconBack /> Volver a equipos
            </button>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display text-xl font-bold text-navy-900 sm:text-2xl">{bom.nombre}</h1>
                        {modoReparacion && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                                Modo reparación
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {bom.tipo || 'Equipo'} ·{' '}
                        {modoReparacion
                            ? `Cotización de reparación (${lineasMostradas.length} de ${bom.lineas.length} componentes)`
                            : 'Lista de materiales (BOM) · Creación completa'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {puedeReporte && (
                        <Button
                            variant="secondary"
                            onClick={() =>
                                descargarReporte(`equipo/${id}`, `BOM-${bom.nombre}.pdf`).catch((e) => toast.error(e.message))
                            }
                        >
                            <IconDownload /> Reporte PDF
                        </Button>
                    )}
                    {bom.lineas.length > 0 &&
                        (modoReparacion ? (
                            <Button variant="secondary" onClick={salirReparacion}>
                                Ver BOM completo
                            </Button>
                        ) : (
                            <Button variant="secondary" onClick={() => setModalRepAbierto(true)}>
                                Modo reparación
                            </Button>
                        ))}
                </div>
            </div>

            {/* ===== Datos adicionales del equipo (campos personalizados) ===== */}
            {camposPers.length > 0 && !modoReparacion && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <CamposPersonalizadosForm campos={camposPers} valores={pers} onChange={setPers} disabled={!puedeEditar} columnas={3} />
                </div>
            )}

            {/* ===== Resumen de costos por categoría ===== */}
            <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-3">
                    <h2 className="font-display text-lg font-bold text-navy-900">Resumen de costos por categoría</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-5 py-2">Categoría</th>
                                <th className="px-5 py-2 text-right">Total MXN</th>
                                <th className="px-5 py-2 text-right">Total USD</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {resumenMostrado.porCategoria.map((c) => (
                                <tr key={c.id}>
                                    <td className="px-5 py-2">
                                        <div className="flex items-center gap-2">
                                            <CategoriaBadge id={c.id} />
                                            <span className="text-slate-700">{c.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-2 text-right text-slate-700">{mxn(c.mxn)}</td>
                                    <td className="px-5 py-2 text-right text-slate-700">{usd(c.usd)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-300 bg-navy-900 font-bold text-white">
                                <td className="px-5 py-3 font-display">
                                    TOTAL GENERAL{modoReparacion ? ' (REPARACIÓN)' : ''}
                                </td>
                                <td className="px-5 py-3 text-right">{mxn(resumenMostrado.totalGeneral.mxn)}</td>
                                <td className="px-5 py-3 text-right">{usd(resumenMostrado.totalGeneral.usd)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* ===== Composición del equipo (editable) ===== */}
            {puedeEditar && !modoReparacion && (
                <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                        <h2 className="font-display text-lg font-bold text-navy-900">Composición del equipo</h2>
                        {cambiaronLineas && <span className="text-xs font-medium text-amber-600">Cambios sin guardar</span>}
                    </div>

                    <div className="divide-y divide-slate-100">
                        {lineas.length === 0 && (
                            <p className="px-5 py-6 text-center text-sm text-slate-400">
                                Aún no hay componentes. Agrega líneas abajo.
                            </p>
                        )}
                        {lineas.map((li, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                <span className="font-semibold text-navy-900">{nombreComponente(li.componente)}</span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                    {nombreVariacion(li.componente, li.variacion)}
                                </span>
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                    <span>×</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={li.cantidad}
                                        onChange={(e) => setCantidad(i, Number(e.target.value))}
                                        className="w-16 rounded border border-slate-300 px-2 py-1"
                                    />
                                </div>
                                <button
                                    onClick={() => removeLinea(i)}
                                    className="ml-auto rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title="Quitar línea"
                                >
                                    <IconTrash />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-200 px-5 py-3">
                        <AgregarLinea
                            componentes={catComponentes}
                            onAdd={(linea) => setLineas((l) => [...l, linea])}
                        />
                    </div>
                </div>
            )}

            {/* ===== Detalle de materiales (BOM completo o de reparación) ===== */}
            <div className="space-y-5">
                {lineasMostradas.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
                        {modoReparacion
                            ? 'No hay componentes seleccionados para la reparación.'
                            : 'Este equipo aún no tiene materiales. Agrega componentes en la composición y guarda.'}
                    </div>
                ) : (
                    lineasMostradas.map((l) => (
                        <div key={l.lineaId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
                                <span className="font-display font-bold text-navy-900">{l.componente}</span>
                                <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                                    {l.variacion}
                                </span>
                                <span className="text-xs text-slate-400">× {l.cantidad}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-2">Clave</th>
                                            <th className="px-4 py-2">Concepto</th>
                                            <th className="px-4 py-2">Proveedor</th>
                                            <th className="px-4 py-2 text-center">Tipo</th>
                                            <th className="px-4 py-2 text-right">Cant.</th>
                                            <th className="px-4 py-2">Unidad</th>
                                            <th className="px-4 py-2 text-right">Costo MXN</th>
                                            <th className="px-4 py-2 text-right">Costo USD</th>
                                            <th className="px-4 py-2 text-right">Importe MXN</th>
                                            <th className="px-4 py-2 text-right">Importe USD</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {l.materiales.map((m, mi) => (
                                            <tr key={mi} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-mono font-semibold text-brand-700">{m.clave}</td>
                                                <td className="px-4 py-2 text-slate-700">{m.concepto}</td>
                                                <td className="px-4 py-2 text-slate-500">{m.proveedor || '—'}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <CategoriaBadge id={m.tipo} />
                                                </td>
                                                <td className="px-4 py-2 text-right text-slate-600">
                                                    {m.cantidad}
                                                    {l.cantidad > 1 && (
                                                        <span className="ml-1 text-xs text-slate-400">
                                                            ({m.cantidadUnitaria} × {l.cantidad})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-slate-500">{m.unidad}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{mxnOr(m.costoMXN)}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{usdOr(m.costoUSD)}</td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-800">
                                                    {mxnOr(m.importeMXN)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-800">
                                                    {usdOr(m.importeUSD)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Guardar la composición siempre a la vista, aunque se revise el BOM más abajo */}
            {puedeEditar && !modoReparacion && (
                <BarraGuardado
                    hayCambios={hayCambios}
                    guardando={guardando}
                    onGuardar={guardar}
                    onDescartar={() => {
                        setLineas(lineasGuardadas)
                        setPers(equipo.data?.personalizados ?? {})
                    }}
                    etiqueta="Guardar cambios"
                />
            )}

            {modalRepAbierto && (
                <ReparacionModal
                    lineas={bom.lineas}
                    onClose={() => setModalRepAbierto(false)}
                    onAplicar={aplicarReparacion}
                />
            )}
        </div>
    )
}

// Modal: selección de los componentes del equipo que se van a reparar/reemplazar
function ReparacionModal({
    lineas,
    onClose,
    onAplicar,
}: {
    lineas: BOMLinea[]
    onClose: () => void
    onAplicar: (seleccion: string[]) => void
}) {
    const [sel, setSel] = useState<string[]>([])
    const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <Modal open onClose={onClose} titulo="Modo reparación — seleccionar componentes" ancho="max-w-lg">
            <p className="mb-3 text-sm text-slate-500">
                Elige los componentes de este equipo que se van a reparar o reemplazar. El resumen de costos y el
                total se recalcularán solo con lo seleccionado.
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto">
                {lineas.map((l) => (
                    <label
                        key={l.lineaId}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                        <input
                            type="checkbox"
                            checked={sel.includes(l.lineaId)}
                            onChange={() => toggle(l.lineaId)}
                            className="rounded"
                        />
                        <span className="font-semibold text-navy-900">{l.componente}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{l.variacion}</span>
                        <span className="ml-auto text-xs text-slate-400">× {l.cantidad}</span>
                    </label>
                ))}
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Button variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    onClick={() => {
                        if (sel.length === 0) {
                            toast.error('Selecciona al menos un componente')
                            return
                        }
                        onAplicar(sel)
                    }}
                >
                    Aplicar reparación ({sel.length})
                </Button>
            </div>
        </Modal>
    )
}

// Selector para agregar una línea (componente + variación + cantidad)
function AgregarLinea({
    componentes,
    onAdd,
}: {
    componentes: { _id: string; concepto: string; variaciones: { _id?: string; nombre: string }[] }[]
    onAdd: (linea: LineaInput) => void
}) {
    const [comp, setComp] = useState('')
    const [variacion, setVariacion] = useState('')
    const [cantidad, setCantidad] = useState(1)

    const seleccionado = componentes.find((c) => c._id === comp)
    const opcionesComp = useMemo(
        () =>
            componentes.map((c) => ({
                value: c._id,
                label: c.concepto,
                detalle: `${c.variaciones.length} variación${c.variaciones.length === 1 ? '' : 'es'}`,
            })),
        [componentes]
    )

    return (
        <div className="flex flex-wrap items-end gap-2">
            <div className="w-full sm:w-72">
                <span className="mb-1 block text-xs font-medium text-slate-500">Componente</span>
                <SelectBuscable
                    value={comp}
                    onChange={(v) => {
                        setComp(v)
                        // Si solo tiene una variación, se preselecciona
                        const c = componentes.find((x) => x._id === v)
                        setVariacion(c?.variaciones.length === 1 ? c.variaciones[0]._id ?? '' : '')
                    }}
                    opciones={opcionesComp}
                    placeholder="Buscar componente…"
                    aria-label="Componente"
                />
            </div>
            <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Variación</label>
                <Select
                    value={variacion}
                    onChange={(e) => setVariacion(e.target.value)}
                    disabled={!seleccionado}
                    className="min-w-40"
                >
                    <option value="">Selecciona…</option>
                    {seleccionado?.variaciones.map((v) => (
                        <option key={v._id} value={v._id}>
                            {v.nombre}
                        </option>
                    ))}
                </Select>
            </div>
            <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Cantidad</label>
                <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
            </div>
            <Button
                variant="secondary"
                onClick={() => {
                    if (comp && variacion) {
                        onAdd({ componente: comp, variacion, cantidad: cantidad || 1 })
                        setComp('')
                        setVariacion('')
                        setCantidad(1)
                    } else {
                        toast.error('Selecciona componente y variación')
                    }
                }}
            >
                <IconPlus /> Agregar línea
            </Button>
        </div>
    )
}
