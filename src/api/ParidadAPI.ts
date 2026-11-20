import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { Paridad } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getParidad() {
    const { data } = await api.get<Paridad[]>('/paridad')
    return data
}

export async function crearParidad(datos: { valor: number; fecha?: string; nota?: string }) {
    try {
        const { data } = await api.post('/paridad', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear el registro de paridad')
    }
}

export async function actualizarParidad(id: string, datos: { valor?: number; fecha?: string; nota?: string }) {
    try {
        const { data } = await api.put<{ mensaje: string; cotizacionesActualizadas: number }>(`/paridad/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar el registro de paridad')
    }
}

export async function eliminarParidad(id: string) {
    try {
        const { data } = await api.delete(`/paridad/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar el registro de paridad')
    }
}

export async function traerParidadHoy() {
    try {
        const { data } = await api.post<{ mensaje: string; valor: number }>('/paridad/traer-hoy')
        return data
    } catch (error) {
        manejarError(error, 'Error al consultar Banxico')
    }
}
