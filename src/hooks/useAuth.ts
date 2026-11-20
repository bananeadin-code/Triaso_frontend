import { useQuery } from '@tanstack/react-query'
import { getPerfil } from '../api/AuthAPI'
import type { Modulo, Nivel } from '../types'

const NIVEL_VAL: Record<Nivel, number> = { lectura: 1, escritura: 2, total: 3 }

export function useAuth() {
    const { data, isError, isLoading } = useQuery({
        queryKey: ['usuario'],
        queryFn: getPerfil,
        retry: 1,
        // Si el admin cambia el rol/permisos, se refleja al volver a la pestaña
        refetchOnWindowFocus: true,
    })

    // ¿El usuario alcanza al menos `nivel` en `modulo`?
    const puede = (modulo: Modulo, nivel: Nivel = 'lectura') => {
        const asignado = data?.acceso?.[modulo]
        if (!asignado) return false
        return NIVEL_VAL[asignado] >= NIVEL_VAL[nivel]
    }

    return { usuario: data, isError, isLoading, puede }
}
