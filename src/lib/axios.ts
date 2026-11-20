import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
})

// Adjunta el token JWT (si existe) en cada petición
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('TRIASO_TOKEN')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Sesión expirada / token inválido: si el backend responde 401 y creíamos estar
// autenticados, se limpia el token y se manda al login (evita que la app quede
// mostrando errores con una sesión muerta). El 403 (sin permiso de módulo) NO
// cierra sesión: eso lo manejan los guardas de ruta redirigiendo al panel.
function cerrarSesion() {
    localStorage.removeItem('TRIASO_TOKEN')
    if (!window.location.pathname.startsWith('/login')) {
        // Recarga completa: limpia también la caché de React Query
        window.location.href = '/login'
    }
}

api.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        const status = error.response?.status
        const mensaje: string = error.response?.data?.error ?? ''
        const url: string = error.config?.url ?? ''
        const esLogin = url.includes('/auth/login')
        const teniaSesion = !!localStorage.getItem('TRIASO_TOKEN')

        if (!esLogin && teniaSesion) {
            // 401: token expirado / inválido.
            // 403 "Usuario desactivado": al admin lo dieron de baja a media sesión.
            // (El resto de 403 —sin permiso de módulo— NO cierra sesión: lo manejan los guardas.)
            if (status === 401 || (status === 403 && mensaje === 'Usuario desactivado')) {
                cerrarSesion()
            }
        }
        return Promise.reject(error)
    }
)

export default api
