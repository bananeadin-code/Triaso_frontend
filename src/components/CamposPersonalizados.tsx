// Campos personalizados (INFORMATIVOS) que la empresa define en Configuración para cada catálogo.
// Piezas compartidas por todos los módulos: hook para leerlos, sección de formulario,
// formato de valores y celdas para tablas.
import { useQuery } from '@tanstack/react-query'
import { getCamposModulo } from '../api/ConfiguracionAPI'
import { Field, Input, Select } from './ui'
import type { CampoDef, ModuloCampos } from '../types'

export const MODULOS_CAMPOS: { key: ModuloCampos; label: string; ejemplo: string }[] = [
    { key: 'materiales', label: 'Materiales', ejemplo: 'Norma, aleación, observaciones' },
    { key: 'proveedores', label: 'Proveedores', ejemplo: 'Días de crédito, giro, certificaciones' },
    { key: 'componentes', label: 'Componentes', ejemplo: 'Plano / número de dibujo, revisión' },
    { key: 'equipos', label: 'Equipos', ejemplo: 'Modelo comercial, capacidad, cliente habitual' },
    { key: 'inventario', label: 'Inventario', ejemplo: 'Lote, fecha de caducidad, estado físico' },
    { key: 'ordenes', label: 'Órdenes de compra', ejemplo: 'Proyecto, centro de costo, fecha requerida' },
]

// Campos ACTIVOS de un módulo. Comparte caché con todas las vistas de ese módulo.
export function useCamposModulo(modulo: ModuloCampos) {
    const q = useQuery({ queryKey: ['campos', modulo], queryFn: () => getCamposModulo(modulo), staleTime: 60_000 })
    return { campos: q.data ?? [], cargando: q.isLoading }
}

// Valor listo para mostrar en tablas / detalle
export function valorCampo(campo: CampoDef, valor: unknown): string {
    if (valor === undefined || valor === null || valor === '') return '—'
    if (campo.tipo === 'siNo') return valor ? 'Sí' : 'No'
    if (campo.tipo === 'fecha') {
        const d = new Date(`${String(valor)}T00:00:00`)
        return isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    if (campo.tipo === 'numero') return Number(valor).toLocaleString('es-MX')
    return String(valor)
}

// ¿Dos juegos de valores son equivalentes? (un campo vaciado cuenta igual que uno sin capturar)
export function mismosDatos(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const limpio = (o: Record<string, unknown>) =>
        Object.fromEntries(
            Object.entries(o)
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => [k, String(v)])
                .sort(([x], [y]) => x.localeCompare(y))
        )
    return JSON.stringify(limpio(a)) === JSON.stringify(limpio(b))
}

// Sección "Datos adicionales" de un formulario. No pinta nada si el módulo no tiene campos.
export function CamposPersonalizadosForm({
    campos,
    valores,
    onChange,
    disabled,
    columnas = 2,
}: {
    campos: CampoDef[]
    valores: Record<string, unknown>
    onChange: (v: Record<string, unknown>) => void
    disabled?: boolean
    columnas?: 1 | 2 | 3
}) {
    if (campos.length === 0) return null
    const set = (id: string, v: unknown) => onChange({ ...valores, [id]: v })
    const grid = columnas === 3 ? 'sm:grid-cols-3' : columnas === 2 ? 'sm:grid-cols-2' : ''
    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Datos adicionales</p>
            <div className={`grid grid-cols-1 gap-4 ${grid}`}>
                {campos.map((c) => {
                    const val = valores[c.id]
                    return (
                        <Field key={c.id} label={c.nombre}>
                            {c.tipo === 'lista' ? (
                                <Select value={val === undefined ? '' : String(val)} onChange={(e) => set(c.id, e.target.value)} disabled={disabled}>
                                    <option value="">—</option>
                                    {c.opciones.map((o) => (
                                        <option key={o} value={o}>
                                            {o}
                                        </option>
                                    ))}
                                    {/* Valor guardado con una opción que ya se renombró/quitó: se conserva */}
                                    {val !== undefined && val !== '' && !c.opciones.includes(String(val)) && (
                                        <option value={String(val)}>{String(val)} (ya no está en la lista)</option>
                                    )}
                                </Select>
                            ) : c.tipo === 'siNo' ? (
                                <Select
                                    value={val === true ? 'si' : val === false ? 'no' : ''}
                                    onChange={(e) => set(c.id, e.target.value === '' ? undefined : e.target.value === 'si')}
                                    disabled={disabled}
                                >
                                    <option value="">—</option>
                                    <option value="si">Sí</option>
                                    <option value="no">No</option>
                                </Select>
                            ) : (
                                <Input
                                    type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
                                    step={c.tipo === 'numero' ? 'any' : undefined}
                                    maxLength={c.tipo === 'texto' ? 500 : undefined}
                                    value={val === undefined || val === null ? '' : String(val)}
                                    onChange={(e) => set(c.id, e.target.value)}
                                    disabled={disabled}
                                />
                            )}
                        </Field>
                    )
                })}
            </div>
        </div>
    )
}

// Encabezados y celdas de tabla (una columna por campo activo)
export function ThCampos({ campos, className = 'px-4 py-3' }: { campos: CampoDef[]; className?: string }) {
    return (
        <>
            {campos.map((c) => (
                <th key={c.id} className={className}>
                    {c.nombre}
                </th>
            ))}
        </>
    )
}

export function TdCampos({
    campos,
    valores,
    className = 'px-4 py-3 text-slate-600',
}: {
    campos: CampoDef[]
    valores?: Record<string, unknown>
    className?: string
}) {
    return (
        <>
            {campos.map((c) => (
                <td key={c.id} className={className}>
                    {valorCampo(c, valores?.[c.id])}
                </td>
            ))}
        </>
    )
}
