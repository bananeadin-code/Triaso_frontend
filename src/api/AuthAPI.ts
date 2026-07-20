import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { Usuario } from '../types'

export interface LoginForm {
    email: string
    password: string
}

export async function login(datos: LoginForm) {
    try {
        const { data } = await api.post<{ token: string }>('/auth/login', datos)
        localStorage.setItem('TRIASO_TOKEN', data.token)
        return data
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error ?? 'Error al iniciar sesión')
        }
        throw new Error('No se pudo conectar con el servidor')
    }
}

export async function getPerfil() {
    const { data } = await api.get<Usuario>('/auth/perfil')
    return data
}

// El correo solo se envía (y solo lo acepta el servidor) cuando el usuario es admin
export async function actualizarPerfil(datos: { nombre: string; email?: string }) {
    try {
        const { data } = await api.put('/auth/perfil', datos)
        return data
    } catch (error) {
        if (isAxiosError(error) && error.response) throw new Error(error.response.data.error ?? 'Error al actualizar el perfil')
        throw new Error('No se pudo conectar con el servidor')
    }
}

export async function cambiarPassword(actual: string, nueva: string) {
    try {
        const { data } = await api.put('/auth/perfil/password', { actual, nueva })
        return data
    } catch (error) {
        if (isAxiosError(error) && error.response) throw new Error(error.response.data.error ?? 'Error al cambiar la contraseña')
        throw new Error('No se pudo conectar con el servidor')
    }
}

export function logout() {
    localStorage.removeItem('TRIASO_TOKEN')
}
