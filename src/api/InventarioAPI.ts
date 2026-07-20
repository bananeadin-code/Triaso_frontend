import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { InventarioItem } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getInventario() {
    const { data } = await api.get<InventarioItem[]>('/inventario')
    return data
}

export async function agregarInventario(datos: { material: string; cantidad: number; ubicacion?: string }) {
    try {
        const { data } = await api.post('/inventario', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al agregar al inventario')
    }
}

export async function actualizarInventario(id: string, datos: { cantidad?: number; ubicacion?: string }) {
    try {
        const { data } = await api.put(`/inventario/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar el inventario')
    }
}

export async function eliminarInventario(id: string) {
    try {
        const { data } = await api.delete(`/inventario/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al quitar del inventario')
    }
}
