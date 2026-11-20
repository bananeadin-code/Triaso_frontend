import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getHistorial } from '../api/HistorialAPI'
import { getMovimientos } from '../api/MovimientosAPI'
import { EmptyState, PageHeader, Spinner } from '../components/ui'
import { IconAlerta } from '../components/icons'
import type { AccionHistorial, HistorialEntry, MovimientoInventario, SectorHistorial, TipoHistorial, TipoMovimiento } from '../types'

const fecha = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Filtro por sector (null = todos; 'inventario' muestra el kárdex de movimientos)
type FiltroSector = SectorHistorial | null
const CHIPS: { key: FiltroSector; label: string }[] = [
    { key: null, label: 'Todos' },
    { key: 'catalogos', label: 'Catálogos' },
    { key: 'bom', label: 'BOM (Equipos)' },
    { key: 'compras', label: 'Compras' },
    { key: 'inventario', label: 'Inventario (kárdex)' },
    { key: 'sistema', label: 'Sistema' },
]

const SECTOR_BADGE: Record<SectorHistorial, { txt: string; cls: string }> = {
    catalogos: { txt: 'Catálogos', cls: 'bg-slate-100 text-slate-600' },
    bom: { txt: 'BOM', cls: 'bg-indigo-50 text-indigo-700' },
    compras: { txt: 'Compras', cls: 'bg-blue-50 text-blue-700' },
    inventario: { txt: 'Inventario', cls: 'bg-emerald-50 text-emerald-700' },
    sistema: { txt: 'Sistema', cls: 'bg-purple-50 text-purple-700' },
}

const ACCION: Record<AccionHistorial, string> = { creo: 'Creó', edito: 'Editó', elimino: 'Eliminó', importo: 'Importó' }
const TIPO_LABEL: Record<TipoHistorial, string> = {
    componente: 'el componente',
    equipo: 'el equipo',
    material: 'el material',
    proveedor: 'el proveedor',
    usuario: 'el usuario',
    sistema: '',
    importacion: '',
}

export function HistorialView() {
    // Bitácora de solo consulta: Triaso no borra su historial (se poda solo a 50 por sector)
    const [sector, setSector] = useState<FiltroSector>(null)

    const esKardex = sector === 'inventario'

    const historial = useQuery({
        queryKey: ['historial', sector],
        queryFn: () => getHistorial(sector ?? undefined),
        enabled: !esKardex,
    })
    const kardex = useQuery({ queryKey: ['movimientos', 'todos'], queryFn: () => getMovimientos(), enabled: esKardex })

    const registros = historial.data ?? []
    const movimientos = kardex.data ?? []
    const cargando = esKardex ? kardex.isLoading : historial.isLoading

    return (
        <div>
            <PageHeader
                titulo="Historial y movimientos"
                descripcion="Bitácora del sistema: altas, ediciones, bajas e importaciones por sector, con su responsable"
            />

            {/* Banner de filtros por sector */}
            <div className="mb-5 flex flex-wrap gap-2">
                {CHIPS.map((c) => (
                    <button
                        key={c.label}
                        onClick={() => setSector(c.key)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            sector === c.key
                                ? 'bg-brand-600 text-white'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {cargando ? (
                <Spinner label="Cargando…" />
            ) : esKardex ? (
                <KardexLista movimientos={movimientos} />
            ) : registros.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <EmptyState
                        titulo="Sin registros en este sector"
                        descripcion="Cuando alguien dé de alta, edite, elimine o importe algo, aparecerá aquí con su antes y después."
                    />
                </div>
            ) : (
                <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
                    {registros.map((r) => (
                        <HistorialCard key={r._id} registro={r} />
                    ))}
                </ol>
            )}
        </div>
    )
}

function HistorialCard({ registro: r }: { registro: HistorialEntry }) {
    const afectados = r.equiposAfectados.length > 0 && (
        <>
            {' '}· Afecta {r.equiposAfectados.length > 1 ? 'a los equipos' : 'al equipo'}:{' '}
            <span className="font-medium text-brand-700">{r.equiposAfectados.map((e) => e.nombre).join(', ')}</span>
        </>
    )
    const badge = SECTOR_BADGE[r.sector] ?? SECTOR_BADGE.catalogos

    return (
        <li
            className={`relative rounded-xl border p-5 shadow-sm ${
                r.critico ? 'border-red-300 bg-red-50/60' : 'border-slate-200 bg-white'
            }`}
        >
            <span
                className={`absolute -left-[31px] top-6 h-3 w-3 rounded-full ring-4 ring-white ${
                    r.critico ? 'bg-red-600' : r.sensible ? 'bg-amber-500' : 'bg-brand-500'
                }`}
            />

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            r.critico ? 'bg-red-600 text-white' : 'bg-brand-100 text-brand-700'
                        }`}
                    >
                        {r.usuario.charAt(0).toUpperCase()}
                    </span>
                    <span className={`text-sm font-semibold ${r.critico ? 'text-red-800' : 'text-navy-900'}`}>
                        {r.usuario}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.txt}</span>
                    {r.critico ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                            <IconAlerta width={12} height={12} /> Eliminación
                        </span>
                    ) : (
                        r.sensible && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                <IconAlerta width={12} height={12} /> Cambio mayor
                            </span>
                        )
                    )}
                </div>
                <span className={`text-xs ${r.critico ? 'text-red-400' : 'text-slate-400'}`}>{fecha(r.createdAt)}</span>
            </div>

            <p className={`text-sm ${r.critico ? 'text-red-900' : 'text-slate-700'}`}>
                <span className={`font-semibold ${r.accion === 'elimino' ? 'text-red-700' : 'text-slate-700'}`}>
                    {ACCION[r.accion] ?? 'Modificó'}
                </span>{' '}
                {TIPO_LABEL[r.tipo] ? `${TIPO_LABEL[r.tipo]} ` : ''}
                <span className="font-semibold text-navy-900">{r.entidad || r.equipoNombre || r.materialClave || r.componenteConcepto}</span>
                {afectados}
            </p>

            <ul className="mt-3 space-y-1.5">
                {r.cambios.map((c, i) => {
                    const [detalle, valores] = c.split(/:\s(.+)/)
                    return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                            <span className="text-slate-600">
                                {valores ? (
                                    <>
                                        <span className="text-slate-500">{detalle}: </span>
                                        <span className="font-medium text-slate-800">{valores}</span>
                                    </>
                                ) : (
                                    <span className="font-medium text-slate-800">{c}</span>
                                )}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </li>
    )
}

// ---------- Kárdex de inventario (sector Inventario) ----------
const TIPO_MOV: Record<TipoMovimiento, { txt: string; cls: string; signo: string }> = {
    entrada: { txt: 'Entrada', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', signo: '+' },
    salida: { txt: 'Salida', cls: 'bg-red-50 text-red-700 ring-red-200', signo: '−' },
    ajuste: { txt: 'Ajuste', cls: 'bg-amber-50 text-amber-700 ring-amber-200', signo: '±' },
}

function KardexLista({ movimientos }: { movimientos: MovimientoInventario[] }) {
    if (movimientos.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <EmptyState
                    titulo="Sin movimientos de inventario"
                    descripcion="Las entradas por recepción, salidas por cotización y ajustes manuales aparecerán aquí."
                />
            </div>
        )
    }
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                        {movimientos.map((m) => {
                            const info = TIPO_MOV[m.tipo]
                            return (
                                <tr key={m._id} className="hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fecha(m.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-semibold text-brand-700">{m.clave}</span>
                                        <span className="ml-1 text-slate-600">{m.concepto}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ring-1 ${info.cls}`}>
                                            {info.txt}
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
            <p className="px-4 py-3 text-xs text-slate-400">
                Rastro auditable del stock físico. También disponible en Inventario › Movimientos.
            </p>
        </div>
    )
}
