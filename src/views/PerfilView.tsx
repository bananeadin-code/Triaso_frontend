import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { actualizarPerfil, cambiarPassword } from '../api/AuthAPI'
import { useAuth } from '../hooks/useAuth'
import { Button, Field, Input, PageHeader, Spinner } from '../components/ui'
import { IconPerfil, IconLock, IconAlerta } from '../components/icons'

export function PerfilView() {
    const { usuario } = useAuth()
    const queryClient = useQueryClient()

    const [nombre, setNombre] = useState('')
    const [email, setEmail] = useState('')
    const [actual, setActual] = useState('')
    const [nueva, setNueva] = useState('')
    const [repetir, setRepetir] = useState('')

    useEffect(() => {
        if (usuario) {
            setNombre(usuario.nombre)
            setEmail(usuario.email)
        }
    }, [usuario])

    const esAdmin = usuario?.rol === 'admin'

    const guardarDatos = useMutation({
        mutationFn: () =>
            actualizarPerfil({ nombre: nombre.trim(), ...(esAdmin ? { email: email.trim() } : {}) }),
        onSuccess: () => {
            toast.success('Perfil actualizado')
            queryClient.invalidateQueries({ queryKey: ['usuario'] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const guardarPassword = useMutation({
        mutationFn: () => cambiarPassword(actual, nueva),
        onSuccess: () => {
            toast.success('Contraseña actualizada')
            // Quita el bloqueo de contraseña temporal y recarga permisos
            queryClient.invalidateQueries({ queryKey: ['usuario'] })
            setActual('')
            setNueva('')
            setRepetir('')
        },
        onError: (e: Error) => toast.error(e.message),
    })

    if (!usuario) return <Spinner label="Cargando perfil…" />

    const emailValido = !esAdmin || /^\S+@\S+\.\S+$/.test(email.trim())
    const hayCambios =
        nombre.trim() !== '' &&
        (nombre.trim() !== usuario.nombre || (esAdmin && email.trim().toLowerCase() !== usuario.email))
    const passwordOk = actual && nueva.length >= 6 && nueva === repetir

    return (
        <div className="mx-auto max-w-2xl">
            <PageHeader titulo="Mi perfil" descripcion="Actualiza tu nombre y tu contraseña" />

            {usuario.debeCambiarPassword && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <span className="mt-0.5 shrink-0">
                        <IconAlerta />
                    </span>
                    <p>
                        Tu contraseña es <strong>temporal</strong> (la asignó otra persona). Cámbiala para poder usar el
                        sistema. En "Contraseña actual" escribe la que te dieron.
                    </p>
                </div>
            )}

            {/* Datos de la cuenta */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <IconPerfil />
                    </span>
                    <div>
                        <p className="font-display font-bold text-navy-900">{usuario.email}</p>
                        <p className="text-xs font-medium text-brand-600">{usuario.nombreRol}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <Field label="Nombre">
                        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                    </Field>

                    {/* Solo el administrador puede cambiar su propio correo */}
                    {esAdmin && (
                        <Field
                            label="Correo"
                            error={email && !emailValido ? 'Correo no válido' : undefined}
                        >
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </Field>
                    )}

                    <Button onClick={() => guardarDatos.mutate()} disabled={!hayCambios || !emailValido || guardarDatos.isPending}>
                        {guardarDatos.isPending ? 'Guardando…' : 'Guardar'}
                    </Button>
                </div>

                {esAdmin ? (
                    <p className="mt-3 text-xs text-slate-400">
                        Como administrador puedes cambiar tu propio correo de acceso.
                    </p>
                ) : (
                    <p className="mt-3 text-xs text-slate-400">
                        El correo y el rol solo los puede cambiar el administrador.
                    </p>
                )}
            </div>

            {/* Cambiar contraseña */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-slate-400">
                        <IconLock />
                    </span>
                    <h2 className="font-display font-bold text-navy-900">Cambiar contraseña</h2>
                </div>
                <div className="space-y-4">
                    <Field label="Contraseña actual" required>
                        <Input type="password" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="••••••••" />
                    </Field>
                    <Field label="Nueva contraseña" required error={nueva && nueva.length < 6 ? 'Mínimo 6 caracteres' : undefined}>
                        <Input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="••••••••" />
                    </Field>
                    <Field label="Repetir nueva contraseña" required error={repetir && nueva !== repetir ? 'No coincide' : undefined}>
                        <Input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} placeholder="••••••••" />
                    </Field>
                    <Button onClick={() => guardarPassword.mutate()} disabled={!passwordOk || guardarPassword.isPending}>
                        {guardarPassword.isPending ? 'Guardando…' : 'Cambiar contraseña'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
