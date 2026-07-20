import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { login, type LoginForm } from '../api/AuthAPI'
import { Button, Field, Input } from '../components/ui'
import { Logo } from '../components/Logo'
import { MARCA } from '../config/marca'

export function LoginView() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [cargando, setCargando] = useState(false)
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } })

    const onSubmit = async (datos: LoginForm) => {
        setCargando(true)
        try {
            await login(datos)
            await queryClient.invalidateQueries({ queryKey: ['usuario'] })
            navigate('/')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Panel institucional */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
                <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
                <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />
                {/* El logo es un wordmark (ya dice "TRIASO") y es azul marino,
                    así que va sobre una placa blanca para que contraste con el fondo. */}
                <div className="relative">
                    <div className="inline-block rounded-xl bg-white px-6 py-4 shadow-sm">
                        <Logo
                            className="h-auto w-72 object-contain"
                            inicialClassName="font-display text-3xl font-extrabold text-navy-900"
                        />
                    </div>
                </div>
                <div className="relative">
                    <h1 className="font-display text-4xl font-extrabold leading-tight">
                        Control total de tu<br />
                        <span className="text-accent-400">manufactura</span>
                    </h1>
                    <p className="mt-4 max-w-md text-slate-300">
                        Sistema de gestión de listas de materiales por equipo (BOM multinivel), inventario, proveedores y órdenes
                        de compra para equipos de manufactura y trituradoras.
                    </p>
                </div>
                <p className="relative text-sm text-slate-400">Durango, México · Fabricación y exportación</p>
            </div>

            {/* Formulario */}
            <div className="flex w-full flex-col items-center justify-center bg-slate-100 px-6 lg:w-1/2">
                <div className="w-full max-w-sm">
                    <div className="mb-8 text-center">
                        <h2 className="font-display text-2xl font-bold text-navy-900">Iniciar sesión</h2>
                        <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <Field label="Correo electrónico" error={errors.email?.message} required>
                            <Input
                                type="email"
                                placeholder="usuario@triaso.com"
                                {...register('email', {
                                    required: 'El correo es obligatorio',
                                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo no válido' },
                                })}
                            />
                        </Field>

                        <Field label="Contraseña" error={errors.password?.message} required>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                {...register('password', { required: 'La contraseña es obligatoria' })}
                            />
                        </Field>

                        <Button type="submit" disabled={cargando} className="w-full">
                            {cargando ? 'Ingresando…' : 'Entrar'}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        © {new Date().getFullYear()} {MARCA} · Acceso restringido a personal autorizado
                    </p>
                </div>
            </div>
        </div>
    )
}
