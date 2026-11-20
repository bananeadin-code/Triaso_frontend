import api from '../lib/axios'
import type { MovimientoInventario, TipoMovimiento } from '../types'

export async function getMovimientos(filtros?: { material?: string; tipo?: TipoMovimiento }) {
    const params = new URLSearchParams()
    if (filtros?.material) params.set('material', filtros.material)
    if (filtros?.tipo) params.set('tipo', filtros.tipo)
    const qs = params.toString()
    const { data } = await api.get<MovimientoInventario[]>(`/movimientos${qs ? `?${qs}` : ''}`)
    return data
}
