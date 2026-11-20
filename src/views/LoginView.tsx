import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { login, type LoginForm } from '../api/AuthAPI'
import { Button, Input } from '../components/ui'
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
            {/* IZQUIERDA (azul marino): formulario de acceso. Visible también en móvil. */}
            <div className="relative flex w-full flex-col justify-center overflow-hidden bg-navy-900 px-6 py-12 text-white sm:px-10 lg:w-1/2">
                <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
                <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />

                <div className="relative mx-auto w-full max-w-sm">
                    {/* En móvil no hay panel derecho, así que aquí va un logo (sobre placa blanca) */}
                    <div className="mb-10 lg:hidden">
                        <div className="inline-block rounded-xl bg-white px-5 py-3 shadow-sm">
                            <Logo
                                className="h-auto w-52 object-contain"
                                inicialClassName="font-display text-2xl font-extrabold text-navy-900"
                            />
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="font-display text-3xl font-bold text-white">Iniciar sesión</h2>
                        <p className="mt-1 text-sm text-slate-300">Ingresa tus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-200">
                                Correo electrónico <span className="text-accent-400">*</span>
                            </label>
                            <Input
                                type="email"
                                placeholder="usuario@triaso.com"
                                {...register('email', {
                                    required: 'El correo es obligatorio',
                                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo no válido' },
                                })}
                            />
                            {errors.email && <p className="mt-1 text-xs font-medium text-red-300">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-200">
                                Contraseña <span className="text-accent-400">*</span>
                            </label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                {...register('password', { required: 'La contraseña es obligatoria' })}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs font-medium text-red-300">{errors.password.message}</p>
                            )}
                        </div>

                        <Button type="submit" disabled={cargando} className="w-full">
                            {cargando ? 'Ingresando…' : 'Entrar'}
                        </Button>
                    </form>

                    <p className="mt-8 text-xs text-slate-400">
                        © {new Date().getFullYear()} {MARCA} · Acceso restringido a personal autorizado
                    </p>
                </div>
            </div>

            {/* DERECHA (blanco): presentación + logo grande. El wordmark es azul marino,
                así que sobre el fondo claro luce oficial, sin caja blanca alrededor. */}
            <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-slate-100 p-12 lg:flex">
                <div className="mx-auto w-full max-w-lg">
                    {/* El PNG del wordmark trae ~10% de margen transparente a cada lado;
                        el -ml-[10%] cancela el de la izquierda para que la "T" quede a la
                        misma vertical que la "C" del texto de abajo. */}
                    <Logo
                        className="-ml-[12%] h-auto w-[120%] max-w-none object-contain"
                        inicialClassName="font-display text-6xl font-extrabold text-navy-900"
                    />
                    <h1 className="mt-10 font-display text-4xl font-extrabold leading-tight text-navy-900">
                        Control total de tu<br />
                        <span className="text-brand-600">manufactura</span>
                    </h1>
                    <p className="mt-4 max-w-md text-slate-600">
                        Sistema de gestión de listas de materiales por equipo (BOM multinivel), inventario, proveedores y órdenes
                        de compra para equipos de manufactura y trituradoras.
                    </p>
                    <p className="mt-12 text-sm text-slate-400">Durango, México · Fabricación y exportación</p>
                </div>
            </div>
        </div>
    )
}
