import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
    actualizarCostoMaterialCot,
    actualizarCotizacion,
    cancelarCotizacion,
    declararSalida,
    getCotizacionDetalle,
    registrarOrdenesCot,
} from '../api/CotizacionesAPI'
import { descargarReporte } from '../api/ReportesAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, CategoriaBadge, Input, Spinner } from '../components/ui'
import { IconBack, IconCheck, IconDownload, IconEdit } from '../components/icons'
import type { CotMaterialRow, EstadoStock, OrdenSugerida } from '../types'

const mxn = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
// "—" cuando el material no juega en esa moneda (costo 0 = vacío)
const mxnOr = (n: number) => (n > 0 ? mxn(n) : '—')
const usdOr = (n: number) => (n > 0 ? usd(n) : '—')

function EstadoStockCelda({ estado, faltante }: { estado: EstadoStock; faltante: number }) {
    if (estado === 'completo')
        return (
            <span className="inline-flex items-center gap-1 text-emerald-600">
                <IconCheck width={16} height={16} /> Completo
            </span>
        )
    if (estado === 'requerido') return <span className="font-semibold text-red-600">Requerido</span>
    return (
        <span className="font-semibold text-amber-600">
            Faltan {faltante} unidad{faltante === 1 ? '' : 'es'}
        </span>
    )
}

export function CotizacionDetalleView() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { usuario, puede } = useAuth()
    // Ajustar TC/costos y declarar salida = editar · registrar órdenes = crear · cancelar = eliminar
    const puedeEditar = puede('cotizaciones', 'editar')
    const puedeCrearOrdenes = puede('cotizaciones', 'crear')
    const puedeEliminar = puede('cotizaciones', 'eliminar')
    const puedeReporte = !!usuario?.permisos.generarReportes
    const queryClient = useQueryClient()

    const [editandoCosto, setEditandoCosto] = useState(false)
    const [nuevoCosto, setNuevoCosto] = useState(0)
    const [editandoTC, setEditandoTC] = useState(false)
    const [nuevoTC, setNuevoTC] = useState(0)

    const q = useQuery({ queryKey: ['cotizacion', id], queryFn: () => getCotizacionDetalle(id!), enabled: !!id })

    const invalidar = () => queryClient.invalidateQueries({ queryKey: ['cotizacion', id] })

    const registrar = useMutation({
        mutationFn: (args: { proveedor?: string; total?: number }) =>
            registrarOrdenesCot(id!, args.proveedor, args.total),
        onSuccess: (res) => {
            toast.success(`${res.mensaje}: ${res.ordenes.join(', ') || 'sin nuevas'}`)
            invalidar()
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const salida = useMutation({
        mutationFn: () => declararSalida(id!),
        onSuccess: (res) => {
            toast.success(`${res.mensaje} (${res.materialesDescontados})`)
            invalidar()
            queryClient.invalidateQueries({ queryKey: ['inventario'] })
            queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const cancelar = useMutation({
        mutationFn: () => cancelarCotizacion(id!),
        onSuccess: (res) => {
            toast.success(`${res.mensaje} · ${res.ordenesEliminadas} orden(es) eliminada(s)`)
            invalidar()
            queryClient.invalidateQueries({ queryKey: ['ordenes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const guardarCosto = useMutation({
        mutationFn: (costo: number) => actualizarCotizacion(id!, { costoCotizacion: costo }),
        onSuccess: () => {
            toast.success('Costo real ajustado manualmente')
            setEditandoCosto(false)
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const usarCalculado = useMutation({
        mutationFn: () => actualizarCotizacion(id!, { usarCalculado: true }),
        onSuccess: () => {
            toast.success('Se usará el costo real calculado')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const guardarTC = useMutation({
        mutationFn: (tc: number) => actualizarCotizacion(id!, { tipoCambio: tc }),
        onSuccess: () => {
            toast.success('Tipo de cambio actualizado')
            setEditandoTC(false)
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const editarCostoMat = useMutation({
        mutationFn: (args: { material: string; costoMXN?: number; costoUSD?: number }) =>
            actualizarCostoMaterialCot(id!, args.material, { costoMXN: args.costoMXN, costoUSD: args.costoUSD }),
        onSuccess: () => {
            toast.success('Costo actualizado en el catálogo')
            invalidar()
            queryClient.invalidateQueries({ queryKey: ['materiales'] })
            queryClient.invalidateQueries({ queryKey: ['componentes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (q.isLoading || !q.data) return <Spinner label="Cargando cotización…" />
    const d = q.data
    const hayFaltantes = d.lineasTabla.some((l) => l.materiales.some((m) => m.estadoStock !== 'completo'))
    const activa = d.estado === 'activa'
    // Costo real efectivo en pesos: el ajustado a mano gana sobre el consolidado.
    // El consolidado YA incluye los materiales en dólares convertidos a pesos.
    const efectivoReal = d.costoManualDefinido ? d.costoCotizacion : d.totalConsolidadoMXN
    // ¿La cotización mezcla monedas? (hay materiales en pesos Y en dólares)
    const hayMezcla = d.subtotalMXN > 0 && d.subtotalUSD > 0
    // El ajuste manual solo se habilita cuando NO hay faltantes (listo para declarar salida)
    const puedeAjustarManual = puedeEditar && activa && !hayFaltantes

    return (
        <div>
            <button
                onClick={() => navigate('/cotizaciones')}
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700"
            >
                <IconBack /> Volver a cotizaciones
            </button>

            {/* Encabezado */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display text-2xl font-bold text-navy-900">{d.equipoNombre}</h1>
                        <span className="font-mono text-sm text-slate-400">{d.folio}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Cotización de{' '}
                        <span className={d.contexto === 'reparacion' ? 'font-semibold text-amber-700' : 'font-semibold text-brand-700'}>
                            {d.contexto === 'reparacion' ? 'reparación' : 'creación'}
                        </span>{' '}
                        · {d.estado === 'surtida' ? 'Surtida (salida declarada)' : d.estado === 'cancelada' ? 'Cancelada' : 'Activa'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        {d.creadoPor ? `Creada por ${d.creadoPor}` : 'Creada por —'}
                        {d.surtidaPor && ` · Salida declarada por ${d.surtidaPor}`}
                    </p>
                    {d.estado === 'surtida' && puedeReporte && (
                        <Button
                            variant="secondary"
                            className="mt-3"
                            onClick={() =>
                                descargarReporte(`cotizacion/${id}`, `cotizacion-${d.folio}.pdf`).catch((e) =>
                                    toast.error(e.message)
                                )
                            }
                        >
                            <IconDownload /> Descargar reporte (PDF)
                        </Button>
                    )}
                </div>
                {/* Costo real de la cotización (calculado, o ajustado a mano si todo está completo) */}
                <div className="w-full rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 shadow-sm sm:w-80">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-brand-700">
                            Costo real de la cotización
                            {d.costoManualDefinido && (
                                <span className="ml-1 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                                    ajustado
                                </span>
                            )}
                        </p>
                        {puedeAjustarManual && !editandoCosto && (
                            <button
                                onClick={() => {
                                    setNuevoCosto(efectivoReal)
                                    setEditandoCosto(true)
                                }}
                                className="rounded-md p-1 text-brand-400 hover:bg-white hover:text-brand-700"
                                title="Ajustar el costo real manualmente"
                            >
                                <IconEdit width={16} height={16} />
                            </button>
                        )}
                    </div>

                    {editandoCosto ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Input
                                type="number"
                                step="0.01"
                                value={nuevoCosto}
                                onChange={(e) => setNuevoCosto(Number(e.target.value))}
                                className="w-32"
                            />
                            <Button onClick={() => guardarCosto.mutate(nuevoCosto)} disabled={guardarCosto.isPending}>
                                Guardar
                            </Button>
                            <button
                                onClick={() => setEditandoCosto(false)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="font-display text-2xl font-bold text-brand-800">{mxn(efectivoReal)}</p>
                            <p className="font-display text-sm font-semibold text-brand-600">
                                {usd(d.totalConsolidadoUSD)}
                            </p>

                            {/* Tipo de cambio + desglose (único punto de conversión) */}
                            <div className="mt-2 border-t border-brand-200/60 pt-2">
                                {editandoTC ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] text-brand-700">TC $</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={nuevoTC}
                                            onChange={(e) => setNuevoTC(Number(e.target.value))}
                                            className="w-24"
                                        />
                                        <Button onClick={() => guardarTC.mutate(nuevoTC)} disabled={guardarTC.isPending}>
                                            Guardar
                                        </Button>
                                        <button
                                            onClick={() => setEditandoTC(false)}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-brand-600/80">
                                            Tipo de cambio: {mxn(d.tipoCambio)} / USD
                                            <span className="text-brand-400"> · referencial</span>
                                        </span>
                                        {puedeEditar && activa && (
                                            <button
                                                onClick={() => {
                                                    setNuevoTC(d.tipoCambio)
                                                    setEditandoTC(true)
                                                }}
                                                className="rounded-md p-1 text-brand-400 hover:bg-white hover:text-brand-700"
                                                title="Ajustar el tipo de cambio de esta cotización"
                                            >
                                                <IconEdit width={14} height={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {hayMezcla && (
                                    <p className="mt-1 text-[11px] text-brand-600/70">
                                        Incluye {mxn(d.subtotalMXN)} en pesos + {usd(d.subtotalUSD)} en dólares
                                        (convertidos al total).
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {d.costoManualDefinido ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-brand-600/80">
                            <span>Ajustado manualmente · calculado: {mxn(d.totalConsolidadoMXN)}</span>
                            {puedeAjustarManual && (
                                <button
                                    onClick={() => usarCalculado.mutate()}
                                    disabled={usarCalculado.isPending}
                                    className="underline hover:text-brand-800"
                                >
                                    Usar calculado
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="mt-0.5 text-[11px] text-brand-600/80">
                            Este costo total se calcula a partir de los costos reales de esta cotización dadas actualizaciones y correcciones
                            de costos en órdenes de compra.
                        </p>
                    )}

                    {activa && hayFaltantes && (
                        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                            Podrás ajustar el costo manualmente cuando todas las órdenes y materiales requeridos estén
                            completos.
                        </p>
                    )}
                </div>
            </div>

            {/* Tabla tipo Excel: materiales por componente vs inventario */}
            <div className="mb-6 space-y-4">
                {d.lineasTabla.map((l, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
                            <span className="font-display font-bold text-navy-900">{l.componenteConcepto}</span>
                            <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                                {l.variacionNombre}
                            </span>
                            <span className="text-xs text-slate-400">× {l.cantidad}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Clave</th>
                                        <th className="px-3 py-2">Concepto</th>
                                        <th className="px-3 py-2 text-center">Tipo</th>
                                        <th className="px-3 py-2 text-right">Cant.</th>
                                        <th className="px-3 py-2 text-right">Costo Est.</th>
                                        <th className="px-3 py-2 text-right">Costo real MXN</th>
                                        <th className="px-3 py-2 text-right">Importe MXN</th>
                                        <th className="px-3 py-2 text-right">Costo real USD</th>
                                        <th className="px-3 py-2 text-right">Importe USD</th>
                                        <th className="px-3 py-2">Fuente (costo)</th>
                                        {activa && <th className="px-3 py-2 text-center">Stock</th>}
                                        {activa && <th className="px-3 py-2">Estado</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {l.materiales.map((m, j) => (
                                        <tr key={j} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-mono font-semibold text-brand-700">{m.clave}</td>
                                            <td className="px-3 py-2 text-slate-700">{m.concepto}</td>
                                            <td className="px-3 py-2 text-center">
                                                <CategoriaBadge id={m.tipo} />
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">{m.cantidad}</td>
                                            <td className="px-3 py-2 text-right text-slate-400">{mxnOr(m.costoMXN)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <CostoRealCell
                                                    valor={m.costoRealMXN}
                                                    formato={mxnOr}
                                                    editable={puedeEditar && m.fuenteCosto === 'catalogo' && !!m.material}
                                                    guardando={editarCostoMat.isPending}
                                                    onGuardar={(costo) =>
                                                        editarCostoMat.mutate({ material: m.material!, costoMXN: costo })
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-navy-900">
                                                {mxnOr(m.importeRealMXN)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <CostoRealCell
                                                    valor={m.costoRealUSD}
                                                    formato={usdOr}
                                                    editable={puedeEditar && m.fuenteCosto === 'catalogo' && !!m.material}
                                                    guardando={editarCostoMat.isPending}
                                                    onGuardar={(costo) =>
                                                        editarCostoMat.mutate({ material: m.material!, costoUSD: costo })
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-navy-900">
                                                {usdOr(m.importeRealUSD)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <FuenteBadge m={m} />
                                            </td>
                                            {activa && (
                                                <td className="px-3 py-2 text-center text-slate-600">{m.stock}</td>
                                            )}
                                            {activa && (
                                                <td className="px-3 py-2">
                                                    <EstadoStockCelda estado={m.estadoStock} faltante={m.faltante} />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Órdenes sugeridas */}
            {activa && (
                <div className="mb-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-display text-lg font-bold text-navy-900">
                            Órdenes de compra requeridas ({d.ordenesSugeridas.length})
                        </h2>
                        {d.ordenesSugeridas.length > 0 && puedeCrearOrdenes && (
                            <Button onClick={() => registrar.mutate({})} disabled={registrar.isPending}>
                                Registrar todas como borrador
                            </Button>
                        )}
                    </div>

                    {d.ordenesSugeridas.length === 0 ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                            <span className="inline-flex items-center gap-2 font-semibold">
                                <IconCheck width={18} height={18} /> Todos los materiales están completos en inventario.
                            </span>
                            {puedeEditar && (
                                <div className="mt-3">
                                    <Button onClick={() => salida.mutate()} disabled={salida.isPending}>
                                        {salida.isPending ? 'Declarando…' : 'Declarar salida (descontar del inventario)'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {d.ordenesSugeridas.map((o) => {
                                // Solo una orden PENDIENTE (borrador/enviada) cubre realmente al proveedor.
                                // Si la previa quedó confirmada o cancelada y el material sigue requerido,
                                // hay que poder registrar una NUEVA orden.
                                const pendiente = d.ordenesRegistradas.find(
                                    (r) =>
                                        r.proveedorSnap.codigo === o.codigo &&
                                        (r.estado === 'borrador' || r.estado === 'enviada')
                                )
                                const cerradaPrevia =
                                    !pendiente &&
                                    d.ordenesRegistradas.find((r) => r.proveedorSnap.codigo === o.codigo)
                                return (
                                    <OrdenSugeridaCard
                                        key={o.proveedor}
                                        orden={o}
                                        yaRegistrada={!!pendiente}
                                        avisoPrevia={cerradaPrevia ? cerradaPrevia.folio : ''}
                                        puedeCotizar={puedeCrearOrdenes}
                                        registrando={registrar.isPending}
                                        onRegistrar={(total) => registrar.mutate({ proveedor: o.proveedor, total })}
                                    />
                                )
                            })}
                        </div>
                    )}

                    {d.sinProveedor.length > 0 && (
                        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Sin proveedor asignado (no se puede ordenar automáticamente): {d.sinProveedor.join(', ')}
                        </p>
                    )}
                </div>
            )}

            {/* Órdenes ya registradas desde esta cotización */}
            {d.ordenesRegistradas.length > 0 && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-2 font-display font-bold text-navy-900">Órdenes registradas de esta cotización</h3>
                    <div className="flex flex-wrap gap-2">
                        {d.ordenesRegistradas.map((r) => (
                            <button
                                key={r._id}
                                onClick={() => navigate('/ordenes')}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                            >
                                <span className="font-mono font-semibold text-brand-700">{r.folio}</span>{' '}
                                <span className="text-slate-500">· {r.proveedorSnap.codigo} · {r.estado}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Acciones finales */}
            {activa && (puedeEditar || puedeEliminar) && (
                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                    {puedeEliminar && (
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (
                                    confirm(
                                        '¿Cancelar la cotización? Se eliminarán las órdenes de compra asociadas que aún NO se hayan enviado o recibido.'
                                    )
                                )
                                    cancelar.mutate()
                            }}
                        >
                            Cancelar cotización
                        </Button>
                    )}
                    {puedeEditar && !hayFaltantes && (
                        <Button onClick={() => salida.mutate()} disabled={salida.isPending}>
                            {salida.isPending ? 'Declarando…' : 'Declarar salida'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

// ---------- Celda de costo real (editable inline si viene del catálogo) ----------
function CostoRealCell({
    valor: costoActual,
    formato,
    editable,
    guardando,
    onGuardar,
}: {
    valor: number
    formato: (n: number) => string
    editable: boolean
    guardando: boolean
    onGuardar: (costo: number) => void
}) {
    const [editando, setEditando] = useState(false)
    const [valor, setValor] = useState(costoActual)

    if (editando) {
        return (
            <div className="flex items-center justify-end gap-1">
                <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valor}
                    onChange={(e) => setValor(Number(e.target.value))}
                    className="w-24 text-right"
                />
                <button
                    onClick={() => onGuardar(valor)}
                    disabled={guardando}
                    className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
                    title="Guardar en catálogo"
                >
                    <IconCheck width={16} height={16} />
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-end gap-1">
            <span className="font-medium text-slate-800">{formato(costoActual)}</span>
            {editable && (
                <button
                    onClick={() => {
                        setValor(costoActual)
                        setEditando(true)
                    }}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Editar costo (actualiza el catálogo)"
                >
                    <IconEdit width={14} height={14} />
                </button>
            )}
        </div>
    )
}

// ---------- Badge de fuente del costo real ----------
function FuenteBadge({ m }: { m: CotMaterialRow }) {
    if (m.fuenteCosto === 'orden') {
        return (
            <span
                className="inline-flex flex-col items-start gap-0.5 whitespace-nowrap rounded-md bg-indigo-50 px-2 py-1 leading-none ring-1 ring-indigo-100"
                title={`Costo real tomado de la orden ${m.fuenteFolio} (${m.fuenteProveedor})`}
            >
                <span className="font-mono text-xs font-medium text-indigo-700">{m.fuenteFolio || 'Orden'}</span>
                {m.fuenteProveedor && <span className="text-[10px] font-medium text-indigo-400">{m.fuenteProveedor}</span>}
            </span>
        )
    }
    return (
        <span className="inline-flex items-center whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Catálogo
        </span>
    )
}

// ---------- Tarjeta de orden sugerida (con total editable antes de registrar) ----------
function OrdenSugeridaCard({
    orden,
    yaRegistrada,
    avisoPrevia,
    puedeCotizar,
    registrando,
    onRegistrar,
}: {
    orden: OrdenSugerida
    yaRegistrada: boolean
    avisoPrevia: string
    puedeCotizar: boolean
    registrando: boolean
    onRegistrar: (total: number) => void
}) {
    const [total, setTotal] = useState(orden.total)

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3">
                <p className="font-display font-bold text-navy-900">{orden.codigo}</p>
                <p className="text-xs text-slate-500">{orden.razonSocial}</p>
            </div>
            {avisoPrevia && !yaRegistrada && (
                <p className="mb-3 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                    La orden {avisoPrevia} a este proveedor ya se cerró y el material sigue requerido. Registra una
                    nueva orden.
                </p>
            )}
            <ul className="mb-3 space-y-1 text-sm">
                {orden.items.map((it, k) => (
                    <li key={k} className="flex justify-between text-slate-700">
                        <span>
                            <span className="font-mono text-brand-700">{it.clave}</span> {it.concepto}
                            {it.moneda === 'usd' && (
                                <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">
                                    USD
                                </span>
                            )}
                        </span>
                        <span className="font-medium">× {it.cantidad}</span>
                    </li>
                ))}
            </ul>

            {puedeCotizar && !yaRegistrada ? (
                <div className="border-t border-slate-200 pt-3">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                        Total estimado en pesos (editable · calculado {mxn(orden.total)}
                        {orden.totalUSD > 0 && ` + ${usd(orden.totalUSD)} en dólares`})
                    </label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={total}
                            onChange={(e) => setTotal(Number(e.target.value))}
                            className="w-32 text-right"
                        />
                        <Button variant="secondary" onClick={() => onRegistrar(total)} disabled={registrando}>
                            Registrar borrador
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-800">
                        {mxn(orden.total)}
                        {orden.totalUSD > 0 && ` + ${usd(orden.totalUSD)}`}
                    </span>
                    {yaRegistrada && (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                            <IconCheck width={16} height={16} /> Registrada
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
