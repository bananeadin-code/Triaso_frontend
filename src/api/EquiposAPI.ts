import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { EquipoBOM, EquipoListItem, LineaInput } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getEquipos() {
    const { data } = await api.get<EquipoListItem[]>('/equipos')
    return data
}

export async function getEquipo(id: string) {
    const { data } = await api.get<EquipoBOM>(`/equipos/${id}`)
    return data
}

export async function crearEquipo(datos: { nombre: string; tipo?: string; descripcion?: string }) {
    try {
        const { data } = await api.post('/equipos', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear el equipo')
    }
}

export async function actualizarEquipo(
    id: string,
    datos: { nombre?: string; tipo?: string; descripcion?: string; lineas?: LineaInput[] }
) {
    try {
        const { data } = await api.put(`/equipos/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al guardar el equipo')
    }
}

export async function eliminarEquipo(id: string) {
    try {
        const { data } = await api.delete(`/equipos/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar el equipo')
    }
}
