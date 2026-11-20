import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { actualizarUsuario, crearUsuario, eliminarUsuario, getBitacora, getUsuarios, restablecerPassword } from '../api/UsuariosAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import { IconLock, IconPlus, IconTrash } from '../components/icons'
import { MODULO_LABEL, ROL_LABEL } from '../types'
import type { AccesoModulo, MatrizAccesos, Modulo, Permisos, RegistroBitacora, Rol, RolInfo, UsuarioAdmin } from '../types'

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
    const [reseteando, setReseteando] = useState<UsuarioAdmin | null>(null)
    const [creando, setCreando] = useState(false)
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
                    <Button onClick={() => setCreando(true)} disabled={roles.length === 0}>
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
                                            {u.accesosPersonalizados && u.rol !== 'admin' && (
                                                <span
                                                    className="mt-1 block text-[11px] font-medium text-amber-600"
                                                    title="Sus módulos/operaciones difieren del paquete del rol"
                                                >
                                                    Personalizado
                                                </span>
                                            )}
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
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setEditando(u)}
                                                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                                                    >
                                                        Rol y permisos
                                                    </button>
                                                    <button
                                                        onClick={() => setReseteando(u)}
                                                        className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
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
            {editando && <EditarModal usuario={editando} roles={roles} onClose={() => setEditando(null)} onDone={invalidar} />}
            {reseteando && <ResetPasswordModal usuario={reseteando} onClose={() => setReseteando(null)} onDone={invalidar} />}
        </div>
    )
}

function PermisoChips({ rol, permisos }: { rol: Rol; permisos: Permisos }) {
    if (permisosPlenos(rol)) return <span className="text-xs text-slate-400">Todos</span>
    const chips: string[] = []
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
    const [permisos, setPermisos] = useState<Permisos>({ generarReportes: false })
    const [personalizado, setPersonalizado] = useState(false)
    const [matriz, setMatriz] = useState<MatrizAccesos>(() => copiarMatriz(roles.find((r) => r.clave === 'capturista')!.matriz))
    const [debeCambiar, setDebeCambiar] = useState(true)

    const crear = useMutation({
        mutationFn: () =>
            crearUsuario({
                nombre,
                email,
                password,
                rol,
                permisos,
                debeCambiarPassword: debeCambiar,
                ...(rol !== 'admin' && personalizado ? { accesosPersonalizados: true, accesos: matriz } : {}),
            }),
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
        <ModalShell titulo="Nuevo usuario" onClose={onClose} ancho>
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre" required>
                        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
                    </Field>
                    <Field label="Correo" required>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@triaso.com" />
                    </Field>
                </div>
                <Field label="Contraseña" required error={password && password.length < 6 ? 'Mínimo 6 caracteres' : undefined}>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña inicial" />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={debeCambiar} onChange={(e) => setDebeCambiar(e.target.checked)} className="h-4 w-4" />
                    Pedir cambio de contraseña al primer acceso
                </label>

                <RolSelect roles={roles} rol={rol} onChange={setRol} info={info} />
                <MatrizPermisos
                    rol={rol}
                    roles={roles}
                    personalizado={personalizado}
                    matriz={matriz}
                    onPersonalizado={setPersonalizado}
                    onMatriz={setMatriz}
                />
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
    const [personalizado, setPersonalizado] = useState<boolean>(!!usuario.accesosPersonalizados)
    const [matriz, setMatriz] = useState<MatrizAccesos>(() => copiarMatriz(usuario.operaciones))

    const guardar = useMutation({
        mutationFn: () =>
            actualizarUsuario(usuario._id, {
                rol,
                permisos,
                activo,
                ...(rol !== 'admin' ? { accesosPersonalizados: personalizado, accesos: personalizado ? matriz : undefined } : {}),
            }),
        onSuccess: () => {
            toast.success('Usuario actualizado')
            onDone()
            onClose()
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const info = roles.find((r) => r.clave === rol)

    return (
        <ModalShell titulo={`Editar ${usuario.nombre}`} onClose={onClose} ancho>
            <div className="space-y-4">
                <p className="text-sm text-slate-500">{usuario.email}</p>
                <RolSelect roles={roles} rol={rol} onChange={setRol} info={info} />
                <MatrizPermisos
                    rol={rol}
                    roles={roles}
                    personalizado={personalizado}
                    matriz={matriz}
                    onPersonalizado={setPersonalizado}
                    onMatriz={setMatriz}
                />
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

// ---------- Restablecer contraseña (admin, en cualquier momento) ----------
function ResetPasswordModal({ usuario, onClose, onDone }: { usuario: UsuarioAdmin; onClose: () => void; onDone: () => void }) {
    const [password, setPassword] = useState('')
    const [ver, setVer] = useState(false)

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
        <ModalShell titulo="Restablecer contraseña" onClose={onClose}>
            <p className="mb-4 text-sm text-slate-600">
                Asigna una contraseña <strong>temporal</strong> a <span className="font-semibold text-navy-900">{usuario.nombre}</span> (
                {usuario.email}) y compártela. Sus sesiones abiertas se cerrarán y el sistema le pedirá cambiarla al entrar.
            </p>

            <Field label="Nueva contraseña" required error={password && password.length < 6 ? 'Mínimo 6 caracteres' : undefined}>
                <div className="flex items-center gap-2">
                    <Input
                        type={ver ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña temporal"
                        className="flex-1"
                    />
                    {/* Mantener presionado para ver (la contraseña que el admin está fijando) */}
                    <button
                        type="button"
                        onMouseDown={() => setVer(true)}
                        onMouseUp={() => setVer(false)}
                        onMouseLeave={() => setVer(false)}
                        onTouchStart={() => setVer(true)}
                        onTouchEnd={() => setVer(false)}
                        className="select-none rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        title="Mantén presionado para ver"
                    >
                        {ver ? 'Viendo' : 'Ver'}
                    </button>
                </div>
            </Field>

            <p className="mt-2 text-xs text-slate-400">
                Nota de seguridad: no es posible mostrar la contraseña actual del usuario (se guarda cifrada). Solo puedes
                fijar una nueva.
            </p>

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
                Este rol puede <strong>generar reportes PDF</strong> de forma automática.
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

// ---------- Matriz de permisos CRUD por módulo ----------
const OPS: { clave: keyof AccesoModulo; etiqueta: string }[] = [
    { clave: 'menu', etiqueta: 'Menú' },
    { clave: 'ver', etiqueta: 'Ver' },
    { clave: 'crear', etiqueta: 'Crear' },
    { clave: 'editar', etiqueta: 'Editar' },
    { clave: 'eliminar', etiqueta: 'Eliminar' },
]
// Usuarios es exclusivo del administrador: no se otorga por personalización
const MODULOS_EDITABLES: Modulo[] = ['equipos', 'componentes', 'materiales', 'proveedores', 'inventario', 'cotizaciones', 'ordenes', 'historial']
// Operaciones que no existen en un módulo (el historial es una bitácora de solo consulta)
const NO_APLICA: Partial<Record<Modulo, (keyof AccesoModulo)[]>> = { historial: ['crear', 'editar', 'eliminar'] }

const copiarMatriz = (m: MatrizAccesos): MatrizAccesos => JSON.parse(JSON.stringify(m))

// Aplica las dependencias al marcar/desmarcar: cualquier operación o el menú requieren "Ver";
// quitar "Ver" quita todo lo demás del módulo.
function alternar(matriz: MatrizAccesos, modulo: Modulo, op: keyof AccesoModulo, valor: boolean): MatrizAccesos {
    const nueva = copiarMatriz(matriz)
    const fila = nueva[modulo]
    fila[op] = valor
    if (op === 'ver' && !valor) {
        fila.menu = fila.crear = fila.editar = fila.eliminar = false
    } else if (op !== 'ver' && valor) {
        fila.ver = true
    }
    for (const na of NO_APLICA[modulo] ?? []) fila[na] = false
    return nueva
}

function MatrizPermisos({
    rol,
    roles,
    personalizado,
    matriz,
    onPersonalizado,
    onMatriz,
}: {
    rol: Rol
    roles: RolInfo[]
    personalizado: boolean
    matriz: MatrizAccesos
    onPersonalizado: (v: boolean) => void
    onMatriz: (m: MatrizAccesos) => void
}) {
    const plantilla = roles.find((r) => r.clave === rol)?.matriz
    if (rol === 'admin') {
        return (
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                El <strong>Administrador</strong> siempre tiene acceso total a todos los módulos; sus permisos no se personalizan.
            </div>
        )
    }
    if (!plantilla) return null
    const vista = personalizado ? matriz : plantilla
    const difiere = (m: Modulo, op: keyof AccesoModulo) => personalizado && vista[m][op] !== plantilla[m][op]
    const cambios = personalizado ? MODULOS_EDITABLES.reduce((n, m) => n + OPS.filter((o) => difiere(m, o.clave)).length, 0) : 0

    return (
        <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Módulos y operaciones</p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={personalizado}
                        onChange={(e) => {
                            // Al activar se parte del paquete del rol actual
                            if (e.target.checked) onMatriz(copiarMatriz(plantilla))
                            onPersonalizado(e.target.checked)
                        }}
                        className="h-4 w-4"
                    />
                    Personalizar permisos de este usuario
                </label>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2 text-left">Módulo</th>
                            {OPS.map((o) => (
                                <th key={o.clave} className="px-2 py-2 text-center">
                                    {o.etiqueta}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {MODULOS_EDITABLES.map((m) => (
                            <tr key={m} className={vista[m].ver ? '' : 'text-slate-400'}>
                                <td className="px-3 py-2 font-medium">{MODULO_LABEL[m]}</td>
                                {OPS.map((o) =>
                                    NO_APLICA[m]?.includes(o.clave) ? (
                                        <td key={o.clave} className="px-2 py-2 text-center text-slate-300">
                                            —
                                        </td>
                                    ) : (
                                        <td key={o.clave} className={`px-2 py-2 text-center ${difiere(m, o.clave) ? 'bg-amber-50' : ''}`}>
                                            <input
                                                type="checkbox"
                                                aria-label={`${o.etiqueta} en ${MODULO_LABEL[m]}`}
                                                checked={vista[m][o.clave]}
                                                disabled={!personalizado}
                                                onChange={(e) => onMatriz(alternar(matriz, m, o.clave, e.target.checked))}
                                                className="h-4 w-4 disabled:opacity-60"
                                            />
                                        </td>
                                    )
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {personalizado ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                        {cambios === 0 ? 'Igual al paquete del rol.' : `${cambios} diferencia(s) respecto al paquete del rol (resaltadas).`}{' '}
                        "Menú" muestra el módulo en la barra lateral; "Ver" permite consultarlo aunque no esté en el menú.
                    </span>
                    {cambios > 0 && (
                        <button
                            type="button"
                            onClick={() => onMatriz(copiarMatriz(plantilla))}
                            className="rounded-md px-2 py-1 font-medium text-brand-700 hover:bg-brand-50"
                        >
                            Restablecer al paquete del rol
                        </button>
                    )}
                </div>
            ) : (
                <p className="mt-2 text-xs text-slate-500">Vista previa del paquete del rol. Activa "Personalizar" para ajustar módulo por módulo.</p>
            )}
        </div>
    )
}

function ModalShell({ titulo, onClose, children, ancho = false }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={onClose}>
            <div
                className={`max-h-[90vh] w-full ${ancho ? 'max-w-2xl' : 'max-w-md'} overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 font-display text-lg font-bold text-navy-900">{titulo}</h2>
                {children}
            </div>
        </div>
    )
}
