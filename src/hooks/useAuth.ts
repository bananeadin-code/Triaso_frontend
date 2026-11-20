import { useQuery } from '@tanstack/react-query'
import { getPerfil } from '../api/AuthAPI'
import type { Modulo, Nivel, Operacion } from '../types'

const NIVEL_VAL: Record<Nivel, number> = { lectura: 1, escritura: 2, total: 3 }

export function useAuth() {
    const { data, isError, isLoading } = useQuery({
        queryKey: ['usuario'],
        queryFn: getPerfil,
        retry: 1,
        // Si el admin cambia el rol/permisos, se refleja al volver a la pestaña
        refetchOnWindowFocus: true,
    })

    // ¿El usuario puede hacer `x` en `modulo`?
    //  - Operación CRUD ('ver'|'crear'|'editar'|'eliminar'): según su matriz efectiva (rol o personalizada).
    //  - Nivel heredado: 'lectura' → ver · 'escritura' → crear o editar · 'total' → eliminar.
    const puede = (modulo: Modulo, x: Nivel | Operacion = 'lectura') => {
        const ops = data?.operaciones?.[modulo]
        if (ops) {
            switch (x) {
                case 'lectura':
                    return ops.ver
                case 'escritura':
                    return ops.crear || ops.editar
                case 'total':
                    return ops.eliminar
                default:
                    return ops[x]
            }
        }
        // Respaldo (perfil sin matriz): nivel por módulo
        const asignado = data?.acceso?.[modulo]
        if (!asignado) return false
        const nivel: Nivel = x === 'ver' ? 'lectura' : x === 'eliminar' ? 'total' : x === 'crear' || x === 'editar' ? 'escritura' : x
        return NIVEL_VAL[asignado] >= NIVEL_VAL[nivel]
    }

    return { usuario: data, isError, isLoading, puede }
}
