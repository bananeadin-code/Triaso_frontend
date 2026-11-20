import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { Componente, Variacion } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getComponentes() {
    const { data } = await api.get<Componente[]>('/componentes')
    return data
}

export async function getComponente(id: string) {
    const { data } = await api.get<Componente>(`/componentes/${id}`)
    return data
}

export async function crearComponente(datos: { concepto: string; descripcion?: string; personalizados?: Record<string, unknown> }) {
    try {
        const { data } = await api.post('/componentes', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear el componente')
    }
}

export async function actualizarComponente(
    id: string,
    datos: { concepto?: string; descripcion?: string; variaciones?: Variacion[]; personalizados?: Record<string, unknown> }
) {
    try {
        const { data } = await api.put(`/componentes/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al guardar el componente')
    }
}

export async function eliminarComponente(id: string) {
    try {
        const { data } = await api.delete(`/componentes/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar el componente')
    }
}
