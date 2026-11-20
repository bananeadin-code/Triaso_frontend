import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { actualizarUsuario, crearUsuario, eliminarUsuario, getBitacora, getUsuarios, restablecerPassword } from '../api/UsuariosAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { IconLock, IconPlus, IconTrash } from '../components/icons'
import { ROL_LABEL } from '../types'
import type { Permisos, RegistroBitacora, Rol, RolInfo, UsuarioAdmin } from '../types'

const ROL_STYLE: Record<Rol, string> = {
    admin: 'bg-navy-900 text-white',
    operador: 'bg-brand-100 text-brand-700',
    cotizador: 'bg-blue-100 text-blue-700',
    comprador: 'bg-violet-100 text-violet-700',
    capturista: 'bg-amber-100 text-amber-700',
    almacenista: 'bg-emerald-100 text-emerald-700',
}

const permisosPlenos = (rol: Rol) => rol === 'admin' || rol === 'operador'

export function UsuariosView() {
    const queryClient = useQueryClient()
    const { usuario: yo } = useAuth()
    const { data, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: getUsuarios })
    const [editando, setEditando] = useState<UsuarioAdmin | null>(null)
    const [creando, setCreando] = useState(false)
    const [restableciendo, setRestableciendo] = useState<UsuarioAdmin | null>(null)
    const [pestana, setPestana] = useState<'usuarios' | 'bitacora'>('usuarios')

    const invalidar = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] })

    const borrar = useMutation({
        mutationFn: eliminarUsuario,
        onSuccess: (r) => {
            toast.success(r?.mensaje ?? 'Usuario eliminado')
            invalidar()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (isLoading || !data) return <Spinner label="Cargando usuarios…" />
    const { usuarios, roles } = data

    return (
        <div>
            <PageHeader
                titulo="Usuarios"
                descripcion="Registra usuarios, asígnales un rol y sus permisos"
                accion={
                    <Button onClick={() => setCreando(true)}>
                        <IconPlus /> Nuevo usuario
                    </Button>
                }
            />

            <div className="mb-4 flex gap-1 border-b border-slate-200">
                {(['usuarios', 'bitacora'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPestana(p)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                            pestana === p ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {p === 'usuarios' ? 'Usuarios' : 'Bitácora'}
                    </button>
                ))}
            </div>

            {pestana === 'bitacora' ? (
                <Bitacora />
            ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {usuarios.length === 0 ? (
                    <EmptyState titulo="Sin usuarios" descripcion="Crea el primer usuario del sistema." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Correo</th>
                                    <th className="px-4 py-3 text-center">Rol</th>
                                    <th className="px-4 py-3">Permisos</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usuarios.map((u) => (
                                    <tr key={u._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-semibold text-navy-900">{u.nombre}</td>
                                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROL_STYLE[u.rol]}`}>
                                                {ROL_LABEL[u.rol]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <PermisoChips rol={u.rol} permisos={u.permisos} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {u.activo ? (
                                                <span className="text-xs font-semibold text-emerald-600">Activo</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400">Inactivo</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {u._id === yo?._id ? (
                                                // Tu propia cuenta: no puedes cambiarte el rol ni eliminarte
                                                <div className="flex justify-end">
                                                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                                                        Tu cuenta
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => setEditando(u)}
                                                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                                                    >
                                                        Rol y permisos
                                                    </button>
                                                    <button
                                                        onClick={() => setRestableciendo(u)}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                                                        title="Restablecer contraseña"
                                                    >
                                                        <IconLock />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Eliminar al usuario ${u.nombre} (${u.email})?`)) borrar.mutate(u._id)
                                                        }}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                        title="Eliminar usuario"
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}

            {creando && <UsuarioModal roles={roles} onClose={() => setCreando(false)} onDone={invalidar} />}
            {restableciendo && <RestablecerModal usuario={restableciendo} onClose={() => setRestableciendo(null)} onDone={invalidar} />}
            {editando && <EditarModal usuario={editando} roles={roles} onClose={() => setEditando(null)} onDone={invalidar} />}
        </div>
    )
}

function PermisoChips({ rol, permisos }: { rol: Rol; permisos: Permisos }) {
    if (permisosPlenos(rol)) return <span className="text-xs text-slate-400">Todos</span>
    const chips: string[] = []
    if (permisos.limpiarHistoriales) chips.push('Limpiar')
    if (permisos.generarReportes) chips.push('Reportes')
    if (chips.length === 0) return <span className="text-xs text-slate-400">—</span>
    return (
        <div className="flex flex-wrap gap-1">
            {chips.map((c) => (
                <span key={c} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {c}
                </span>
            ))}
        </div>
    )
}

// ---------- Alta de usuario ----------
function UsuarioModal({ roles, onClose, onDone }: { roles: RolInfo[]; onClose: () => void; onDone: () => void }) {
    const [nombre, setNombre] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rol, setRol] = useState<Rol>('capturista')
    const [permisos, setPermisos] = useState<Permisos>({ limpiarHistoriales: false, generarReportes: false })
    const [debeCambiar, setDebeCambiar] = useState(true)

    const crear = useMutation({
        mutationFn: () => crearUsuario({ nombre, email, password, rol, permisos, debeCambiarPassword: debeCambiar }),
        onSuccess: () => {
            toast.success('Usuario creado')
            onDone()
            onClose()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const info = roles.find((r) => r.clave === rol)
    const valido = nombre.trim() && /\S+@\S+\.\S+/.test(email) && password.length >= 6

    return (
        <ModalShell titulo="Nuevo usuario" onClose={onClose}>
            <div className="space-y-4">
                <Field label="Nombre" required>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
                </Field>
                <Field label="Correo" required>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@triaso.com" />
                </Field>
                <Field label="Contraseña" required error={password && password.length < 6 ? 'Mínimo 6 caracteres' : undefined}>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña inicial" />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={debeCambiar} onChange={(e) => setDebeCambiar(e.target.checked)} className="h-4 w-4" />
                    Pedir cambio de contraseña al primer acceso
                </label>

                <RolSelect roles={roles} rol={rol} onChange={setRol} info={info} />
                <PermisosCheck rol={rol} permisos={permisos} onChange={setPermisos} />
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button onClick={() => crear.mutate()} disabled={!valido || crear.isPending}>
                    {crear.isPending ? 'Creando…' : 'Crear usuario'}
                </Button>
            </div>
        </ModalShell>
    )
}

// ---------- Editar rol/permisos/estado ----------
function EditarModal({ usuario, roles, onClose, onDone }: { usuario: UsuarioAdmin; roles: RolInfo[]; onClose: () => void; onDone: () => void }) {
    const [rol, setRol] = useState<Rol>(usuario.rol)
    const [permisos, setPermisos] = useState<Permisos>(usuario.permisos)
    const [activo, setActivo] = useState<boolean>(usuario.activo)

    const guardar = useMutation({
        mutationFn: () => actualizarUsuario(usuario._id, { rol, permisos, activo }),
        onSuccess: () => {
            toast.success('Usuario actualizado')
            onDone()
            onClose()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const info = roles.find((r) => r.clave === rol)

    return (
        <ModalShell titulo={`Editar ${usuario.nombre}`} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-slate-500">{usuario.email}</p>
                <RolSelect roles={roles} rol={rol} onChange={setRol} info={info} />
                <PermisosCheck rol={rol} permisos={permisos} onChange={setPermisos} />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
                    Cuenta activa (puede iniciar sesión)
                </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
                    {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
                </Button>
            </div>
        </ModalShell>
    )
}

// ---------- Restablecer contraseña (olvido) ----------
function RestablecerModal({ usuario, onClose, onDone }: { usuario: UsuarioAdmin; onClose: () => void; onDone: () => void }) {
    const [password, setPassword] = useState('')
    const guardar = useMutation({
        mutationFn: () => restablecerPassword(usuario._id, password),
        onSuccess: (r) => {
            toast.success(r?.mensaje ?? 'Contraseña restablecida')
            onDone()
            onClose()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    return (
        <ModalShell titulo={`Restablecer contraseña de ${usuario.nombre}`} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-slate-500">
                    Asigna una contraseña <strong>temporal</strong> y compártela con {usuario.email}. Sus sesiones abiertas se
                    cerrarán y el sistema le pedirá cambiarla al entrar.
                </p>
                <Field label="Contraseña temporal" required error={password && password.length < 6 ? 'Mínimo 6 caracteres' : undefined}>
                    <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
                </Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button onClick={() => guardar.mutate()} disabled={password.length < 6 || guardar.isPending}>
                    {guardar.isPending ? 'Guardando…' : 'Restablecer'}
                </Button>
            </div>
        </ModalShell>
    )
}

// ---------- Bitácora de gestión de usuarios ----------
const ACCION_LABEL: Record<RegistroBitacora['accion'], { texto: string; estilo: string }> = {
    alta: { texto: 'Alta', estilo: 'bg-emerald-100 text-emerald-700' },
    baja: { texto: 'Baja', estilo: 'bg-red-100 text-red-700' },
    cambio: { texto: 'Cambio', estilo: 'bg-blue-100 text-blue-700' },
    password: { texto: 'Contraseña', estilo: 'bg-amber-100 text-amber-700' },
}

function Bitacora() {
    const { data, isLoading } = useQuery({ queryKey: ['usuarios', 'bitacora'], queryFn: getBitacora })
    if (isLoading || !data) return <Spinner label="Cargando bitácora…" />
    if (data.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <EmptyState titulo="Sin movimientos" descripcion="Aquí aparecerán las altas, bajas y cambios de usuarios." />
            </div>
        )
    }
    return (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {data.map((r) => (
                <div key={r._id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACCION_LABEL[r.accion].estilo}`}>
                            {ACCION_LABEL[r.accion].texto}
                        </span>
                        <span className="font-semibold text-navy-900">{r.afectado}</span>
                        <span className="ml-auto text-xs text-slate-400">{new Date(r.createdAt).toLocaleString('es-MX')}</span>
                    </div>
                    {r.detalle.length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
                            {r.detalle.map((d, i) => (
                                <li key={i}>{d}</li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-1 text-xs text-slate-400">Por {r.actor}</p>
                </div>
            ))}
        </div>
    )
}

function RolSelect({ roles, rol, onChange, info }: { roles: RolInfo[]; rol: Rol; onChange: (r: Rol) => void; info?: RolInfo }) {
    return (
        <Field label="Rol (paquete de privilegios)" required>
            <Select value={rol} onChange={(e) => onChange(e.target.value as Rol)}>
                {roles.map((r) => (
                    <option key={r.clave} value={r.clave}>
                        {r.nombre}
                    </option>
                ))}
            </Select>
            {info && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{info.descripcion}</p>}
        </Field>
    )
}

function PermisosCheck({ rol, permisos, onChange }: { rol: Rol; permisos: Permisos; onChange: (p: Permisos) => void }) {
    if (permisosPlenos(rol)) {
        return (
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                Este rol tiene <strong>todos los permisos</strong> (limpiar historiales y generar reportes) de forma automática.
            </div>
        )
    }
    return (
        <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Permisos (dentro de sus módulos)</p>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={permisos.limpiarHistoriales}
                        onChange={(e) => onChange({ ...permisos, limpiarHistoriales: e.target.checked })}
                        className="h-4 w-4"
                    />
                    Limpiar historiales
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={permisos.generarReportes}
                        onChange={(e) => onChange({ ...permisos, generarReportes: e.target.checked })}
                        className="h-4 w-4"
                    />
                    Generar reportes PDF
                </label>
            </div>
        </div>
    )
}

function ModalShell({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="mb-4 font-display text-lg font-bold text-navy-900">{titulo}</h2>
                {children}
            </div>
        </div>
    )
}
