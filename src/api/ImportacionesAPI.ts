import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { ArchivoBOM } from '../lib/importarBOM'
import type { AnalisisBOM, DecisionesBOM, LoteImportacion } from '../types'

export class ErrorImportacion extends Error {
    bloqueos: string[]
    constructor(mensaje: string, bloqueos: string[] = []) {
        super(mensaje)
        this.bloqueos = bloqueos
    }
}

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new ErrorImportacion(error.response.data.error ?? fallback, error.response.data.bloqueos ?? [])
    }
    throw new ErrorImportacion('No se pudo conectar con el servidor')
}

// Concilia el archivo contra los catálogos SIN escribir nada
export async function analizarBOM(archivo: ArchivoBOM, decisiones: DecisionesBOM) {
    try {
        const { data } = await api.post<AnalisisBOM>('/importaciones/bom/analizar', { archivo, decisiones })
        return data
    } catch (error) {
        manejarError(error, 'Error al analizar el archivo')
    }
}

export async function aplicarBOM(archivo: ArchivoBOM, decisiones: DecisionesBOM) {
    try {
        const { data } = await api.post<{ mensaje: string; folio: string; id: string; equipoId: string; resumen: string[] }>(
            '/importaciones/bom/aplicar',
            { archivo, decisiones }
        )
        return data
    } catch (error) {
        manejarError(error, 'Error al aplicar la importación')
    }
}

export async function getLotes() {
    const { data } = await api.get<LoteImportacion[]>('/importaciones')
    return data
}

export async function revisarDeshacer(id: string) {
    const { data } = await api.get<{ bloqueos: string[] }>(`/importaciones/${id}/deshacer`)
    return data
}

export async function deshacerLote(id: string) {
    try {
        const { data } = await api.post<{ mensaje: string }>(`/importaciones/${id}/deshacer`)
        return data
    } catch (error) {
        manejarError(error, 'Error al deshacer la importación')
    }
}

// Marca registros "por validar" (creados por una importación) como revisados
export async function validarRegistros(modulo: 'materiales' | 'proveedores' | 'componentes' | 'equipos', ids: string[]) {
    try {
        const { data } = await api.post<{ mensaje: string; validados: number }>('/importaciones/validar', { modulo, ids })
        return data
    } catch (error) {
        manejarError(error, 'Error al validar')
    }
}
