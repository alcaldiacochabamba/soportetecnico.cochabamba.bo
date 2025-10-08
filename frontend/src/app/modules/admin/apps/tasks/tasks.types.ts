export interface Tag
{
    id?: string;
    title?: string;
}

export interface Task
{
    id: string;
    type: 'task' | 'section';
    title: string;
    notes: string;
    completed: boolean;
    dueDate: string | null;
    priority: 0 | 1 | 2;
    tags: string[];
    order: number;
}

export interface InventoryPagination
{
    length: number;
    size: number;
    page: number;
    lastPage: number;
    startIndex: number;
    endIndex: number;
}

export interface Servicio {
    servicios_id?: number;
    nombreResponsableEgreso: string;
    cargoSolicitante: string;
    informe: string;
    cargoResponsableEgreso: string;
    oficinaSolicitante: string;
    fechaRegistro: string;
    equipo: number;
    problema: string;
    telefonoResponsableEgreso: string;
    gestion: number;
    telefonoSolicitante: string;
    tecnicoAsignado: number;
    observaciones: string;
    tipoResponsableEgreso: string;
    estado: string;
    tipoSolicitante: string;
    fechaTerminado: string;
    oficinaResponsableEgreso: string;
    numero: number;
    fechaInicio: string;
    fechaEgreso: string | null;
    ciSolicitante: string;
    nombreSolicitante: string;
    tipo: string;
    tecnicoRegistro?: number;
    tecnicoEgreso: string | null;
    ciResponsableEgreso: string;
    tecnicoAsignadoString: string | null;
    tecnicoRegistroString?: string;
    tipoDescripcion: string | null;
    equipos_id?: number;
    codigo?: string;
}

export interface InventoryEquipment {
    equipos_id: number;
    codigo: string;
    tipo?: string;
    tipoDescripcion?: string;
    lector?: boolean;
}

// -----------------------------
// Bienes (hardware)
// -----------------------------
export interface BienCaracteristicas {
  MARCA?: string;
  MODELO?: string;
  SERIE?: string;
  PROCESADOR?: string;
  MEMORIA_RAM?: string;
  DISCO_DURO?: string;
  TARJETA_MADRE?: string;
  TARJETA_VIDEO?: string;
}

export interface Bien {
  tipo?: string;
  observacion?: string;
  unidad?: string;
  caracteristicas?: BienCaracteristicas;
}


