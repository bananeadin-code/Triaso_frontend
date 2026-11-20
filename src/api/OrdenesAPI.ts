import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { OrdenCompra, OrdenItemInput, OrdenListItem, Paginado, Recomendacion } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

// Lista completa (panel de inicio)
export async function getOrdenes() {
    const { data } = await api.get<OrdenListItem[]>('/ordenes')
    return data
}

// Página de órdenes con filtros (el servidor filtra y pagina)
export async function getOrdenesPagina(pagina: number, limite: number, filtros: { q?: string; estado?: string }) {
    const params = Object.fromEntries(Object.entries({ ...filtros, pagina, limite }).filter(([, v]) => v !== undefined && v !== ''))
    const { data } = await api.get<Paginado<OrdenListItem>>('/ordenes', { params })
    return data
}

export async function getOrden(id: string) {
    const { data } = await api.get<OrdenCompra>(`/ordenes/${id}`)
    return data
}

export async function crearOrden(datos: {
    proveedor: string
    items: OrdenItemInput[]
    presupuestoEstimado?: number
    notas?: string
    materialesGlobal?: string[]
    personalizados?: Record<string, unknown>
}) {
    try {
        const { data } = await api.post('/ordenes', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear la orden')
    }
}

export async function actualizarOrden(
    id: string,
    datos: { items?: OrdenItemInput[]; presupuestoEstimado?: number; notas?: string; materialesGlobal?: string[]; personalizados?: Record<string, unknown> }
) {
    try {
        const { data } = await api.put(`/ordenes/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar la orden')
    }
}

export async function eliminarOrden(id: string) {
    try {
        const { data } = await api.delete(`/ordenes/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al eliminar la orden')
    }
}

export async function cancelarOrden(id: string, motivo?: string) {
    try {
        const { data } = await api.put<{ mensaje: string }>(`/ordenes/${id}/cancelar`, { motivo })
        return data
    } catch (error) {
        manejarError(error, 'Error al cancelar la orden')
    }
}

export async function marcarEnviada(id: string, enviarCorreo: boolean) {
    try {
        const { data } = await api.put<{ mensaje: string; correo: string }>(`/ordenes/${id}/enviar`, {
            enviarCorreo,
        })
        return data
    } catch (error) {
        manejarError(error, 'Error al enviar la orden')
    }
}

export async function registrarFaltantes(id: string, faltantes: { material: string; cantidad: number }[]) {
    try {
        const { data } = await api.put<{
            mensaje: string
            recomendacionesGeneradas: number
            sinAlternativa: string[]
            nuevoTotal: number
        }>(`/ordenes/${id}/faltantes`, { faltantes })
        return data
    } catch (error) {
        manejarError(error, 'Error al registrar faltantes')
    }
}

export async function confirmarRecepcion(
    id: string,
    datos: { items: { material: string; cantidad: number }[]; costoRealTotal: number }
) {
    try {
        const { data } = await api.put<{ mensaje: string; costoRealTotal: number; materialesEnStock: number }>(
            `/ordenes/${id}/confirmar`,
            datos
        )
        return data
    } catch (error) {
        manejarError(error, 'Error al confirmar la recepción')
    }
}

export async function getRecomendaciones() {
    const { data } = await api.get<Recomendacion[]>('/recomendaciones')
    return data
}

export async function finalizarRecomendacion(id: string) {
    try {
        const { data } = await api.post<{ mensaje: string; folio: string }>(`/recomendaciones/${id}/finalizar`)
        return data
    } catch (error) {
        manejarError(error, 'Error al finalizar la recomendación')
    }
}

export async function eliminarRecomendacion(id: string) {
    try {
        const { data } = await api.delete(`/recomendaciones/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al descartar la recomendación')
    }
}

// Descarga el PDF (con el token vía interceptor) y dispara la descarga en el navegador.
export async function descargarOrdenPDF(id: string, folio: string) {
    try {
        const res = await api.get(`/ordenes/${id}/pdf`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(res.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${folio}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
    } catch (error) {
        manejarError(error, 'Error al descargar el PDF')
    }
}
