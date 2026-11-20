import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { MaterialResumen, Proveedor, ProveedorFormData } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getProveedores() {
    const { data } = await api.get<Proveedor[]>('/proveedores')
    return data
}

export async function getProveedor(id: string) {
    const { data } = await api.get<{ proveedor: Proveedor; materiales: MaterialResumen[] }>(`/proveedores/${id}`)
    return data
}

export async function crearProveedor(datos: ProveedorFormData) {
    try {
        const { data } = await api.post('/proveedores', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear el proveedor')
    }
}

export async function actualizarProveedor(id: string, datos: ProveedorFormData) {
    try {
        const { data } = await api.put(`/proveedores/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar el proveedor')
    }
}

export async function eliminarProveedor(id: string) {
    try {
        const { data } = await api.delete(`/proveedores/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar el proveedor')
    }
}

export interface ResultadoImport {
    mensaje: string
    creados: number
    actualizados: number
    omitidos: { fila: number; codigo: string; motivo: string }[]
}

export async function importarProveedores(proveedores: ProveedorFormData[]) {
    try {
        const { data } = await api.post<ResultadoImport>('/proveedores/importar', { proveedores })
        return data
    } catch (error) {
        manejarError(error, 'Error al importar proveedores')
    }
}
