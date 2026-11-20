import { isAxiosError } from 'axios'
import api from '../lib/axios'
import type { CampoDef, Categoria, Configuracion, EmpresaDatos, ModuloCampos } from '../types'

function manejarError(error: unknown, fallback: string): never {
    if (isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error ?? fallback)
    }
    throw new Error(fallback)
}

export async function getConfiguracion() {
    const { data } = await api.get<Configuracion>('/configuracion')
    return data
}

// Campos personalizados ACTIVOS de un módulo (para su formulario y su tabla)
export async function getCamposModulo(modulo: ModuloCampos) {
    const { data } = await api.get<CampoDef[]>(`/configuracion/campos/${modulo}`)
    return data
}

export async function actualizarConfiguracion(datos: {
    tipoCambio?: number
    categorias?: Categoria[]
    empresa?: EmpresaDatos
    campos?: { modulo: ModuloCampos; lista: CampoDef[] }
    unidades?: string[]
    folios?: { orden: string; cotizacion: string }
    banxicoToken?: string
}) {
    try {
        const { data } = await api.put('/configuracion', datos)
        return data
    } catch (error) {
        manejarError(error, 'Error al actualizar la configuración')
    }
}
