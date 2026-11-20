import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { crearEquipo, eliminarEquipo, getEquipo, getEquipos } from '../api/EquiposAPI'
import { crearCotizacion } from '../api/CotizacionesAPI'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, EmptyState, Field, Input, PageHeader, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { Paginacion, usePaginacionLocal } from '../components/Paginacion'
import { BadgePorValidar, BotonValidar, FiltroPorValidar, usePorValidar } from '../components/PorValidar'
import { CamposPersonalizadosForm, TdCampos, ThCampos, useCamposModulo } from '../components/CamposPersonalizados'
import { IconCotizacion, IconEye, IconPlus, IconTrash, IconUpload } from '../components/icons'
import type { EquipoListItem, LineaInput } from '../types'

export function EquiposView() {
    const { puede } = useAuth()
    const puedeCrear = puede('equipos', 'crear')
    const puedeEliminar = puede('equipos', 'eliminar')
    const puedeCotizar = puede('cotizaciones', 'crear')
    // Importar un BOM crea registros en cuatro catálogos
    const puedeImportar = (['equipos', 'componentes', 'materiales', 'proveedores'] as const).every((m) => puede(m, 'crear'))
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [modalAbierto, setModalAbierto] = useState(false)
    const [cotizando, setCotizando] = useState<EquipoListItem | null>(null)
    const [busqueda, setBusqueda] = useState('')

    const { data, isLoading } = useQuery({ queryKey: ['equipos'], queryFn: getEquipos })
    const { campos: camposActivos } = useCamposModulo('equipos')

    const eliminar = useMutation({
        mutationFn: eliminarEquipo,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['equipos'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const pv = usePorValidar('equipos', data ?? [])
    const puedeValidar = puede('equipos', 'editar')
    const equipos = pv.filtrar(data ?? []).filter((e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    const { visibles, control } = usePaginacionLocal(equipos)
    if (isLoading) return <Spinner label="Cargando equipos…" />

    return (
        <div>
            <PageHeader
                titulo="Equipos (BOM)"
                descripcion="Equipos finales, su lista de materiales y cotización por categoría"
                accion={
                    puedeCrear && (
                        <div className="flex flex-wrap gap-2">
                            {puedeImportar && (
                                <Button variant="secondary" onClick={() => navigate('/equipos/importar')}>
                                    <IconUpload /> Importar BOM (Excel)
                                </Button>
                            )}
                            <Button onClick={() => setModalAbierto(true)}>
                                <IconPlus /> Nuevo equipo
                            </Button>
                        </div>
                    )
                }
            />

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar equipo por nombre…" />
                <FiltroPorValidar
                    pendientes={pv.pendientes}
                    solo={pv.solo}
                    onSolo={pv.setSolo}
                    mostrados={equipos.length}
                    onValidarTodos={() => pv.validar.mutate(equipos.filter((e) => e.porValidar).map((e) => e._id))}
                    puedeValidar={puedeValidar}
                    validando={pv.validar.isPending}
                />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {equipos.length === 0 ? (
                    <EmptyState titulo="Sin equipos" descripcion="No hay equipos que coincidan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3 text-center">Líneas BOM</th>
                                    <ThCampos campos={camposActivos} />
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((e) => (
                                    <tr
                                        key={e._id}
                                        className="cursor-pointer transition-colors hover:bg-slate-50"
                                        onClick={() => navigate(`/equipos/${e._id}`)}
                                    >
                                        <td className="px-4 py-3 font-semibold text-navy-900">
                                            {e.nombre}
                                            {e.porValidar && <BadgePorValidar />}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{e.tipo || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">{e.descripcion || '—'}</td>
                                        <td className="px-4 py-3 text-center text-slate-600">{e.totalLineas}</td>
                                        <TdCampos campos={camposActivos} valores={e.personalizados} className="px-4 py-3 text-slate-500" />
                                        <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/equipos/${e._id}`)}
                                                    className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                    title="Abrir BOM"
                                                >
                                                    <IconEye />
                                                </button>
                                                {puedeCotizar && (
                                                    <button
                                                        onClick={() => setCotizando(e)}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                                        title="Cotizar"
                                                    >
                                                        <IconCotizacion />
                                                    </button>
                                                )}
                                                {puedeValidar && e.porValidar && (
                                                    <BotonValidar onClick={() => pv.validar.mutate([e._id])} disabled={pv.validar.isPending} />
                                                )}
                                                {puedeEliminar && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Eliminar el equipo "${e.nombre}"?`))
                                                                eliminar.mutate(e._id)
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

            {modalAbierto && (
                <NuevoEquipoModal
                    onClose={() => setModalAbierto(false)}
                    onCreado={(id) => {
                        setModalAbierto(false)
                        queryClient.invalidateQueries({ queryKey: ['equipos'] })
                        navigate(`/equipos/${id}`)
                    }}
                />
            )}

            {cotizando && (
                <CotizarModal
                    equipo={cotizando}
                    onClose={() => setCotizando(null)}
                    onCreada={(id) => {
                        setCotizando(null)
                        navigate(`/cotizaciones/${id}`)
                    }}
                />
            )}
        </div>
    )
}

// ---------- Modal: cotizar (creación / reparación) ----------
function CotizarModal({
    equipo,
    onClose,
    onCreada,
}: {
    equipo: EquipoListItem
    onClose: () => void
    onCreada: (id: string) => void
}) {
    const [contexto, setContexto] = useState<'creacion' | 'reparacion' | null>(null)
    const [seleccion, setSeleccion] = useState<string[]>([]) // lineaIds a reparar
    const [creando, setCreando] = useState(false)

    // Para reparación necesitamos las líneas del equipo
    const bom = useQuery({ queryKey: ['equipo', equipo._id], queryFn: () => getEquipo(equipo._id), enabled: contexto === 'reparacion' })

    const crear = async (ctx: 'creacion' | 'reparacion', lineas?: LineaInput[]) => {
        setCreando(true)
        try {
            const res = await crearCotizacion({ equipo: equipo._id, contexto: ctx, lineas })
            toast.success(`${res.mensaje} · ${res.folio}`)
            onCreada(res.id)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error')
        } finally {
            setCreando(false)
        }
    }

    const confirmarReparacion = () => {
        const lineas: LineaInput[] = (bom.data?.lineas ?? [])
            .filter((l) => seleccion.includes(l.lineaId))
            .map((l) => ({ componente: l.componenteId, variacion: l.variacionId, cantidad: l.cantidad }))
        if (lineas.length === 0) return toast.error('Selecciona al menos un componente a reparar')
        crear('reparacion', lineas)
    }

    return (
        <Modal open onClose={onClose} titulo={`Cotizar — ${equipo.nombre}`} ancho="max-w-lg">
            {contexto === null && (
                <div>
                    <p className="mb-4 text-sm text-slate-600">¿Qué tipo de cotización quieres generar?</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => crear('creacion')}
                            disabled={creando}
                            className="rounded-xl border-2 border-slate-200 p-5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
                        >
                            <p className="font-display font-bold text-navy-900">Creación</p>
                            <p className="mt-1 text-xs text-slate-500">Todo el equipo desde cero (BOM completo).</p>
                        </button>
                        <button
                            onClick={() => setContexto('reparacion')}
                            className="rounded-xl border-2 border-slate-200 p-5 text-left transition-colors hover:border-amber-400 hover:bg-amber-50"
                        >
                            <p className="font-display font-bold text-navy-900">Reparación</p>
                            <p className="mt-1 text-xs text-slate-500">Solo los componentes que se van a reparar.</p>
                        </button>
                    </div>
                </div>
            )}

            {contexto === 'reparacion' && (
                <div>
                    <p className="mb-3 text-sm text-slate-600">Selecciona los componentes a reparar:</p>
                    {bom.isLoading ? (
                        <Spinner label="Cargando componentes…" />
                    ) : (bom.data?.lineas ?? []).length === 0 ? (
                        <p className="text-sm text-slate-400">Este equipo no tiene componentes.</p>
                    ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                            {(bom.data?.lineas ?? []).map((l) => (
                                <label
                                    key={l.lineaId}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={seleccion.includes(l.lineaId)}
                                        onChange={() =>
                                            setSeleccion((s) =>
                                                s.includes(l.lineaId) ? s.filter((x) => x !== l.lineaId) : [...s, l.lineaId]
                                            )
                                        }
                                        className="rounded"
                                    />
                                    <span className="font-semibold text-navy-900">{l.componente}</span>
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                        {l.variacion}
                                    </span>
                                    <span className="ml-auto text-xs text-slate-400">× {l.cantidad}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" onClick={() => setContexto(null)}>
                            Atrás
                        </Button>
                        <Button onClick={confirmarReparacion} disabled={creando}>
                            {creando ? 'Generando…' : 'Cotizar reparación'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}

function NuevoEquipoModal({ onClose, onCreado }: { onClose: () => void; onCreado: (id: string) => void }) {
    const { campos } = useCamposModulo('equipos')
    const [pers, setPers] = useState<Record<string, unknown>>({})
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<{ nombre: string; tipo: string; descripcion: string }>({
        defaultValues: { nombre: '', tipo: '', descripcion: '' },
    })

    const onSubmit = async (datos: { nombre: string; tipo: string; descripcion: string }) => {
        try {
            const res = await crearEquipo({ ...datos, personalizados: pers })
            toast.success(res.mensaje)
            onCreado(res.id)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al crear')
        }
    }

    return (
        <Modal open onClose={onClose} titulo="Nuevo equipo">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Field label="Nombre del equipo" error={errors.nombre?.message} required>
                    <Input
                        placeholder="Ej. Trituradora TR-500"
                        {...register('nombre', { required: 'El nombre es obligatorio' })}
                    />
                </Field>
                <Field label="Tipo">
                    <Input placeholder="Ej. Trituradora, Manufactura…" {...register('tipo')} />
                </Field>
                <Field label="Descripción">
                    <Input placeholder="Opcional" {...register('descripcion')} />
                </Field>
                <CamposPersonalizadosForm campos={campos} valores={pers} onChange={setPers} columnas={1} />
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creando…' : 'Crear y armar BOM'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
