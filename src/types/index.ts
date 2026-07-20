// ===== Roles, módulos y permisos =====
export type Rol = 'admin' | 'operador' | 'cotizador' | 'comprador' | 'capturista' | 'almacenista'

export type Modulo =
    | 'equipos'
    | 'componentes'
    | 'materiales'
    | 'proveedores'
    | 'inventario'
    | 'cotizaciones'
    | 'ordenes'
    | 'historial'
    | 'usuarios'

export type Nivel = 'lectura' | 'escritura' | 'total'
export type PanelTipo = 'completo' | 'cotizador' | 'comprador' | 'capturista' | 'almacenista'

export interface Permisos {
    limpiarHistoriales: boolean
    generarReportes: boolean
}

export const ROL_LABEL: Record<Rol, string> = {
    admin: 'Administrador',
    operador: 'Operador general',
    cotizador: 'Cotizador',
    comprador: 'Comprador',
    capturista: 'Capturista',
    almacenista: 'Almacenista',
}

// ===== Usuario autenticado (perfil + sus accesos) =====
export interface Usuario {
    _id: string
    nombre: string
    email: string
    rol: Rol
    activo: boolean
    nombreRol: string
    panel: PanelTipo
    nav: Modulo[]
    acceso: Partial<Record<Modulo, Nivel>>
    permisos: Permisos
}

// ===== Gestión de usuarios (módulo del admin) =====
export interface UsuarioAdmin {
    _id: string
    nombre: string
    email: string
    rol: Rol
    permisos: Permisos
    activo: boolean
    createdAt: string
}

export interface RolInfo {
    clave: Rol
    nombre: string
    descripcion: string
    nav: Modulo[]
}

export interface NuevoUsuario {
    nombre: string
    email: string
    password: string
    rol: Rol
    permisos: Permisos
}

// ===== Categorías (A-E) =====
export type CategoriaId = 'A' | 'B' | 'C' | 'D' | 'E'

export interface Categoria {
    id: CategoriaId
    nombre: string
    prefijo: string
}

// ===== Proveedor =====
export interface Proveedor {
    _id: string
    codigo: string
    razonSocial: string
    rfc?: string
    direccion?: string
    telefono?: string
    email?: string
    activo: boolean
}

export interface ProveedorFormData {
    codigo: string
    razonSocial: string
    rfc?: string
    direccion?: string
    telefono?: string
    email?: string
}

// Material asociado que se muestra en el detalle del proveedor
export interface MaterialResumen {
    _id: string
    clave: string
    concepto: string
    costoUnitario: number
    categoriaPrincipal: CategoriaId
}

// ===== Material =====
// El proveedor puede venir como id (al enviar) o poblado (al listar)
export interface ProveedorRef {
    _id: string
    codigo: string
    razonSocial: string
}

export interface Material {
    _id: string
    clave: string
    concepto: string
    categoriaPrincipal: CategoriaId
    proveedorPrincipal: ProveedorRef | null
    proveedoresAsociados: ProveedorRef[]
    costoUnitario: number
    costoUSD: number
    importeMXN: number
    importeUSD: number
    activo: boolean
}

export interface MaterialFormData {
    concepto: string
    categoriaPrincipal: CategoriaId
    proveedorPrincipal: string
    proveedoresAsociados: string[]
    costoUnitario: number
    costoUSD: number
}

// ===== Componentes (catálogo reutilizable) =====
export interface ProveedorSnap {
    proveedor?: string
    codigo: string
    razonSocial: string
}

export interface MaterialAsignado {
    _id?: string
    material?: string
    clave: string
    concepto: string
    proveedor: ProveedorSnap
    tipo: CategoriaId
    cantidad: number
    unidad: string
    costoMXN: number
    costoUSD: number
    paridad: number
    importeMXN: number
    importeUSD: number
}

export interface Variacion {
    _id?: string
    nombre: string
    materiales: MaterialAsignado[]
}

export interface Componente {
    _id: string
    concepto: string
    descripcion: string
    variaciones: Variacion[]
    activo: boolean
}

// ===== Equipos y BOM =====
export interface EquipoListItem {
    _id: string
    nombre: string
    tipo: string
    descripcion: string
    activo: boolean
    totalLineas: number
}

export interface BOMMaterial {
    clave: string
    concepto: string
    proveedor: string
    tipo: CategoriaId
    cantidad: number // efectiva (× unidades de la línea)
    cantidadUnitaria: number // por una sola unidad del componente
    unidad: string
    costoMXN: number
    costoUSD: number
    paridad: number
    importeMXN: number
    importeUSD: number
}

export interface BOMLinea {
    lineaId: string
    componenteId: string
    componente: string
    variacionId: string
    variacion: string
    cantidad: number
    materiales: BOMMaterial[]
}

export interface ResumenCategoria {
    id: CategoriaId
    nombre: string
    mxn: number
    usd: number
}

export interface EquipoBOM {
    _id: string
    nombre: string
    tipo: string
    descripcion: string
    activo: boolean
    lineas: BOMLinea[]
    resumen: {
        porCategoria: ResumenCategoria[]
        totalGeneral: { mxn: number; usd: number }
    }
}

export interface LineaInput {
    componente: string
    variacion: string
    cantidad: number
}

// ===== Órdenes de compra =====
export type EstadoOrden = 'borrador' | 'enviada' | 'confirmada' | 'cancelada'

export interface OrdenListItem {
    _id: string
    folio: string
    proveedor: string
    razonSocial: string
    estado: EstadoOrden
    totalItems: number
    presupuestoEstimado: number
    costoRealTotal: number
    correoEnviado: boolean
    folioCotizacion: string
    createdAt: string
}

export interface OrdenItem {
    _id?: string
    material?: string
    clave: string
    concepto: string
    cantidad: number
    costoUnitario: number
    importe: number
}

export interface OrdenCompra {
    _id: string
    folio: string
    proveedor: string
    proveedorSnap: {
        codigo: string
        razonSocial: string
        rfc: string
        direccion: string
        email: string
    }
    items: OrdenItem[]
    estado: EstadoOrden
    presupuestoEstimado: number
    costoRealTotal: number
    notas: string
    correoEnviado: boolean
    createdAt: string
}

export interface OrdenItemInput {
    material: string
    cantidad: number
    costoUnitario?: number
}

export interface RecItem {
    material?: string
    clave: string
    concepto: string
    cantidad: number
}

export interface Recomendacion {
    _id: string
    ordenOrigen: string
    folioOrigen: string
    proveedor: string
    proveedorSnap: { codigo: string; razonSocial: string; email: string }
    items: RecItem[]
    estado: 'pendiente' | 'finalizada' | 'eliminada'
}

// ===== Cotizaciones =====
export type ContextoCot = 'creacion' | 'reparacion'
export type EstadoCot = 'activa' | 'cancelada' | 'surtida'
export type EstadoStock = 'completo' | 'requerido' | 'faltante'

export interface CotizacionListItem {
    _id: string
    folio: string
    equipoNombre: string
    contexto: ContextoCot
    costoCotizacion: number
    estado: EstadoCot
    createdAt: string
}

export interface CotMaterialRow {
    material?: string
    clave: string
    concepto: string
    tipo: CategoriaId
    cantidad: number
    unidad: string
    costoMXN: number
    costoUSD: number
    importeMXN: number
    importeUSD: number
    stock: number
    estadoStock: EstadoStock
    faltante: number
    // Costo REAL de esta cotización (orden ligada o catálogo)
    costoRealMXN: number
    importeRealMXN: number
    fuenteCosto: 'orden' | 'catalogo'
    fuenteFolio: string
    fuenteProveedor: string
}

export interface CotLineaTabla {
    componente?: string
    componenteConcepto: string
    variacionNombre: string
    cantidad: number
    materiales: CotMaterialRow[]
}

export interface OrdenSugerida {
    proveedor: string
    codigo: string
    razonSocial: string
    email: string
    items: { material?: string; clave: string; concepto: string; cantidad: number; costoUnitario: number; importe: number }[]
    total: number
}

export interface CotizacionDetalle {
    _id: string
    folio: string
    equipoNombre: string
    contexto: ContextoCot
    costoCotizacion: number
    costoManualDefinido: boolean
    totalReal: number
    estado: EstadoCot
    lineasTabla: CotLineaTabla[]
    ordenesSugeridas: OrdenSugerida[]
    sinProveedor: string[]
    ordenesRegistradas: { _id: string; folio: string; estado: string; presupuestoEstimado: number; proveedorSnap: { codigo: string } }[]
}

// ===== Historial de cambios =====
export interface HistorialEntry {
    _id: string
    usuario: string
    tipo: 'componente' | 'equipo' | 'material'
    componente?: string
    componenteConcepto: string
    equipo?: string
    equipoNombre: string
    material?: string
    materialClave: string
    materialConcepto: string
    equiposAfectados: { equipo?: string; nombre: string }[]
    cambios: string[]
    sensible: boolean
    critico: boolean
    createdAt: string
}

// ===== Inventario (stock) =====
export interface InventarioMaterialRef {
    _id: string
    clave: string
    concepto: string
    categoriaPrincipal: CategoriaId
    costoUnitario: number
}

export interface InventarioItem {
    _id: string
    material: InventarioMaterialRef | null
    cantidad: number
    ubicacion: string
}
