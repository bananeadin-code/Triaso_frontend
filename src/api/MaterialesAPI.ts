import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { Categoria, Material, MaterialFormData } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getCategorias() {
    const { data } = await api.get<Categoria[]>('/materiales/categorias')
    return data
}

export async function getMateriales() {
    const { data } = await api.get<Material[]>('/materiales')
    return data
}

export async function getMaterial(id: string) {
    const { data } = await api.get<Material>(`/materiales/${id}`)
    return data
}

export async function crearMaterial(datos: MaterialFormData) {
    try {
        const { data } = await api.post('/materiales', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear el material')
    }
}

export async function actualizarMaterial(id: string, datos: MaterialFormData) {
    try {
        const { data } = await api.put(`/materiales/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar el material')
    }
}

export async function eliminarMaterial(id: string) {
    try {
        const { data } = await api.delete(`/materiales/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar el material')
    }
}
