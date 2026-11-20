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

// Sesión inválida (token viejo, cuenta eliminada o desactivada): se cierra y se manda al login.
// Acceso denegado (p. ej. el admin le cambió el rol): se avisa para refrescar el perfil y el menú.
export const EVENTO_ACCESO = 'triaso:acceso-cambiado'

api.interceptors.response.use(
    (r) => r,
    (error) => {
        const status = error?.response?.status
        const url: string = error?.config?.url ?? ''
        const esLogin = url.includes('/auth/login')
        const desactivado = status === 403 && error.response?.data?.error === 'Usuario desactivado'

        if (!esLogin && (status === 401 || desactivado) && localStorage.getItem('TRIASO_TOKEN')) {
            localStorage.removeItem('TRIASO_TOKEN')
            if (window.location.pathname !== '/login') window.location.assign('/login')
        } else if (status === 403) {
            window.dispatchEvent(new Event(EVENTO_ACCESO))
        }
        return Promise.reject(error)
    }
)

export default api
