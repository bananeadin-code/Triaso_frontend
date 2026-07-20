import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { logout } from '../api/AuthAPI'
import { Logo } from '../components/Logo'
import { SISTEMA } from '../config/marca'
import type { Modulo } from '../types'
import {
    IconClose,
    IconComponente,
    IconCotizacion,
    IconDashboard,
    IconEquipo,
    IconHistorial,
    IconInventario,
    IconLogout,
    IconMaterial,
    IconMenu,
    IconOrden,
    IconProveedor,
    IconUsuarios,
} from '../components/icons'
import type { ComponentType, SVGProps } from 'react'

interface NavItem {
    to: string
    label: string
    icon: ComponentType<SVGProps<SVGSVGElement>>
    modulo?: Modulo // si se define, solo aparece si el rol tiene el módulo en su nav
}

// El "Panel" siempre visible; el resto se filtra según los módulos del rol.
const NAV: NavItem[] = [
    { to: '/', label: 'Panel', icon: IconDashboard },
    { to: '/equipos', label: 'Equipos (BOM)', icon: IconEquipo, modulo: 'equipos' },
    { to: '/cotizaciones', label: 'Cotizaciones', icon: IconCotizacion, modulo: 'cotizaciones' },
    { to: '/componentes', label: 'Componentes', icon: IconComponente, modulo: 'componentes' },
    { to: '/materiales', label: 'Materiales', icon: IconMaterial, modulo: 'materiales' },
    { to: '/inventario', label: 'Inventario', icon: IconInventario, modulo: 'inventario' },
    { to: '/ordenes', label: 'Órdenes de compra', icon: IconOrden, modulo: 'ordenes' },
    { to: '/proveedores', label: 'Proveedores', icon: IconProveedor, modulo: 'proveedores' },
    { to: '/historial', label: 'Historial de cambios', icon: IconHistorial, modulo: 'historial' },
    { to: '/usuarios', label: 'Usuarios', icon: IconUsuarios, modulo: 'usuarios' },
]

export function AppLayout() {
    const { usuario } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [menuAbierto, setMenuAbierto] = useState(false)
    const [esDesktop, setEsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    )

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const handler = (e: MediaQueryListEvent) => {
            setEsDesktop(e.matches)
            if (e.matches) setMenuAbierto(false)
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const cerrarSesion = () => {
        logout()
        queryClient.clear()
        navigate('/login')
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* ---------- Overlay móvil ---------- */}
            {menuAbierto && (
                <div
                    className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden"
                    onClick={() => setMenuAbierto(false)}
                    aria-hidden
                />
            )}

            {/* ---------- Sidebar (fijo en desktop, cajón en móvil) ---------- */}
            <aside
                style={{
                    transform: esDesktop ? 'none' : menuAbierto ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.2s ease',
                }}
                className="fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col bg-navy-900 text-slate-300 lg:static"
            >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                    {/* Placa blanca: el logo es azul marino y el menú también */}
                    <div className="min-w-0 flex-1">
                        <div className="rounded-lg bg-white px-3 py-2">
                            <Logo
                                className="h-auto w-full object-contain"
                                inicialClassName="text-center font-display text-lg font-extrabold text-navy-900"
                            />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">{SISTEMA}</p>
                    </div>
                    {/* Cerrar cajón (solo móvil) */}
                    <button
                        onClick={() => setMenuAbierto(false)}
                        className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
                        aria-label="Cerrar menú"
                    >
                        <IconClose />
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {NAV.filter((item) => !item.modulo || (usuario?.nav ?? []).includes(item.modulo)).map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            onClick={() => setMenuAbierto(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-brand-600 text-white'
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <Icon />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-500">Triaso · Durango, MX</div>
            </aside>

            {/* ---------- Área principal ---------- */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
                    {/* Botón menú (solo móvil) */}
                    <button
                        onClick={() => setMenuAbierto(true)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                        aria-label="Abrir menú"
                    >
                        <IconMenu />
                    </button>

                    {usuario && (
                        <div className="ml-auto flex items-center gap-3 sm:gap-4">
                            <button
                                onClick={() => navigate('/perfil')}
                                title="Mi perfil"
                                className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-slate-100"
                            >
                                <div className="hidden text-right leading-tight sm:block">
                                    <p className="text-sm font-semibold text-slate-800">{usuario.nombre}</p>
                                    <p className="text-xs text-brand-600">{usuario.nombreRol}</p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                                    {usuario.nombre.charAt(0).toUpperCase()}
                                </div>
                            </button>
                            <button
                                onClick={cerrarSesion}
                                title="Cerrar sesión"
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                            >
                                <IconLogout />
                            </button>
                        </div>
                    )}
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
