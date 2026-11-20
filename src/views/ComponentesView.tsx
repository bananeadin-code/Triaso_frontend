import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { crearComponente, eliminarComponente, getComponentes } from '../api/ComponentesAPI'
import { useAuth } from '../hooks/useAuth'
import { Buscador, Button, EmptyState, Field, Input, PageHeader, Spinner } from '../components/ui'
import { Modal } from '../components/Modal'
import { Paginacion, usePaginacionLocal } from '../components/Paginacion'
import { BadgePorValidar, BotonValidar, FiltroPorValidar, usePorValidar } from '../components/PorValidar'
import { CamposPersonalizadosForm, TdCampos, ThCampos, useCamposModulo } from '../components/CamposPersonalizados'
import { IconEdit, IconPlus, IconTrash } from '../components/icons'

export function ComponentesView() {
    const { puede } = useAuth()
    const puedeCrear = puede('componentes', 'crear')
    const puedeEliminar = puede('componentes', 'eliminar')
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [modalAbierto, setModalAbierto] = useState(false)
    const [busqueda, setBusqueda] = useState('')

    const { data, isLoading } = useQuery({ queryKey: ['componentes'], queryFn: getComponentes })
    const { campos: camposActivos } = useCamposModulo('componentes')

    const eliminar = useMutation({
        mutationFn: eliminarComponente,
        onSuccess: (res) => {
            toast.success(res.mensaje)
            queryClient.invalidateQueries({ queryKey: ['componentes'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const pv = usePorValidar('componentes', data ?? [])
    const puedeValidar = puede('componentes', 'editar')
    const componentes = pv.filtrar(data ?? []).filter((c) => c.concepto.toLowerCase().includes(busqueda.toLowerCase()))
    const { visibles, control } = usePaginacionLocal(componentes)
    if (isLoading) return <Spinner label="Cargando componentes…" />

    return (
        <div>
            <PageHeader
                titulo="Componentes"
                descripcion="Catálogo reutilizable de componentes, sus variaciones y materiales"
                accion={
                    puedeCrear && (
                        <Button onClick={() => setModalAbierto(true)}>
                            <IconPlus /> Nuevo componente
                        </Button>
                    )
                }
            />

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar componente por nombre…" />
                <FiltroPorValidar
                    pendientes={pv.pendientes}
                    solo={pv.solo}
                    onSolo={pv.setSolo}
                    mostrados={componentes.length}
                    onValidarTodos={() => pv.validar.mutate(componentes.filter((c) => c.porValidar).map((c) => c._id))}
                    puedeValidar={puedeValidar}
                    validando={pv.validar.isPending}
                />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {componentes.length === 0 ? (
                    <EmptyState titulo="Sin componentes" descripcion="No hay componentes que coincidan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3 text-center">Variaciones</th>
                                    <th className="px-4 py-3 text-center">Materiales</th>
                                    <ThCampos campos={camposActivos} />
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((c) => {
                                    const totalMat = c.variaciones.reduce((s, v) => s + v.materiales.length, 0)
                                    return (
                                        <tr
                                            key={c._id}
                                            className="cursor-pointer transition-colors hover:bg-slate-50"
                                            onClick={() => navigate(`/componentes/${c._id}`)}
                                        >
                                            <td className="px-4 py-3 font-semibold text-navy-900">
                                                {c.concepto}
                                                {c.porValidar && <BadgePorValidar />}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{c.descripcion || '—'}</td>
                                            <td className="px-4 py-3 text-center text-slate-600">
                                                {c.variaciones.length}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-600">{totalMat}</td>
                                            <TdCampos campos={camposActivos} valores={c.personalizados} className="px-4 py-3 text-slate-500" />
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/componentes/${c._id}`)}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                                                        title="Abrir editor"
                                                    >
                                                        <IconEdit />
                                                    </button>
                                                    {puedeValidar && c.porValidar && (
                                                        <BotonValidar onClick={() => pv.validar.mutate([c._id])} disabled={pv.validar.isPending} />
                                                    )}
                                                    {puedeEliminar && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`¿Eliminar el componente "${c.concepto}"?`))
                                                                    eliminar.mutate(c._id)
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
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <Paginacion {...control} />
            </div>

            {modalAbierto && (
                <NuevoComponenteModal
                    onClose={() => setModalAbierto(false)}
                    onCreado={(id) => {
                        setModalAbierto(false)
                        queryClient.invalidateQueries({ queryKey: ['componentes'] })
                        navigate(`/componentes/${id}`)
                    }}
                />
            )}
        </div>
    )
}

function NuevoComponenteModal({ onClose, onCreado }: { onClose: () => void; onCreado: (id: string) => void }) {
    const { campos } = useCamposModulo('componentes')
    const [pers, setPers] = useState<Record<string, unknown>>({})
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<{ concepto: string; descripcion: string }>({ defaultValues: { concepto: '', descripcion: '' } })

    const onSubmit = async (datos: { concepto: string; descripcion: string }) => {
        try {
            const res = await crearComponente({ ...datos, personalizados: pers })
            toast.success(res.mensaje)
            onCreado(res.id)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al crear')
        }
    }

    return (
        <Modal open onClose={onClose} titulo="Nuevo componente">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Field label="Concepto" error={errors.concepto?.message} required>
                    <Input
                        placeholder="Ej. Tablero de control, Eje, Tolva…"
                        {...register('concepto', { required: 'El concepto es obligatorio' })}
                    />
                </Field>
                <Field label="Descripción">
                    <Input placeholder="Opcional" {...register('descripcion')} />
                </Field>
                <CamposPersonalizadosForm campos={campos} valores={pers} onChange={setPers} columnas={1} />
                <p className="text-sm text-slate-500">
                    Al crearlo se abrirá el editor para agregar variaciones y materiales.
                </p>
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creando…' : 'Crear y editar'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
