import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './ui'

// Protege rutas: exige token válido. Redirige a /login si no hay sesión.
export function ProtectedRoute() {
    const token = localStorage.getItem('TRIASO_TOKEN')
    const { usuario, isError, isLoading } = useAuth()
    const { pathname } = useLocation()

    if (!token) return <Navigate to="/login" replace />
    if (isLoading) return <Spinner label="Cargando sesión…" />
    if (isError) {
        localStorage.removeItem('TRIASO_TOKEN')
        return <Navigate to="/login" replace />
    }

    // Contraseña temporal (alta, restablecimiento o recuperación): primero debe cambiarla
    if (usuario?.debeCambiarPassword && pathname !== '/perfil') return <Navigate to="/perfil" replace />

    return <Outlet />
}
