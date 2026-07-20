import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { HistorialEntry } from '../types'

export async function getHistorial() {
    const { data } = await api.get<HistorialEntry[]>('/historial')
    return data
}

export async function limpiarHistorial() {
    try {
        const { data } = await api.delete('/historial')
        return data
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error ?? 'Error al limpiar el historial')
        }
        throw new Error('Error al limpiar el historial')
    }
}
