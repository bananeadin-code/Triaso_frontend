import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { CotizacionDetalle, CotizacionListItem, LineaInput, Paginado } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

// Lista completa (panel de inicio)
export async function getCotizaciones() {
    const { data } = await api.get<CotizacionListItem[]>('/cotizaciones')
    return data
}

export interface FiltrosCotizacion {
    q?: string
    estado?: string
    contexto?: string
    paridad?: string // id del registro de Paridad
    tcMin?: string
    tcMax?: string
    desde?: string // AAAA-MM-DD
    hasta?: string
}

// Página de cotizaciones con filtros (el servidor filtra y pagina)
export async function getCotizacionesPagina(pagina: number, limite: number, filtros: FiltrosCotizacion) {
    const params = Object.fromEntries(Object.entries({ ...filtros, pagina, limite }).filter(([, v]) => v !== undefined && v !== ''))
    const { data } = await api.get<Paginado<CotizacionListItem>>('/cotizaciones', { params })
    return data
}

export async function getCotizacionDetalle(id: string) {
    const { data } = await api.get<CotizacionDetalle>(`/cotizaciones/${id}`)
    return data
}

export async function crearCotizacion(datos: { equipo: string; contexto: string; lineas?: LineaInput[] }) {
    try {
        const { data } = await api.post<{ mensaje: string; id: string; folio: string }>('/cotizaciones', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al crear la cotización')
    }
}

export async function registrarOrdenesCot(id: string, proveedor?: string, presupuestoEstimado?: number) {
    try {
        const { data } = await api.post<{ mensaje: string; ordenes: string[] }>(`/cotizaciones/${id}/ordenes`, {
            proveedor,
            presupuestoEstimado,
        })
        return data
    } catch (error) {
        manejarError(error, 'Error al registrar las órdenes')
    }
}

export async function declararSalida(id: string) {
    try {
        const { data } = await api.post<{ mensaje: string; materialesDescontados: number }>(
            `/cotizaciones/${id}/salida`
        )
        return data
    } catch (error) {
        manejarError(error, 'Error al declarar la salida')
    }
}

export async function actualizarCotizacion(
    id: string,
    datos: { costoCotizacion?: number; usarCalculado?: boolean; tipoCambio?: number }
) {
    try {
        const { data } = await api.put(`/cotizaciones/${id}`, datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar la cotización')
    }
}

export async function actualizarCostoMaterialCot(
    id: string,
    material: string,
    costos: { costoMXN?: number; costoUSD?: number }
) {
    try {
        const { data } = await api.put(`/cotizaciones/${id}/costo-material`, { material, ...costos })
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar el costo del material')
    }
}

export async function cancelarCotizacion(id: string) {
    try {
        const { data } = await api.delete<{ mensaje: string; ordenesEliminadas: number }>(`/cotizaciones/${id}`)
        return data
    } catch (error) {
        manejarError(error, 'Error al cancelar la cotización')
    }
}
