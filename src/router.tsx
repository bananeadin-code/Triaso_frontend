import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { useAuth } from './hooks/useAuth'
import { Spinner } from './components/ui'
import { LoginView } from './views/LoginView'
import { DashboardView } from './views/DashboardView'
import { MaterialesView } from './views/MaterialesView'
import { InventarioView } from './views/InventarioView'
import { OrdenesView } from './views/OrdenesView'
import { ProveedoresView } from './views/ProveedoresView'
import { HistorialView } from './views/HistorialView'
import { ComponentesView } from './views/ComponentesView'
import { ComponenteEditorView } from './views/ComponenteEditorView'
import { EquiposView } from './views/EquiposView'
import { EquipoBOMView } from './views/EquipoBOMView'
import { ImportarBOMView } from './views/ImportarBOMView'
import { CotizacionesView } from './views/CotizacionesView'
import { CotizacionDetalleView } from './views/CotizacionDetalleView'
import { UsuariosView } from './views/UsuariosView'
import { PerfilView } from './views/PerfilView'
import { ConfiguracionView } from './views/ConfiguracionView'
import { ParidadView } from './views/ParidadView'
import type { Modulo } from './types'

// Guarda una ruta según el módulo: si el rol no tiene acceso, redirige al panel.
function Requiere({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
    const { puede, isLoading } = useAuth()
    if (isLoading) return <Spinner label="Cargando…" />
    if (!puede(modulo)) return <Navigate to="/" replace />
    return <>{children}</>
}

// Guarda de gestión: solo admin u operador (parámetros globales de la empresa).
function RequiereGestion({ children }: { children: ReactNode }) {
    const { usuario, isLoading } = useAuth()
    if (isLoading) return <Spinner label="Cargando…" />
    if (usuario?.rol !== 'admin' && usuario?.rol !== 'operador') return <Navigate to="/" replace />
    return <>{children}</>
}

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginView />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/perfil" element={<PerfilView />} />
                        <Route path="/equipos" element={<Requiere modulo="equipos"><EquiposView /></Requiere>} />
                        <Route path="/equipos/importar" element={<Requiere modulo="equipos"><ImportarBOMView /></Requiere>} />
                        <Route path="/equipos/:id" element={<Requiere modulo="equipos"><EquipoBOMView /></Requiere>} />
                        <Route path="/cotizaciones" element={<Requiere modulo="cotizaciones"><CotizacionesView /></Requiere>} />
                        <Route path="/cotizaciones/:id" element={<Requiere modulo="cotizaciones"><CotizacionDetalleView /></Requiere>} />
                        <Route path="/componentes" element={<Requiere modulo="componentes"><ComponentesView /></Requiere>} />
                        <Route path="/componentes/:id" element={<Requiere modulo="componentes"><ComponenteEditorView /></Requiere>} />
                        <Route path="/materiales" element={<Requiere modulo="materiales"><MaterialesView /></Requiere>} />
                        <Route path="/inventario" element={<Requiere modulo="inventario"><InventarioView /></Requiere>} />
                        <Route path="/ordenes" element={<Requiere modulo="ordenes"><OrdenesView /></Requiere>} />
                        <Route path="/proveedores" element={<Requiere modulo="proveedores"><ProveedoresView /></Requiere>} />
                        <Route path="/historial" element={<Requiere modulo="historial"><HistorialView /></Requiere>} />
                        <Route path="/usuarios" element={<Requiere modulo="usuarios"><UsuariosView /></Requiere>} />
                        <Route path="/paridad" element={<RequiereGestion><ParidadView /></RequiereGestion>} />
                        <Route path="/configuracion" element={<RequiereGestion><ConfiguracionView /></RequiereGestion>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
