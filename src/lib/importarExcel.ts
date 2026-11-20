import * as XLSX from 'xlsx'
import type { ProveedorFormData } from '../types'

// ===== Lectura tolerante de Excel (.xlsx / .xls) para importaciones =====
// Filosofía: mapear por NOMBRE de columna con sinónimos, detectar la fila de
// encabezados aunque haya título arriba, y nunca romperse por columnas de más.

export type FilaProveedor = ProveedorFormData

// Encabezado (normalizado) → campo del proveedor
const MAPA_PROVEEDOR: Record<string, keyof FilaProveedor> = {
    proveedor: 'codigo',
    codigo: 'codigo',
    código: 'codigo',
    clave: 'codigo',
    beneficiario: 'razonSocial',
    'razon social': 'razonSocial',
    'razón social': 'razonSocial',
    'razon social / beneficiario': 'razonSocial',
    nombre: 'razonSocial',
    rfc: 'rfc',
    direccion: 'direccion',
    dirección: 'direccion',
    domicilio: 'direccion',
    contacto: 'contacto',
    telefono: 'telefono',
    teléfono: 'telefono',
    tel: 'telefono',
    celular: 'telefono',
    correo: 'email',
    email: 'email',
    'e-mail': 'email',
    'correo electronico': 'email',
    'correo electrónico': 'email',
    cuenta: 'cuenta',
    'no. cuenta': 'cuenta',
    'numero de cuenta': 'cuenta',
    'número de cuenta': 'cuenta',
    clabe: 'clabe',
    'clabe interbancaria': 'clabe',
    banco: 'banco',
    ref: 'referencia',
    referencia: 'referencia',
    'referencia de pago': 'referencia',
}

const norm = (s: unknown) =>
    String(s ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')

async function leerFilas(file: File): Promise<unknown[][]> {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) throw new Error('El archivo no tiene ninguna hoja')
    return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' })
}

// Encuentra la fila de encabezados (la que trae al menos 2 columnas conocidas)
function localizarEncabezados(rows: unknown[][], mapa: Record<string, string>) {
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
        const conocidas = (rows[r] ?? []).filter((c) => mapa[norm(c)]).length
        if (conocidas >= 2) return r
    }
    return -1
}

export interface ResultadoLectura {
    filas: FilaProveedor[]
    columnasDetectadas: string[]
    totalFilas: number
}

export async function leerProveedoresDeExcel(file: File): Promise<ResultadoLectura> {
    const rows = await leerFilas(file)
    const hIdx = localizarEncabezados(rows, MAPA_PROVEEDOR)
    if (hIdx === -1) {
        throw new Error('No se reconocieron los encabezados (Proveedor, Beneficiario, RFC, Banco…). Revisa que el Excel los tenga.')
    }
    const headerRow = rows[hIdx] ?? []
    const colCampo = new Map<number, keyof FilaProveedor>()
    const columnasDetectadas: string[] = []
    headerRow.forEach((h, c) => {
        const campo = MAPA_PROVEEDOR[norm(h)]
        if (campo) {
            colCampo.set(c, campo)
            columnasDetectadas.push(String(h).trim())
        }
    })

    const filas: FilaProveedor[] = []
    let totalFilas = 0
    for (let r = hIdx + 1; r < rows.length; r++) {
        const row = rows[r] ?? []
        const obj = {} as Record<string, string>
        let algo = false
        colCampo.forEach((campo, c) => {
            const v = String(row[c] ?? '').trim()
            if (v) {
                obj[campo] = v
                algo = true
            }
        })
        if (!algo) continue
        totalFilas++
        filas.push(obj as unknown as FilaProveedor)
    }
    return { filas, columnasDetectadas, totalFilas }
}
