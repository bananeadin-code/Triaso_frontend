import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { getConfiguracion, actualizarConfiguracion } from '../api/ConfiguracionAPI'
import { Button, CategoriaBadge, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { IconPlus, IconTrash } from '../components/icons'
import { MODULOS_CAMPOS } from '../components/CamposPersonalizados'
import type { CampoDef, Categoria, EmpresaDatos, ModuloCampos, TipoCampo } from '../types'

const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

type Seccion = 'cambio' | 'categorias' | 'empresa' | 'campos' | 'unidades' | 'folios'
const SECCIONES: { key: Seccion; label: string }[] = [
    { key: 'empresa', label: 'Datos de la empresa' },
    { key: 'cambio', label: 'Tipo de cambio' },
    { key: 'categorias', label: 'Categorías y claves' },
    { key: 'unidades', label: 'Unidades' },
    { key: 'folios', label: 'Folios' },
    { key: 'campos', label: 'Campos personalizados' },
]

const EMPRESA_VACIA: EmpresaDatos = { razonSocial: '', rfc: '', direccion: '', telefono: '' }
const TIPOS_CAMPO: { v: TipoCampo; t: string }[] = [
    { v: 'texto', t: 'Texto' },
    { v: 'numero', t: 'Número' },
    { v: 'lista', t: 'Lista de opciones' },
    { v: 'siNo', t: 'Sí / No' },
    { v: 'fecha', t: 'Fecha' },
]

// Opciones de un campo tipo lista, separadas por coma. Guarda el TEXTO tal cual se escribe
// (si se derivara de la lista ya limpia, la coma o el espacio recién tecleados desaparecerían
// y no se podría escribir una segunda opción) y entrega al padre la lista ya limpia.
function OpcionesInput({ opciones, onChange }: { opciones: string[]; onChange: (o: string[]) => void }) {
    const [texto, setTexto] = useState(opciones.join(', '))
    const limpias = texto.split(',').map((o) => o.trim()).filter(Boolean)
    return (
        <div>
            <Input
                value={texto}
                placeholder="Opción A, Opción B, Opción C"
                onChange={(e) => {
                    setTexto(e.target.value)
                    onChange(e.target.value.split(',').map((o) => o.trim()).filter(Boolean))
                }}
            />
            {limpias.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {limpias.map((o, i) => (
                        <span key={`${o}-${i}`} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {o}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// Fila editable de categoría (id vacío = categoría nueva aún sin guardar)
type FilaCat = Categoria & { _nueva?: boolean }

export function ConfiguracionView() {
    const queryClient = useQueryClient()
    const { data, isLoading } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion })
    const [seccion, setSeccion] = useState<Seccion>('empresa')
    const [tipoCambio, setTipoCambio] = useState('')
    const [cats, setCats] = useState<FilaCat[]>([])
    const [empresa, setEmpresa] = useState<EmpresaDatos>(EMPRESA_VACIA)
    // Campos personalizados: definiciones de cada módulo + el módulo que se está editando
    const [camposPorModulo, setCamposPorModulo] = useState<Partial<Record<ModuloCampos, CampoDef[]>>>({})
    const [moduloCampos, setModuloCampos] = useState<ModuloCampos>('materiales')
    const campos = camposPorModulo[moduloCampos] ?? []
    const setCampos = (fn: (cs: CampoDef[]) => CampoDef[]) =>
        setCamposPorModulo((m) => ({ ...m, [moduloCampos]: fn(m[moduloCampos] ?? []) }))
    const [unidades, setUnidades] = useState<string[]>([])
    const [folios, setFolios] = useState({ orden: 'OC', cotizacion: 'COT' })
    const [banxicoToken, setBanxicoToken] = useState('')

    useEffect(() => {
        if (data) {
            setTipoCambio(String(data.tipoCambio ?? 0))
            setCats(data.categorias ?? [])
            setEmpresa({ ...EMPRESA_VACIA, ...(data.empresa ?? {}) })
            setCamposPorModulo(data.campos ?? {})
            setUnidades(data.unidades ?? [])
            setFolios(data.folios ?? { orden: 'OC', cotizacion: 'COT' })
        }
    }, [data])

    const invalidar = () => {
        queryClient.invalidateQueries({ queryKey: ['configuracion'] })
        queryClient.invalidateQueries({ queryKey: ['categorias'] })
    }

    const guardarTC = useMutation({
        mutationFn: () => actualizarConfiguracion({ tipoCambio: Number(tipoCambio) }),
        onSuccess: () => {
            toast.success('Tipo de cambio actualizado')
            invalidar()
            queryClient.invalidateQueries({ queryKey: ['paridad'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarToken = useMutation({
        mutationFn: () => actualizarConfiguracion({ banxicoToken }),
        onSuccess: () => {
            toast.success('Token de Banxico guardado')
            setBanxicoToken('')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarCats = useMutation({
        mutationFn: () => actualizarConfiguracion({ categorias: cats.map((c) => ({ id: c.id, nombre: c.nombre, prefijo: c.prefijo })) }),
        onSuccess: () => {
            toast.success('Categorías actualizadas')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarEmpresa = useMutation({
        mutationFn: () => actualizarConfiguracion({ empresa }),
        onSuccess: () => {
            toast.success('Datos de la empresa actualizados')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarCampos = useMutation({
        mutationFn: () => actualizarConfiguracion({ campos: { modulo: moduloCampos, lista: campos } }),
        onSuccess: () => {
            toast.success(`Campos de ${MODULOS_CAMPOS.find((m) => m.key === moduloCampos)?.label} actualizados`)
            invalidar()
            // Refresca el formulario y la tabla del módulo
            queryClient.invalidateQueries({ queryKey: ['campos', moduloCampos] })
            queryClient.invalidateQueries({ queryKey: [moduloCampos] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarUnidades = useMutation({
        mutationFn: () => actualizarConfiguracion({ unidades: unidades.map((u) => u.trim()).filter(Boolean) }),
        onSuccess: () => {
            toast.success('Unidades actualizadas')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarFolios = useMutation({
        mutationFn: () => actualizarConfiguracion({ folios }),
        onSuccess: () => {
            toast.success('Folios actualizados')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading) return <Spinner label="Cargando configuración…" />

    const tc = Number(tipoCambio) || 0
    const setCat = (i: number, patch: Partial<FilaCat>) =>
        setCats((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
    const agregarCat = () => setCats((cs) => [...cs, { id: '', nombre: '', prefijo: '', _nueva: true }])
    const quitarCat = (i: number) => {
        const c = cats[i]
        // Confirmar solo al quitar una categoría YA existente (las nuevas sin guardar se quitan directo)
        if (c.id && !confirm(`¿Quitar la categoría "${c.nombre || c.id}"? Se aplicará al presionar "Guardar categorías". El sistema no permitirá borrarla si está en uso.`))
            return
        setCats((cs) => cs.filter((_, idx) => idx !== i))
    }

    const setCampo = (i: number, patch: Partial<CampoDef>) =>
        setCampos((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
    const agregarCampo = () => setCampos((cs) => [...cs, { id: '', nombre: '', tipo: 'texto', opciones: [], activo: true }])
    const quitarCampo = (i: number) => {
        const c = campos[i]
        if (c.id && !confirm(`¿Quitar el campo "${c.nombre || 'sin nombre'}"? Los valores ya capturados dejarán de mostrarse (aplica al guardar).`))
            return
        setCampos((cs) => cs.filter((_, idx) => idx !== i))
    }

    const setUnidad = (i: number, v: string) => setUnidades((us) => us.map((u, idx) => (idx === i ? v : u)))
    const agregarUnidad = () => setUnidades((us) => [...us, ''])
    const quitarUnidad = (i: number) => setUnidades((us) => us.filter((_, idx) => idx !== i))

    return (
        <div>
            <PageHeader titulo="Configuración" descripcion="Parámetros globales de la empresa" />

            {/* Pestañas internas (secciones compactas, sin scroll largo) */}
            <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
                {SECCIONES.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setSeccion(s.key)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                            seccion === s.key
                                ? 'border-brand-600 text-brand-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ---- Datos de la empresa ---- */}
            {seccion === 'empresa' && (
                <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy-900">Datos de la empresa</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Estos datos salen en el <strong>encabezado de todos los PDF</strong> que genera el sistema
                        (reportes y tickets de órdenes). Déjalos vacíos si no quieres mostrarlos.
                    </p>

                    <div className="mt-4 space-y-4">
                        <Field label="Razón social">
                            <Input
                                value={empresa.razonSocial}
                                placeholder="Triaso s.a. de c.v."
                                onChange={(e) => setEmpresa((s) => ({ ...s, razonSocial: e.target.value }))}
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="RFC">
                                <Input
                                    value={empresa.rfc}
                                    placeholder="XAXX010101000"
                                    onChange={(e) => setEmpresa((s) => ({ ...s, rfc: e.target.value.toUpperCase() }))}
                                />
                            </Field>
                            <Field label="Teléfono">
                                <Input
                                    value={empresa.telefono}
                                    placeholder="(618) 000 0000"
                                    onChange={(e) => setEmpresa((s) => ({ ...s, telefono: e.target.value }))}
                                />
                            </Field>
                        </div>
                        <Field label="Dirección">
                            <Input
                                value={empresa.direccion}
                                placeholder="Calle, colonia, ciudad, estado"
                                onChange={(e) => setEmpresa((s) => ({ ...s, direccion: e.target.value }))}
                            />
                        </Field>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button onClick={() => guardarEmpresa.mutate()} disabled={guardarEmpresa.isPending}>
                            {guardarEmpresa.isPending ? 'Guardando…' : 'Guardar datos'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ---- Tipo de cambio ---- */}
            {seccion === 'cambio' && (
                <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy-900">Tipo de cambio</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Cuántos pesos (MXN) equivalen a 1 dólar (USD). Es un valor <strong>referencial</strong> que se usa
                        solo para consolidar el total de una cotización cuando mezcla materiales en pesos y en dólares. No
                        modifica ningún costo del catálogo; cada material conserva su moneda.
                    </p>

                    <div className="mt-4 max-w-xs">
                        <Field label="MXN por 1 USD">
                            <Input type="number" step="0.01" min="0" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} />
                        </Field>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                        Ejemplo: con {money(tc)} por dólar, un material de US$100 equivale a {money(tc * 100)}.
                    </p>

                    <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                        <Button onClick={() => guardarTC.mutate()} disabled={guardarTC.isPending || tc < 0}>
                            {guardarTC.isPending ? 'Guardando…' : 'Guardar'}
                        </Button>
                        <span className="text-xs text-slate-400">
                            El histórico de valores está en el módulo <strong>Paridad</strong>.
                        </span>
                    </div>

                    {/* Token de Banxico para el tipo de cambio automático */}
                    <div className="mt-6 border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-semibold text-navy-900">Token de Banxico (tipo de cambio automático)</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Con un token gratuito de Banxico, el módulo Paridad puede traer el valor oficial del día.{' '}
                            {data?.banxicoConfigurado ? (
                                <span className="font-medium text-emerald-700">Ya hay un token configurado.</span>
                            ) : (
                                <span className="font-medium text-amber-700">Aún no hay token configurado.</span>
                            )}
                        </p>
                        <div className="mt-2 flex max-w-md items-center gap-2">
                            <Input
                                type="password"
                                placeholder={data?.banxicoConfigurado ? '•••••• (reemplazar)' : 'Pega aquí el token'}
                                value={banxicoToken}
                                onChange={(e) => setBanxicoToken(e.target.value)}
                            />
                            <Button
                                variant="secondary"
                                onClick={() => guardarToken.mutate()}
                                disabled={guardarToken.isPending || !banxicoToken.trim()}
                            >
                                {guardarToken.isPending ? '…' : 'Guardar token'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Categorías y claves ---- */}
            {seccion === 'categorias' && (
                <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy-900">Categorías y claves</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Las categorías del sistema. Puedes cambiar su <strong>nombre</strong>, su{' '}
                        <strong>prefijo de clave</strong> (las 1–4 letras con que arranca la clave, ej.{' '}
                        <span className="font-mono">EL</span> → <span className="font-mono">EL0001</span>), y{' '}
                        <strong>agregar o quitar</strong> categorías según lo que Triaso maneje.
                    </p>

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-2 text-center">Cat.</th>
                                    <th className="px-3 py-2">Nombre</th>
                                    <th className="px-3 py-2">Prefijo</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cats.map((c, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-center">
                                                {c.id ? (
                                                    <CategoriaBadge id={c.id} />
                                                ) : (
                                                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                        nueva
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input value={c.nombre} placeholder="Nombre de la categoría" onChange={(e) => setCat(i, { nombre: e.target.value })} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={c.prefijo}
                                                onChange={(e) => setCat(i, { prefijo: e.target.value.toUpperCase().slice(0, 4) })}
                                                maxLength={4}
                                                placeholder="EL"
                                                className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                onClick={() => quitarCat(i)}
                                                disabled={cats.length <= 1}
                                                title={cats.length <= 1 ? 'Debe quedar al menos una categoría' : 'Quitar categoría'}
                                                className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
                                            >
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={agregarCat}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                        <IconPlus width={16} height={16} /> Agregar categoría
                    </button>

                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Cambiar un prefijo solo afecta las claves <strong>nuevas</strong> (los materiales ya registrados
                        conservan la suya). Una categoría <strong>no se puede eliminar si está en uso</strong> por
                        materiales o componentes.
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button onClick={() => guardarCats.mutate()} disabled={guardarCats.isPending}>
                            {guardarCats.isPending ? 'Guardando…' : 'Guardar categorías'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ---- Unidades de medida ---- */}
            {seccion === 'unidades' && (
                <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy-900">Unidades de medida</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        El catálogo de unidades que aparece al asignar materiales a un componente (Pieza, Metro, Kg…).
                        Evita que cada quien escriba la unidad distinta.
                    </p>

                    <div className="mt-4 space-y-2">
                        {unidades.map((u, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Input value={u} placeholder="Nombre de la unidad" onChange={(e) => setUnidad(i, e.target.value)} />
                                <button
                                    onClick={() => quitarUnidad(i)}
                                    disabled={unidades.length <= 1}
                                    title={unidades.length <= 1 ? 'Debe quedar al menos una' : 'Quitar'}
                                    className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                >
                                    <IconTrash />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={agregarUnidad}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                        <IconPlus width={16} height={16} /> Agregar unidad
                    </button>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button onClick={() => guardarUnidades.mutate()} disabled={guardarUnidades.isPending}>
                            {guardarUnidades.isPending ? 'Guardando…' : 'Guardar unidades'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ---- Folios ---- */}
            {seccion === 'folios' && (
                <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy-900">Numeración de folios</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        El prefijo con que se numeran las órdenes de compra y las cotizaciones (ej.{' '}
                        <span className="font-mono">OC</span> → <span className="font-mono">OC0001</span>).
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <Field label="Órdenes de compra">
                            <input
                                value={folios.orden}
                                maxLength={6}
                                onChange={(e) => setFolios((f) => ({ ...f, orden: e.target.value.toUpperCase().slice(0, 6) }))}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            />
                        </Field>
                        <Field label="Cotizaciones">
                            <input
                                value={folios.cotizacion}
                                maxLength={6}
                                onChange={(e) => setFolios((f) => ({ ...f, cotizacion: e.target.value.toUpperCase().slice(0, 6) }))}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            />
                        </Field>
                    </div>

                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Cambiar un prefijo solo afecta los folios <strong>nuevos</strong>; los ya emitidos conservan el
                        suyo y la numeración del prefijo nuevo arranca en 0001.
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button onClick={() => guardarFolios.mutate()} disabled={guardarFolios.isPending}>
                            {guardarFolios.isPending ? 'Guardando…' : 'Guardar folios'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ---- Campos personalizados (por módulo) ---- */}
            {seccion === 'campos' && (
                <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy-900">Campos personalizados</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Datos <strong>extra e informativos</strong> que quieras capturar en cada catálogo. Aparecen en su
                        formulario y en su tabla. <strong>No afectan costeo, BOM, inventario ni ninguna lógica</strong> del
                        sistema.
                    </p>

                    {/* Selector de módulo */}
                    <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Módulo">
                        {MODULOS_CAMPOS.map((m) => {
                            const n = (camposPorModulo[m.key] ?? []).length
                            const activo = m.key === moduloCampos
                            return (
                                <button
                                    key={m.key}
                                    role="tab"
                                    aria-selected={activo}
                                    onClick={() => setModuloCampos(m.key)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                        activo
                                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {m.label}
                                    {n > 0 && (
                                        <span className={`rounded-full px-1.5 text-xs ${activo ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {n}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                        Ideas para {MODULOS_CAMPOS.find((m) => m.key === moduloCampos)?.label.toLowerCase()}:{' '}
                        {MODULOS_CAMPOS.find((m) => m.key === moduloCampos)?.ejemplo}.
                    </p>

                    <div className="mt-4 space-y-3">
                        {campos.length === 0 && (
                            <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">
                                Aún no hay campos personalizados. Agrega el primero.
                            </p>
                        )}
                        {campos.map((c, i) => (
                            <div key={`${moduloCampos}-${c.id || 'nuevo'}-${i}`} className="rounded-lg border border-slate-200 p-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="min-w-[10rem] flex-1">
                                        <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
                                        <Input value={c.nombre} placeholder="Ej. Norma / Aleación" onChange={(e) => setCampo(i, { nombre: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
                                        <Select value={c.tipo} onChange={(e) => setCampo(i, { tipo: e.target.value as TipoCampo })} className="w-44">
                                            {TIPOS_CAMPO.map((t) => (
                                                <option key={t.v} value={t.v}>
                                                    {t.t}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
                                        <input type="checkbox" checked={c.activo} onChange={(e) => setCampo(i, { activo: e.target.checked })} className="rounded" />
                                        Activo
                                    </label>
                                    <button
                                        onClick={() => quitarCampo(i)}
                                        title="Quitar campo"
                                        className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                        <IconTrash />
                                    </button>
                                </div>
                                {c.tipo === 'lista' && (
                                    <div className="mt-3">
                                        <label className="mb-1 block text-xs font-medium text-slate-600">
                                            Opciones (separadas por coma)
                                        </label>
                                        <OpcionesInput opciones={c.opciones} onChange={(opciones) => setCampo(i, { opciones })} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={agregarCampo}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                        <IconPlus width={16} height={16} /> Agregar campo
                    </button>

                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Marca un campo como <strong>inactivo</strong> para ocultarlo: su definición y los valores ya
                        capturados se conservan y reaparecen al reactivarlo. Quitarlo con la papelera lo elimina de la
                        lista. Cada módulo se guarda por separado.
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button onClick={() => guardarCampos.mutate()} disabled={guardarCampos.isPending}>
                            {guardarCampos.isPending
                                ? 'Guardando…'
                                : `Guardar campos de ${MODULOS_CAMPOS.find((m) => m.key === moduloCampos)?.label}`}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
