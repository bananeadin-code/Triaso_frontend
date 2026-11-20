// Opciones para <SelectBuscable> con el mismo formato en todo el sistema.
import type { OpcionBuscable } from '../components/SelectBuscable'

type MaterialOpcion = { _id: string; clave: string; concepto: string; proveedorPrincipal?: { codigo?: string } | null }
type ProveedorOpcion = { _id: string; codigo: string; razonSocial: string; rfc?: string }

// "PA0001 · Placa de acero" — se busca también por el código del proveedor principal
export const opcionesMaterial = (lista: MaterialOpcion[]): OpcionBuscable[] =>
    lista.map((m) => ({ value: m._id, label: `${m.clave} · ${m.concepto}`, detalle: m.proveedorPrincipal?.codigo || undefined }))

// "ACEROS · Aceros del Norte SA" — se busca también por RFC
export const opcionesProveedor = (lista: ProveedorOpcion[]): OpcionBuscable[] =>
    lista.map((p) => ({ value: p._id, label: `${p.codigo} · ${p.razonSocial}`, detalle: p.rfc || undefined }))
