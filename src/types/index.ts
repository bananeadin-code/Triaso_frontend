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
    generarReportes: boolean
}

// Permisos CRUD por módulo (matriz efectiva: paquete del rol o personalizada por usuario)
export type Operacion = 'ver' | 'crear' | 'editar' | 'eliminar'
export interface AccesoModulo {
    menu: boolean
    ver: boolean
    crear: boolean
    editar: boolean
    eliminar: boolean
}
export type MatrizAccesos = Record<Modulo, AccesoModulo>

export const MODULO_LABEL: Record<Modulo, string> = {
    equipos: 'Equipos',
    componentes: 'Componentes',
    materiales: 'Materiales',
    proveedores: 'Proveedores',
    inventario: 'Inventario',
    cotizaciones: 'Cotizaciones',
    ordenes: 'Órdenes de compra',
    historial: 'Historial',
    usuarios: 'Usuarios',
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
    operaciones?: MatrizAccesos
    personalizado?: boolean
    permisos: Permisos
}

// ===== Gestión de usuarios (módulo del admin) =====
export interface UsuarioAdmin {
    _id: string
    nombre: string
    email: string
    rol: Rol
    permisos: Permisos
    accesosPersonalizados?: boolean
    operaciones: MatrizAccesos
    activo: boolean
    createdAt: string
}

export interface RolInfo {
    clave: Rol
    nombre: string
    descripcion: string
    nav: Modulo[]
    matriz: MatrizAccesos
}

export interface NuevoUsuario {
    nombre: string
    email: string
    password: string
    rol: Rol
    permisos: Permisos
    accesosPersonalizados?: boolean
    accesos?: MatrizAccesos
}

// ===== Categorías (configurables: la empresa puede editarlas/agregarlas/quitarlas) =====
export type CategoriaId = string

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
    contacto?: string
    telefono?: string
    email?: string
    // Datos bancarios (para el pago)
    cuenta?: string
    clabe?: string
    banco?: string
    referencia?: string
    activo: boolean
    personalizados?: Record<string, unknown>
    porValidar?: boolean // creado por una importación, pendiente de revisión
}

export interface ProveedorFormData {
    codigo: string
    razonSocial: string
    rfc?: string
    direccion?: string
    contacto?: string
    telefono?: string
    email?: string
    cuenta?: string
    clabe?: string
    banco?: string
    referencia?: string
    personalizados?: Record<string, unknown>
}

// Material asociado que se muestra en el detalle del proveedor
export interface MaterialResumen {
    _id: string
    clave: string
    concepto: string
    costoUnitario: number
    costoUSD: number
    moneda?: MonedaMaterial
    monedaPrincipal?: MonedaPrincipal
    categoriaPrincipal: CategoriaId
}

// ===== Material =====
// El proveedor puede venir como id (al enviar) o poblado (al listar)
export interface ProveedorRef {
    _id: string
    codigo: string
    razonSocial: string
}

export type MonedaMaterial = 'mxn' | 'usd' | 'ambos'
export type MonedaPrincipal = 'mxn' | 'usd'

export interface Material {
    _id: string
    clave: string
    concepto: string
    categoriaPrincipal: CategoriaId
    proveedorPrincipal: ProveedorRef | null
    proveedoresAsociados: ProveedorRef[]
    moneda: MonedaMaterial
    monedaPrincipal: MonedaPrincipal
    costoUnitario: number
    costoUSD: number
    importeMXN: number
    importeUSD: number
    personalizados?: Record<string, unknown>
    activo: boolean
    porValidar?: boolean // creado por una importación, pendiente de revisión
}

export interface MaterialFormData {
    concepto: string
    categoriaPrincipal: CategoriaId
    proveedorPrincipal: string
    proveedoresAsociados: string[]
    moneda: MonedaMaterial
    monedaPrincipal: MonedaPrincipal
    costoUnitario: number
    costoUSD: number
    personalizados?: Record<string, unknown>
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
    personalizados?: Record<string, unknown>
    porValidar?: boolean // creado por una importación, pendiente de revisión
}

// ===== Equipos y BOM =====
export interface EquipoListItem {
    _id: string
    nombre: string
    tipo: string
    descripcion: string
    activo: boolean
    totalLineas: number
    personalizados?: Record<string, unknown>
    porValidar?: boolean // creado por una importación, pendiente de revisión
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
    personalizados?: Record<string, unknown>
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
    creadoPor: string
    personalizados?: Record<string, unknown>
    createdAt: string
}

export interface OrdenItem {
    _id?: string
    material?: string
    clave: string
    concepto: string
    cantidad: number
    moneda: MonedaPrincipal
    costoUnitario: number
    importe: number
    costoUnitarioUSD: number
    importeUSD: number
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
    personalizados?: Record<string, unknown>
    createdAt: string
}

export interface OrdenItemInput {
    material: string
    cantidad: number
    moneda?: MonedaPrincipal
    costoUnitario?: number
    costoUnitarioUSD?: number
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
    tipoCambio: number // tipo de cambio con que se convirtió
    paridad: string | null // registro de Paridad del que viene ese tipo de cambio
    createdAt: string
}

// Respuesta paginada del servidor (?pagina=N)
export interface Paginado<T> {
    items: T[]
    total: number
    pagina: number
    limite: number
    paginas: number
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
    // Costo REAL de esta cotización (orden ligada o catálogo). MXN y USD son independientes.
    costoRealMXN: number
    importeRealMXN: number
    costoRealUSD: number
    importeRealUSD: number
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
    items: {
        material?: string
        clave: string
        concepto: string
        cantidad: number
        moneda: MonedaPrincipal
        costoUnitario: number
        importe: number
        costoUnitarioUSD: number
        importeUSD: number
    }[]
    total: number
    totalUSD: number
}

export interface CotizacionDetalle {
    _id: string
    folio: string
    equipoNombre: string
    contexto: ContextoCot
    costoCotizacion: number
    costoManualDefinido: boolean
    totalReal: number
    totalRealUSD: number
    // Consolidado dual-moneda (con tipo de cambio) para la caja del total
    tipoCambio: number
    subtotalMXN: number
    subtotalUSD: number
    totalConsolidadoMXN: number
    totalConsolidadoUSD: number
    estado: EstadoCot
    creadoPor: string
    surtidaPor: string
    lineasTabla: CotLineaTabla[]
    ordenesSugeridas: OrdenSugerida[]
    sinProveedor: string[]
    ordenesRegistradas: { _id: string; folio: string; estado: string; presupuestoEstimado: number; proveedorSnap: { codigo: string } }[]
}

// ===== Historial de cambios (bitácora de auditoría) =====
export type SectorHistorial = 'catalogos' | 'bom' | 'compras' | 'inventario' | 'sistema'
export type AccionHistorial = 'creo' | 'edito' | 'elimino' | 'importo'
export type TipoHistorial = 'componente' | 'equipo' | 'material' | 'proveedor' | 'importacion' | 'usuario' | 'sistema'

export interface HistorialEntry {
    _id: string
    usuario: string
    tipo: TipoHistorial
    sector: SectorHistorial
    accion: AccionHistorial
    entidad: string
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

// ===== Configuración (parámetros de la empresa) =====
export interface EmpresaDatos {
    razonSocial: string
    rfc: string
    direccion: string
    telefono: string
}

// Campo personalizado (informativo) definido para un catálogo
export type ModuloCampos = 'materiales' | 'proveedores' | 'componentes' | 'equipos' | 'inventario' | 'ordenes'
export type TipoCampo = 'texto' | 'numero' | 'lista' | 'siNo' | 'fecha'
export interface CampoDef {
    id: string
    nombre: string
    tipo: TipoCampo
    opciones: string[]
    activo: boolean
}

export interface Configuracion {
    tipoCambio: number
    categorias: Categoria[]
    empresa: EmpresaDatos
    campos: Record<ModuloCampos, CampoDef[]>
    unidades: string[]
    folios: { orden: string; cotizacion: string }
    banxicoConfigurado: boolean
}

// ===== Paridad (bitácora del tipo de cambio) =====
export type OrigenParidad = 'manual' | 'api' | 'config'
export interface Paridad {
    _id: string
    valor: number
    fecha: string
    origen: OrigenParidad
    nota: string
    creadoPor: string
    cotizaciones: number // cuántas cotizaciones dependen de este registro
    createdAt: string
}

// ===== Kárdex (movimientos de inventario) =====
export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export interface MovimientoInventario {
    _id: string
    material?: string
    clave: string
    concepto: string
    tipo: TipoMovimiento
    cantidad: number
    saldoAnterior: number
    saldoNuevo: number
    documento: string
    motivo: string
    usuario: string
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
    personalizados?: Record<string, unknown>
}

// ===== Importación de BOM desde Excel (zona de revisión) =====
export type AccionComponenteImp = 'crear' | 'usarVariacion' | 'nuevaVariacion' | 'omitir'
export interface DiferenciasVariacion {
    faltan: string[]
    sobran: string[]
    cantidad: string[]
}
export interface AnalisisBOM {
    equipo: { nombre: string; descripcion: string; clave: string; existente: { id: string; nombre: string; lineas: number } | null; accion: 'crear' | 'reemplazar' | null }
    proveedores: { codigo: string; usos: number; existente: { id: string; codigo: string; razonSocial: string } | null; accion: 'crear' | 'vincular'; id?: string }[]
    materiales: {
        clave: string
        claveArchivo: string
        concepto: string
        proveedor: string
        tipo: string
        unidad: string
        pesos: number
        dolares: number
        preciosArchivo: number[]
        usos: number
        estado: 'existe' | 'nuevo'
        existente: { id: string; concepto: string; costoUnitario: number; costoUSD: number; porValidar: boolean } | null
        conceptoDistinto: boolean
        precioDistinto: boolean
        parecidos: { id: string; clave: string; concepto: string; similitud: number }[]
        accion: 'crear' | 'vincular' | 'existe'
        vinculadoA?: string
        actualizarPrecio: boolean
    }[]
    conflictos: { clave: string; variantes: { concepto: string; usos: number; precios: number[] }[]; decision: 'separar' | 'unificar' }[]
    componentes: {
        idx: number
        nombreArchivo: string
        nombre: string
        grupo: string
        materiales: number
        importe: number
        existente: {
            id: string
            concepto: string
            planeado: boolean
            variaciones: { id: string; nombre: string; coincide: boolean; diferencias: DiferenciasVariacion }[]
        } | null
        accion: AccionComponenteImp
        variacionId?: string
        nombreVariacion: string
    }[]
    unidades: { archivo: string; catalogo: string; nueva: boolean; usos: number }[]
    verificacion: { categoria: string; excel: number | null; importado: number }[]
    bloqueos: string[]
    avisos: string[]
    resumen: { secciones: number; grupos: number; renglones: number }
}
export interface DecisionesBOM {
    equipo?: { nombre?: string; descripcion?: string; accion?: 'crear' | 'reemplazar' }
    proveedores?: Record<string, { accion: 'crear' | 'vincular'; id?: string }>
    conflictos?: Record<string, 'separar' | 'unificar'>
    materiales?: Record<string, { accion?: 'crear' | 'vincular'; id?: string; actualizarPrecio?: boolean }>
    componentes?: Record<number, { nombre?: string; accion?: AccionComponenteImp; variacionId?: string; nombreVariacion?: string }>
}
export interface LoteImportacion {
    _id: string
    folio: string
    archivo: string
    equipoNombre: string
    usuario: string
    estado: 'aplicando' | 'aplicado' | 'deshecho' | 'fallido'
    resumen: string[]
    deshechoPor: string
    createdAt: string
}