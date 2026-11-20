import api from '../lib/axios'
import type { HistorialEntry, SectorHistorial } from '../types'

export async function getHistorial(sector?: SectorHistorial) {
    const { data } = await api.get<HistorialEntry[]>(`/historial${sector ? `?sector=${sector}` : ''}`)
    return data
}
