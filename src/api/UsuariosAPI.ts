import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { NuevoUsuario, Permisos, Rol, RolInfo, UsuarioAdmin } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getUsuarios() {
    const { data } = await api.get<{ usuarios: UsuarioAdmin[]; roles: RolInfo[] }>('/usuarios')
    return data
}

export async function crearUsuario(datos: NuevoUsuario) {
    try {
        const { data } = await api.post<{ mensaje: string; id: string }>('/usuarios', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear el usuario')
    }
}

export async function actualizarUsuario(id: string, datos: { rol?: Rol; permisos?: Permisos; activo?: boolean }) {
    try {
        const { data } = await api.put(`/usuarios/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar el usuario')
    }
}

export async function eliminarUsuario(id: string) {
    try {
        const { data } = await api.delete<{ mensaje: string }>(`/usuarios/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar el usuario')
    }
}
