// Importación de un BOM real desde Excel con ZONA DE REVISIÓN.
// 1) Se lee el archivo en el navegador · 2) el servidor lo concilia contra los catálogos SIN
// escribir nada (se re-analiza en cada cambio de decisión) · 3) se aplica como un LOTE con folio,
// lo nuevo queda "por validar" y el lote completo se puede deshacer.
import { useMemo, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { aplicarBOM, analizarBOM, deshacerLote, ErrorImportacion, getLotes, revisarDeshacer } from '../api/ImportacionesAPI'
import { getProveedores } from '../api/ProveedoresAPI'
import { leerBOMDeExcel, type ArchivoBOM } from '../lib/importarBOM'
import { opcionesProveedor } from '../lib/opciones'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, EmptyState, Input, PageHeader, Select, Spinner } from '../components/ui'
import { SelectBuscable } from '../components/SelectBuscable'
import { Paginacion, usePaginacionLocal, useRetrasado } from '../components/Paginacion'
import { IconAlerta, IconBack, IconCheck, IconUpload } from '../components/icons'
import type { AnalisisBOM, DecisionesBOM, LoteImportacion } from '../types'

const mxn = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Tab = 'componentes' | 'materiales' | 'conflictos' | 'proveedores' | 'unidades' | 'equipo'
type Resultado = { folio: string; equipoId: string; resumen: string[] }

export function ImportarBOMView() {
    const { puede } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const puedeImportar = (['equipos', 'componentes', 'materiales', 'proveedores'] as const).every((m) => puede(m, 'crear'))

    const [archivo, setArchivo] = useState<ArchivoBOM | null>(null)
    const [version, setVersion] = useState(0) // cambia con cada archivo leído
    const [leyendo, setLeyendo] = useState(false)
    const [decisiones, setDecisiones] = useState<DecisionesBOM>({})
    const [resultado, setResultado] = useState<Resultado | null>(null)
    const [tab, setTab] = useState<Tab>('componentes')
    const inputRef = useRef<HTMLInputElement>(null)

    // Re-análisis: cada cambio de decisión se manda al servidor (con pausa para no saturar)
    const decTexto = JSON.stringify(decisiones)
    const decRetrasadas = useRetrasado(decTexto, 400)
    const analisis = useQuery({
        queryKey: ['analisisBOM', version, decRetrasadas],
        queryFn: () => analizarBOM(archivo!, JSON.parse(decRetrasadas)),
        enabled: !!archivo && !resultado,
        placeholderData: keepPreviousData,
        staleTime: Infinity,
        retry: false,
    })
    const a = analisis.data
    const sincronizado = decRetrasadas === decTexto && !analisis.isFetching

    const lotes = useQuery({ queryKey: ['lotesImportacion'], queryFn: getLotes })

    const aplicar = useMutation({
        mutationFn: () => aplicarBOM(archivo!, decisiones),
        onSuccess: (r) => {
            toast.success(r.mensaje)
            setResultado({ folio: r.folio, equipoId: r.equipoId, resumen: r.resumen })
            for (const k of ['equipos', 'componentes', 'materiales', 'proveedores', 'lotesImportacion', 'configuracion', 'historial'])
                queryClient.invalidateQueries({ queryKey: [k] })
        },
        onError: (e: ErrorImportacion) => toast.error(e.bloqueos?.length ? `${e.message}: ${e.bloqueos[0]}` : e.message),
    })

    const elegirArchivo = async (file?: File) => {
        if (!file) return
        setLeyendo(true)
        try {
            const leido = await leerBOMDeExcel(file)
            setArchivo(leido)
            setDecisiones({})
            setResultado(null)
            setVersion((v) => v + 1)
            setTab('componentes')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo leer el archivo')
        } finally {
            setLeyendo(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    // Actualiza una parte de las decisiones (copia profunda: es un objeto pequeño)
    const decidir = (fn: (d: DecisionesBOM) => void) =>
        setDecisiones((d) => {
            const n: DecisionesBOM = JSON.parse(JSON.stringify(d))
            fn(n)
            return n
        })

    if (!puedeImportar)
        return (
            <EmptyState
                titulo="Sin permiso para importar"
                descripcion="Importar un BOM crea equipos, componentes, materiales y proveedores: necesitas permiso de crear en esos cuatro catálogos."
            />
        )

    return (
        <div className="pb-24">
            <button onClick={() => navigate('/equipos')} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700">
                <IconBack /> Volver a equipos
            </button>
            <PageHeader
                titulo="Importar BOM desde Excel"
                descripcion="La información pasa por una revisión antes de entrar: nada se agrega a los catálogos sin que lo apruebes."
            />

            {/* ---------- Paso 1: elegir archivo ---------- */}
            {!archivo && !resultado && (
                <div className="mb-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                    <IconUpload width={32} height={32} className="mx-auto text-slate-400" />
                    <p className="mt-3 font-display text-lg font-bold text-navy-900">Relación de materiales de un equipo</p>
                    <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                        Archivo .xls o .xlsx con columnas Clave, Concepto, Proveedor, Tipo, Cantidad, Unidad y Precio unitario. Cada
                        sección del archivo se toma como un componente.
                    </p>
                    <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => elegirArchivo(e.target.files?.[0])} />
                    <Button className="mt-5" onClick={() => inputRef.current?.click()} disabled={leyendo}>
                        <IconUpload /> {leyendo ? 'Leyendo…' : 'Elegir archivo'}
                    </Button>
                    <ol className="mx-auto mt-6 max-w-2xl space-y-1 text-left text-xs text-slate-500">
                        <li>1. Se lee el archivo y se compara contra los catálogos, sin guardar nada.</li>
                        <li>2. Revisas componentes, materiales, claves repetidas, proveedores y unidades.</li>
                        <li>3. Al aplicar se crea un lote con folio: lo nuevo queda marcado "por validar" y el lote completo se puede deshacer.</li>
                    </ol>
                </div>
            )}

            {/* ---------- Paso 3: resultado ---------- */}
            {resultado && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                    <p className="flex items-center gap-2 font-display text-lg font-bold text-emerald-800">
                        <IconCheck /> Importación {resultado.folio} aplicada
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-emerald-900">
                        {resultado.resumen.map((r) => (
                            <li key={r}>{r}</li>
                        ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Button onClick={() => navigate(`/equipos/${resultado.equipoId}`)}>Ver el BOM del equipo</Button>
                        <Button variant="secondary" onClick={() => navigate('/materiales?porValidar=1')}>
                            Revisar materiales por validar
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setResultado(null)
                                setArchivo(null)
                                setDecisiones({})
                            }}
                        >
                            Importar otro archivo
                        </Button>
                    </div>
                </div>
            )}

            {/* ---------- Paso 2: revisión ---------- */}
            {archivo && !resultado && (
                <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                        <div className="min-w-0">
                            <p className="truncate font-display font-bold text-navy-900">{archivo.archivo}</p>
                            <p className="truncate text-sm text-slate-500">
                                {archivo.equipo.clave} · {archivo.equipo.nombre}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setArchivo(null)
                                setDecisiones({})
                            }}
                        >
                            Cambiar archivo
                        </Button>
                    </div>

                    {analisis.isLoading || !a ? (
                        analisis.isError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{(analisis.error as Error).message}</div>
                        ) : (
                            <Spinner label="Analizando contra los catálogos…" />
                        )
                    ) : (
                        <Revision a={a} decisiones={decisiones} decidir={decidir} tab={tab} setTab={setTab} />
                    )}

                    {/* Barra fija: aplicar */}
                    {a && (
                        <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
                            <div className="text-sm">
                                {!sincronizado ? (
                                    <span className="text-slate-500">Actualizando la revisión…</span>
                                ) : a.bloqueos.length ? (
                                    <span className="font-medium text-red-700">{a.bloqueos.length} pendiente(s) por resolver antes de aplicar</span>
                                ) : (
                                    <span className="text-slate-600">
                                        Listo para aplicar: {a.componentes.filter((c) => c.accion !== 'omitir').length} componentes ·{' '}
                                        {a.materiales.filter((m) => m.accion === 'crear').length} materiales nuevos ·{' '}
                                        {a.proveedores.filter((p) => p.accion === 'crear').length} proveedores nuevos
                                    </span>
                                )}
                            </div>
                            <Button
                                onClick={() => {
                                    if (confirm('¿Aplicar la importación? Lo nuevo quedará "por validar" y podrás deshacer el lote completo mientras nadie lo haya usado.'))
                                        aplicar.mutate()
                                }}
                                disabled={!sincronizado || a.bloqueos.length > 0 || aplicar.isPending}
                            >
                                {aplicar.isPending ? 'Aplicando…' : 'Aplicar importación'}
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* ---------- Historial de lotes ---------- */}
            {!archivo && <HistorialLotes lotes={lotes.data ?? []} cargando={lotes.isLoading} />}
        </div>
    )
}

// =====================================================================================
function Revision({
    a,
    decisiones,
    decidir,
    tab,
    setTab,
}: {
    a: AnalisisBOM
    decisiones: DecisionesBOM
    decidir: (fn: (d: DecisionesBOM) => void) => void
    tab: Tab
    setTab: (t: Tab) => void
}) {
    const nuevosComp = a.componentes.filter((c) => c.accion === 'crear').length
    const TABS: { key: Tab; label: string; n: number; alerta?: boolean }[] = [
        { key: 'componentes', label: 'Componentes', n: a.componentes.length },
        { key: 'materiales', label: 'Materiales', n: a.materiales.length },
        { key: 'conflictos', label: 'Claves repetidas', n: a.conflictos.length, alerta: a.conflictos.length > 0 },
        { key: 'proveedores', label: 'Proveedores', n: a.proveedores.length },
        { key: 'unidades', label: 'Unidades', n: a.unidades.length },
        { key: 'equipo', label: 'Equipo', n: 1, alerta: !!a.equipo.existente && !a.equipo.accion },
    ]
    return (
        <div>
            {/* Resumen */}
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Tarjeta titulo="Componentes" valor={a.componentes.length} detalle={`${nuevosComp} nuevos · ${a.resumen.grupos} grupos del archivo`} />
                <Tarjeta
                    titulo="Materiales"
                    valor={a.materiales.length}
                    detalle={`${a.materiales.filter((m) => m.estado === 'nuevo').length} nuevos · ${a.materiales.filter((m) => m.estado === 'existe').length} ya en catálogo`}
                />
                <Tarjeta
                    titulo="Proveedores"
                    valor={a.proveedores.length}
                    detalle={`${a.proveedores.filter((p) => p.accion === 'crear').length} nuevos · ${a.proveedores.filter((p) => p.existente).length} ya registrados`}
                />
                <Tarjeta titulo="Renglones del archivo" valor={a.resumen.renglones} detalle={`${a.conflictos.length} claves usadas para materiales distintos`} />
            </div>

            {/* Verificación de totales */}
            <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-2">Verificación de totales</th>
                            {a.verificacion.map((v) => (
                                <th key={v.categoria} className="px-4 py-2 text-right">
                                    {v.categoria === 'total' ? 'Total' : v.categoria}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr>
                            <td className="px-4 py-2 text-slate-500">Según el Excel</td>
                            {a.verificacion.map((v) => (
                                <td key={v.categoria} className="px-4 py-2 text-right text-slate-600">
                                    {v.excel === null ? '—' : mxn(v.excel)}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-slate-500">Lo que se importará</td>
                            {a.verificacion.map((v) => {
                                const cuadra = v.excel === null || Math.abs(v.excel - v.importado) <= Math.max(5, v.excel * 0.0005)
                                return (
                                    <td key={v.categoria} className={`px-4 py-2 text-right font-medium ${cuadra ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {mxn(v.importado)} {cuadra ? '✓' : '≠'}
                                    </td>
                                )
                            })}
                        </tr>
                    </tbody>
                </table>
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                    Importes con IVA incluido. Los precios en dólares se comparan convertidos con la paridad del propio Excel; en el
                    sistema se guardan en dólares.
                </p>
            </div>

            {/* Pendientes y avisos */}
            {a.bloqueos.length > 0 && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <p className="mb-1 flex items-center gap-2 font-semibold">
                        <IconAlerta width={16} height={16} /> Por resolver antes de aplicar
                    </p>
                    <ul className="list-disc space-y-0.5 pl-6">
                        {a.bloqueos.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>
            )}
            {a.avisos.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <ul className="list-disc space-y-0.5 pl-6">
                        {a.avisos.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Pestañas */}
            <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200" role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                            tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t.label}
                        <span className={`rounded-full px-2 py-0.5 text-xs ${t.alerta ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.n}</span>
                    </button>
                ))}
            </div>

            {tab === 'componentes' && <TabComponentes a={a} decisiones={decisiones} decidir={decidir} />}
            {tab === 'materiales' && <TabMateriales a={a} decidir={decidir} />}
            {tab === 'conflictos' && <TabConflictos a={a} decidir={decidir} />}
            {tab === 'proveedores' && <TabProveedores a={a} decidir={decidir} />}
            {tab === 'unidades' && <TabUnidades a={a} />}
            {tab === 'equipo' && <TabEquipo a={a} decisiones={decisiones} decidir={decidir} />}
        </div>
    )
}

function Tarjeta({ titulo, valor, detalle }: { titulo: string; valor: number; detalle: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
            <p className="font-display text-2xl font-bold text-navy-900">{valor}</p>
            <p className="text-xs text-slate-500">{detalle}</p>
        </div>
    )
}

function Chips<T extends string>({ valor, opciones, onChange }: { valor: T; opciones: { v: T; t: string; n: number }[]; onChange: (v: T) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {opciones.map((o) => (
                <button
                    key={o.v}
                    onClick={() => onChange(o.v)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        valor === o.v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    {o.t} ({o.n})
                </button>
            ))}
        </div>
    )
}

// ---------- Componentes ----------
function TabComponentes({ a, decisiones, decidir }: { a: AnalisisBOM; decisiones: DecisionesBOM; decidir: (fn: (d: DecisionesBOM) => void) => void }) {
    const [filtro, setFiltro] = useState<'todos' | 'nuevos' | 'existentes' | 'renombrados'>('todos')
    const [abierto, setAbierto] = useState<number | null>(null)
    const lista = a.componentes.filter((c) =>
        filtro === 'nuevos' ? !c.existente : filtro === 'existentes' ? !!c.existente : filtro === 'renombrados' ? c.nombre !== c.nombreArchivo : true
    )
    const { visibles, control } = usePaginacionLocal(lista)
    const setComp = (idx: number, patch: NonNullable<DecisionesBOM['componentes']>[number]) =>
        decidir((d) => {
            d.componentes ??= {}
            d.componentes[idx] = { ...d.componentes[idx], ...patch }
        })

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Chips
                    valor={filtro}
                    onChange={setFiltro}
                    opciones={[
                        { v: 'todos', t: 'Todos', n: a.componentes.length },
                        { v: 'nuevos', t: 'Nuevos', n: a.componentes.filter((c) => !c.existente).length },
                        { v: 'existentes', t: 'Ya existen', n: a.componentes.filter((c) => c.existente).length },
                        { v: 'renombrados', t: 'Renombrados por repetirse', n: a.componentes.filter((c) => c.nombre !== c.nombreArchivo).length },
                    ]}
                />
                <p className="text-xs text-slate-400">Cambia el nombre para unir una sección a un componente que ya existe o para separarla.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-3 py-2">Componente</th>
                                <th className="px-3 py-2 text-center">Mat.</th>
                                <th className="px-3 py-2 text-right">Importe</th>
                                <th className="px-3 py-2">Situación</th>
                                <th className="px-3 py-2">Qué hacer</th>
                                <th className="px-3 py-2">Variación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibles.map((c) => {
                                const varSel = c.existente?.variaciones.find((v) => v.id === c.variacionId)
                                const difiere = c.existente && !c.existente.variaciones.some((v) => v.coincide)
                                return (
                                    <FilaComponente
                                        key={c.idx}
                                        c={c}
                                        nombreLocal={decisiones.componentes?.[c.idx]?.nombre}
                                        nombreVarLocal={decisiones.componentes?.[c.idx]?.nombreVariacion}
                                        abierto={abierto === c.idx}
                                        onAbrir={() => setAbierto(abierto === c.idx ? null : c.idx)}
                                        varSel={varSel?.nombre}
                                        difiere={!!difiere}
                                        setComp={setComp}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <Paginacion {...control} />
            </div>
        </div>
    )
}

function FilaComponente({
    c,
    nombreLocal,
    nombreVarLocal,
    abierto,
    onAbrir,
    difiere,
    setComp,
}: {
    c: AnalisisBOM['componentes'][number]
    nombreLocal?: string
    nombreVarLocal?: string
    abierto: boolean
    onAbrir: () => void
    varSel?: string
    difiere: boolean
    setComp: (idx: number, patch: NonNullable<DecisionesBOM['componentes']>[number]) => void
}) {
    const situacion = !c.existente ? (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Nuevo</span>
    ) : difiere ? (
        <button onClick={onAbrir} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:underline">
            Existe con otros materiales {abierto ? '▲' : '▼'}
        </button>
    ) : (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Existe idéntico</span>
    )
    return (
        <>
            <tr className="align-top">
                <td className="px-3 py-2">
                    <Input
                        value={nombreLocal ?? c.nombre}
                        onChange={(e) => setComp(c.idx, { nombre: e.target.value })}
                        className="min-w-56 py-1.5"
                        aria-label="Nombre del componente"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                        {c.nombre !== c.nombreArchivo && <>En el Excel: {c.nombreArchivo} · </>}
                        {c.grupo ? `Grupo: ${c.grupo}` : 'Sin grupo'}
                        {c.existente?.planeado && ' · se crea antes en este mismo archivo'}
                    </p>
                </td>
                <td className="px-3 py-2 text-center text-slate-600">{c.materiales}</td>
                <td className="px-3 py-2 text-right text-slate-600">{mxn(c.importe)}</td>
                <td className="px-3 py-2">{situacion}</td>
                <td className="px-3 py-2">
                    <Select
                        value={c.accion}
                        onChange={(e) => setComp(c.idx, { accion: e.target.value as typeof c.accion })}
                        className="w-52 py-1.5"
                        aria-label="Qué hacer con la sección"
                    >
                        {!c.existente && <option value="crear">Crear componente</option>}
                        {c.existente && <option value="nuevaVariacion">Agregar variación nueva</option>}
                        {c.existente && <option value="usarVariacion">Usar variación existente</option>}
                        <option value="omitir">No importar esta sección</option>
                    </Select>
                </td>
                <td className="px-3 py-2">
                    {(c.accion === 'crear' || c.accion === 'nuevaVariacion') && (
                        <Input
                            value={nombreVarLocal ?? c.nombreVariacion}
                            onChange={(e) => setComp(c.idx, { nombreVariacion: e.target.value })}
                            className="w-44 py-1.5"
                            aria-label="Nombre de la variación"
                        />
                    )}
                    {c.accion === 'usarVariacion' && c.existente && (
                        <Select value={c.variacionId ?? ''} onChange={(e) => setComp(c.idx, { variacionId: e.target.value })} className="w-44 py-1.5">
                            <option value="">Elige…</option>
                            {c.existente.variaciones.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.nombre} {v.coincide ? '(idéntica)' : ''}
                                </option>
                            ))}
                        </Select>
                    )}
                </td>
            </tr>
            {abierto && c.existente && (
                <tr>
                    <td colSpan={6} className="bg-amber-50/50 px-6 py-3 text-xs text-slate-600">
                        <p className="mb-2 font-semibold text-slate-700">
                            Diferencias contra las variaciones de "{c.existente.concepto}" (por eso se propone una variación nueva):
                        </p>
                        {c.existente.variaciones.map((v) => (
                            <div key={v.id} className="mb-2">
                                <span className="font-medium">{v.nombre}:</span>{' '}
                                {v.diferencias.faltan.length > 0 && <span>falta en la variación: {v.diferencias.faltan.slice(0, 8).join(', ')}{v.diferencias.faltan.length > 8 ? '…' : ''} · </span>}
                                {v.diferencias.sobran.length > 0 && <span>la variación además tiene: {v.diferencias.sobran.slice(0, 8).join(', ')} · </span>}
                                {v.diferencias.cantidad.length > 0 && <span>cantidades distintas: {v.diferencias.cantidad.slice(0, 5).join(', ')}</span>}
                            </div>
                        ))}
                    </td>
                </tr>
            )}
        </>
    )
}

// ---------- Materiales ----------
function TabMateriales({ a, decidir }: { a: AnalisisBOM; decidir: (fn: (d: DecisionesBOM) => void) => void }) {
    type F = 'todos' | 'nuevos' | 'existentes' | 'parecidos' | 'precios' | 'cambioPrecio'
    const [filtro, setFiltro] = useState<F>('todos')
    const [q, setQ] = useState('')
    const qn = q.toLowerCase()
    const lista = useMemo(
        () =>
            a.materiales.filter((m) => {
                const ok =
                    filtro === 'nuevos' ? m.estado === 'nuevo' :
                    filtro === 'existentes' ? m.estado === 'existe' :
                    filtro === 'parecidos' ? m.parecidos.length > 0 :
                    filtro === 'precios' ? m.preciosArchivo.length > 1 :
                    filtro === 'cambioPrecio' ? m.precioDistinto : true
                return ok && (!qn || m.clave.toLowerCase().includes(qn) || m.concepto.toLowerCase().includes(qn) || m.proveedor.toLowerCase().includes(qn))
            }),
        [a.materiales, filtro, qn]
    )
    const { visibles, control } = usePaginacionLocal(lista)
    const setMat = (clave: string, patch: NonNullable<DecisionesBOM['materiales']>[string]) =>
        decidir((d) => {
            d.materiales ??= {}
            d.materiales[clave] = { ...d.materiales[clave], ...patch }
        })

    return (
        <div>
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <Chips
                    valor={filtro}
                    onChange={setFiltro}
                    opciones={[
                        { v: 'todos', t: 'Todos', n: a.materiales.length },
                        { v: 'nuevos', t: 'Nuevos', n: a.materiales.filter((m) => m.estado === 'nuevo').length },
                        { v: 'existentes', t: 'Ya en catálogo', n: a.materiales.filter((m) => m.estado === 'existe').length },
                        { v: 'parecidos', t: 'Parecidos a otro', n: a.materiales.filter((m) => m.parecidos.length).length },
                        { v: 'precios', t: 'Varios precios en el archivo', n: a.materiales.filter((m) => m.preciosArchivo.length > 1).length },
                        { v: 'cambioPrecio', t: 'Precio distinto al catálogo', n: a.materiales.filter((m) => m.precioDistinto).length },
                    ]}
                />
                <div className="lg:w-72">
                    <Buscador value={q} onChange={setQ} placeholder="Buscar clave, concepto o proveedor…" />
                </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-3 py-2">Clave</th>
                                <th className="px-3 py-2">Concepto</th>
                                <th className="px-3 py-2">Prov.</th>
                                <th className="px-3 py-2 text-center">Tipo</th>
                                <th className="px-3 py-2">Unidad</th>
                                <th className="px-3 py-2 text-right">Precio</th>
                                <th className="px-3 py-2 text-center">Usos</th>
                                <th className="px-3 py-2">Qué hacer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibles.map((m) => (
                                <tr key={m.clave} className="align-top">
                                    <td className="px-3 py-2 font-mono text-xs font-semibold text-brand-700">
                                        {m.clave}
                                        {m.clave !== m.claveArchivo && <div className="font-sans text-[10px] font-normal text-amber-600">en Excel: {m.claveArchivo}</div>}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">
                                        {m.concepto}
                                        {m.conceptoDistinto && m.existente && (
                                            <div className="text-[11px] text-amber-600">En catálogo: {m.existente.concepto}</div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-500">{m.proveedor}</td>
                                    <td className="px-3 py-2 text-center text-xs">{m.tipo}</td>
                                    <td className="px-3 py-2 text-xs text-slate-500">{m.unidad}</td>
                                    <td className="px-3 py-2 text-right text-xs text-slate-700">
                                        {m.dolares > 0 && m.pesos === 0 ? usd(m.dolares) : mxn(m.pesos)}
                                        {m.preciosArchivo.length > 1 && (
                                            <div className="text-[10px] text-amber-600" title={m.preciosArchivo.map((p) => mxn(p)).join(' / ')}>
                                                {m.preciosArchivo.length} precios en el archivo
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center text-xs text-slate-500">{m.usos}</td>
                                    <td className="px-3 py-2 text-xs">
                                        {m.estado === 'existe' ? (
                                            <div>
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Ya en catálogo</span>
                                                {m.precioDistinto && m.existente && (
                                                    <label className="mt-1 flex items-center gap-1.5 text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={m.actualizarPrecio}
                                                            onChange={(e) => setMat(m.clave, { actualizarPrecio: e.target.checked })}
                                                        />
                                                        Actualizar precio (hoy {mxn(m.existente.costoUnitario)})
                                                    </label>
                                                )}
                                            </div>
                                        ) : m.parecidos.length > 0 ? (
                                            <Select
                                                value={m.accion === 'vincular' ? m.vinculadoA : ''}
                                                onChange={(e) => setMat(m.clave, e.target.value ? { accion: 'vincular', id: e.target.value } : { accion: 'crear', id: undefined })}
                                                className="w-56 py-1 text-xs"
                                            >
                                                <option value="">Crear como nuevo</option>
                                                {m.parecidos.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        Es el mismo que {p.clave} · {p.concepto.slice(0, 30)} ({Math.round(p.similitud * 100)}%)
                                                    </option>
                                                ))}
                                            </Select>
                                        ) : (
                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">Nuevo (por validar)</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {lista.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Sin materiales en este filtro.</p>}
                <Paginacion {...control} />
            </div>
        </div>
    )
}

// ---------- Claves repetidas ----------
function TabConflictos({ a, decidir }: { a: AnalisisBOM; decidir: (fn: (d: DecisionesBOM) => void) => void }) {
    if (!a.conflictos.length) return <EmptyState titulo="Sin claves repetidas" descripcion="Cada clave del archivo corresponde a un solo material." />
    return (
        <div>
            <p className="mb-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                En el archivo, estas claves se usan para materiales con <strong>conceptos distintos</strong>. Por defecto se{' '}
                <strong>separan</strong>: el primero conserva la clave y los demás reciben la misma clave con sufijo (ej. A13039-2), para no
                mezclar materiales diferentes. Si en realidad son el mismo material escrito distinto, elige <strong>unificar</strong>.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
                {a.conflictos.map((c) => (
                    <div key={c.clave} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-brand-700">{c.clave}</span>
                            <div className="flex gap-1">
                                {(['separar', 'unificar'] as const).map((op) => (
                                    <button
                                        key={op}
                                        onClick={() =>
                                            decidir((d) => {
                                                d.conflictos ??= {}
                                                d.conflictos[c.clave] = op
                                            })
                                        }
                                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                            c.decision === op ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {op === 'separar' ? 'Separar' : 'Unificar'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ul className="space-y-1 text-sm">
                            {c.variantes.map((v, i) => (
                                <li key={i} className="flex justify-between gap-3 text-slate-700">
                                    <span>
                                        {c.decision === 'separar' && (
                                            <span className="mr-1.5 font-mono text-xs text-slate-400">{i === 0 ? c.clave : `${c.clave}-${i + 1}`}</span>
                                        )}
                                        {v.concepto}
                                    </span>
                                    <span className="whitespace-nowrap text-xs text-slate-400">
                                        {v.usos} uso(s) · {v.precios.map((p) => mxn(p)).join(' / ')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {c.decision === 'unificar' && (
                            <p className="mt-2 text-xs text-amber-700">Se creará un solo material: "{c.variantes[0].concepto}".</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------- Proveedores ----------
function TabProveedores({ a, decidir }: { a: AnalisisBOM; decidir: (fn: (d: DecisionesBOM) => void) => void }) {
    const provs = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
    const opciones = opcionesProveedor((provs.data ?? []).filter((p) => !p.porValidar))
    const { visibles, control } = usePaginacionLocal(a.proveedores)
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                Se buscan por código. Los nuevos se crean "por validar" con sus datos fiscales por completar; si un código es otra forma de escribir
                un proveedor que ya tienes, vincúlalo.
            </p>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2">Código en el Excel</th>
                        <th className="px-4 py-2 text-center">Renglones</th>
                        <th className="px-4 py-2">Qué hacer</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {visibles.map((p) => (
                        <tr key={p.codigo}>
                            <td className="px-4 py-2 font-mono font-semibold text-navy-900">{p.codigo}</td>
                            <td className="px-4 py-2 text-center text-slate-500">{p.usos}</td>
                            <td className="px-4 py-2">
                                {p.existente ? (
                                    <span className="text-xs text-emerald-700">
                                        Ya registrado: {p.existente.codigo} · {p.existente.razonSocial}
                                    </span>
                                ) : (
                                    <div className="w-96 max-w-full">
                                        <SelectBuscable
                                            value={p.accion === 'vincular' ? p.id ?? '' : ''}
                                            onChange={(v) =>
                                                decidir((d) => {
                                                    d.proveedores ??= {}
                                                    d.proveedores[p.codigo] = v ? { accion: 'vincular', id: v } : { accion: 'crear' }
                                                })
                                            }
                                            vacio="Crear como proveedor nuevo (por validar)"
                                            opciones={opciones}
                                            aria-label={`Proveedor ${p.codigo}`}
                                        />
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Paginacion {...control} />
        </div>
    )
}

// ---------- Unidades ----------
function TabUnidades({ a }: { a: AnalisisBOM }) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2">En el Excel</th>
                        <th className="px-4 py-2">Se guardará como</th>
                        <th className="px-4 py-2 text-center">Renglones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {a.unidades.map((u) => (
                        <tr key={u.archivo}>
                            <td className="px-4 py-2 font-mono text-slate-600">{u.archivo}</td>
                            <td className="px-4 py-2 text-slate-800">
                                {u.catalogo}{' '}
                                {u.nueva && <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">nueva: se agregará al catálogo</span>}
                            </td>
                            <td className="px-4 py-2 text-center text-slate-500">{u.usos}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ---------- Equipo ----------
function TabEquipo({ a, decisiones, decidir }: { a: AnalisisBOM; decisiones: DecisionesBOM; decidir: (fn: (d: DecisionesBOM) => void) => void }) {
    const set = (patch: NonNullable<DecisionesBOM['equipo']>) =>
        decidir((d) => {
            d.equipo = { ...d.equipo, ...patch }
        })
    return (
        <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                    Nombre del equipo
                    <Input value={decisiones.equipo?.nombre ?? a.equipo.nombre} onChange={(e) => set({ nombre: e.target.value })} className="mt-1" />
                    <span className="mt-1 block text-xs font-normal text-slate-400">Por defecto, la clave del Excel ({a.equipo.clave}).</span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                    Descripción
                    <Input value={decisiones.equipo?.descripcion ?? a.equipo.descripcion} onChange={(e) => set({ descripcion: e.target.value })} className="mt-1" />
                </label>
            </div>
            {a.equipo.existente && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p>
                        Ya existe un equipo llamado <strong>{a.equipo.existente.nombre}</strong> con {a.equipo.existente.lineas} línea(s) en su
                        composición.
                    </p>
                    <label className="mt-2 flex items-center gap-2">
                        <input type="checkbox" checked={a.equipo.accion === 'reemplazar'} onChange={(e) => set({ accion: e.target.checked ? 'reemplazar' : 'crear' })} />
                        Reemplazar su composición con la de este archivo (se puede deshacer con el lote)
                    </label>
                    <p className="mt-1 text-xs">O cambia el nombre para crearlo como un equipo distinto.</p>
                </div>
            )}
        </div>
    )
}

// ---------- Historial de lotes ----------
function HistorialLotes({ lotes, cargando }: { lotes: LoteImportacion[]; cargando: boolean }) {
    const queryClient = useQueryClient()
    const { puede } = useAuth()
    const puedeDeshacer = puede('equipos', 'eliminar')
    const deshacer = useMutation({
        mutationFn: async (l: LoteImportacion) => {
            const { bloqueos } = await revisarDeshacer(l._id)
            if (bloqueos.length) throw new ErrorImportacion('No se puede deshacer', bloqueos)
            if (!confirm(`¿Deshacer la importación ${l.folio}? Se quitará todo lo que creó y se restaurará lo que modificó.`)) return null
            return deshacerLote(l._id)
        },
        onSuccess: (r) => {
            if (!r) return
            toast.success(r.mensaje)
            for (const k of ['lotesImportacion', 'equipos', 'componentes', 'materiales', 'proveedores', 'historial']) queryClient.invalidateQueries({ queryKey: [k] })
        },
        onError: (e: ErrorImportacion) => toast.error(e.bloqueos?.length ? `${e.message}: ${e.bloqueos.join(' · ')}` : e.message),
    })
    const ESTADO: Record<LoteImportacion['estado'], string> = {
        aplicado: 'bg-emerald-50 text-emerald-700',
        deshecho: 'bg-slate-100 text-slate-500',
        fallido: 'bg-red-50 text-red-700',
        aplicando: 'bg-amber-50 text-amber-700',
    }
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-200 px-5 py-3 font-display text-lg font-bold text-navy-900">Importaciones anteriores</h2>
            {cargando ? (
                <Spinner />
            ) : lotes.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">Aún no hay importaciones.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-2">Folio</th>
                                <th className="px-4 py-2">Equipo / archivo</th>
                                <th className="px-4 py-2">Por</th>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2 text-center">Estado</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lotes.map((l) => (
                                <tr key={l._id} title={l.resumen.join('\n')}>
                                    <td className="px-4 py-2 font-mono font-semibold text-brand-700">{l.folio}</td>
                                    <td className="px-4 py-2">
                                        <div className="font-medium text-navy-900">{l.equipoNombre}</div>
                                        <div className="text-xs text-slate-400">{l.archivo}</div>
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">{l.usuario}</td>
                                    <td className="px-4 py-2 text-slate-500">{fecha(l.createdAt)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO[l.estado]}`}>{l.estado}</span>
                                        {l.estado === 'deshecho' && l.deshechoPor && <div className="text-[10px] text-slate-400">por {l.deshechoPor}</div>}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {puedeDeshacer && l.estado === 'aplicado' && (
                                            <Button variant="ghost" onClick={() => deshacer.mutate(l)} disabled={deshacer.isPending}>
                                                Deshacer
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
