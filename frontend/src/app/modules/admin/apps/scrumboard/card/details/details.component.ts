import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'; 
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { Card, TipoServicio, Equipo } from '../../scrumboard.models';
import { ScrumboardService } from '../../scrumboard.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, Subject, takeUntil, delay } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmationDialogComponent } from '../../dialogs/confirmation-dialog.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';


export const MY_DATE_FORMATS = {
    parse: {
        dateInput: 'DD/MM/YYYY',
    },
    display: {
        dateInput: 'DD/MM/YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthDayA11yLabel: 'DD MMMM',
    },
};
// VALIDACION FECHA DE INICIO Y FECHA TERMINADO 
export const fechasValidator: ValidatorFn = (formGroup: AbstractControl): ValidationErrors | null => {
  const fechaInicioCtrl = formGroup.get('fechaInicio');
  const fechaTerminadoCtrl = formGroup.get('fechaTerminado');

  if (fechaInicioCtrl && fechaTerminadoCtrl) {
    const fechaInicio = fechaInicioCtrl.value;
    const fechaTerminado = fechaTerminadoCtrl.value;

    if (fechaInicio && fechaTerminado && new Date(fechaTerminado) < new Date(fechaInicio)) {
      fechaTerminadoCtrl.setErrors({ fechaInvalida: true }); // 👈 error va directo al control
      return { fechaInvalida: true };
    } else {
      // 👌 limpiar errores si ya es válido
      if (fechaTerminadoCtrl.hasError('fechaInvalida')) {
        fechaTerminadoCtrl.setErrors(null);
      }
    }
  }
  return null;
};


@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
    override getFirstDayOfWeek(): number {
        return 1; // Lunes como primer día de la semana
    }

    override getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
        return style === 'long' 
            ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
            : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    }

    override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
        return style === 'long'
            ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
            : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    }
}

// Agregar la interfaz para jsPDF con autoTable
interface jsPDFWithPlugin extends jsPDF {
    autoTable: (options: any) => jsPDF;
    internal: any;
}

@Component({
    selector: 'scrumboard-card-details',
    templateUrl: './details.component.html',
    standalone: true,
    imports: [
        NgIf,
        NgFor,
        DatePipe,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDialogModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        ReactiveFormsModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatAutocompleteModule,
        MatCardModule
    ],
    providers: [
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'es-BO' },
        { provide: DateAdapter, useClass: CustomDateAdapter }
    ]
})
export class ScrumboardCardDetailsComponent implements OnInit, OnDestroy {
    /** control del guardado explícito */
    private _savingPromise: Promise<void> | null = null;
    cardForm: FormGroup;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    tecnicoRegistroNombre: string = '';
    tiposServicio = Object.values(TipoServicio);
    actualizando = false;
    searchEquipoCtrl = new FormControl<string | Equipo | null>('');
    filteredEquipos: Equipo[] = [];
    bienes: any = null;
    isOptionSelected = false;
    filtredEquipos: { equipos_id: number; codigo: string }[] = [];
    showTecnicosDropdown = false;
    filteredTecnicos: any[] = [];
    tecnicos: any[] = [];
    searchTerm: string = '';
    canSelectTecnico: boolean = true;
    showEquiposDropdown = false;
    loading = false;
    empleadosCargados: any[] = [];
    empleadosCargadosCI: any[] = [];
    filteredEmpleados: any[] = [];
    filteredEmpleadosCI: any[] = [];
    showTecnicosEgresoDropdown = false;
    filteredTecnicosEgreso: any[] = [];
    responsablesCargados: any[] = [];
    responsablesCargadosCI: any[] = [];
    filteredResponsablesEgreso: any[] = [];
    filteredResponsablesEgresoCI: any[] = [];

    @ViewChild('searchInput') searchInput: ElementRef;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { card: Card; isNew: boolean },
        private dialogRef: MatDialogRef<ScrumboardCardDetailsComponent>,
        private _formBuilder: FormBuilder,
        private _scrumboardService: ScrumboardService,
        private _snackBar: MatSnackBar,
        private _dialog: MatDialog,
        private _changeDetectorRef: ChangeDetectorRef
    ) {
        // Cargar técnicos al inicializar
        this._scrumboardService.getTecnicos()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (response) => {
                    // Filtrar la opción "TODOS" del array de técnicos
                    this.tecnicos = response.filter(t => t.id !== 'TODOS');
                    this.filteredTecnicos = this.tecnicos;
                    
                    // Obtener datos del usuario del localStorage
                    const token = localStorage.getItem('accessToken');
                    if (token) {
                        const tokenParts = token.split('.');
                        const payload = JSON.parse(atob(tokenParts[1]));
                        
                        // Establecer permisos según el rol
                        if (payload.role === '3') {
                            this.canSelectTecnico = false;
                        } else if (payload.role === '2') {
                            this.canSelectTecnico = true;
                            // Filtrar técnicos activos solo para rol 2
                            this.tecnicos = this.tecnicos.filter(t => t.estado === 1);
                            this.filteredTecnicos = this.tecnicos;
                        } else if (payload.role === '1') {
                            this.canSelectTecnico = true;
                        }

                        // Si hay un técnico asignado, mostrar su nombre
                        if (this.data.card?.tecnicoAsignado) {
                            const tecnicoAsignado = this.tecnicos.find(t => t.id === this.data.card.tecnicoAsignado);
                            if (tecnicoAsignado) {
                                this.cardForm.patchValue({
                                    tecnicoAsignado: tecnicoAsignado.id
                                });
                            }
                        }
                    }
                    
                    this._changeDetectorRef.detectChanges();
                },
                error: (error) => {
                    console.error('Error al cargar técnicos:', error);
                    this.tecnicos = [];
                    this._changeDetectorRef.detectChanges();
                }
            });
    }

    ngOnInit(): void {
        // Inicializar el formulario sin validadores inicialmente
                    this.cardForm = this._formBuilder.group({
            solicitante: [''],
            carnet: [''],
            cargoSolicitante: [''],
            tipoSolicitante: [''],
            oficina: [''],
            telefono: [''],
            tipoServicio: [''],
            estado: ['SIN ASIGNAR'],
            tecnicoRegistro: [''],
            fechaRegistro: [null],
            fechaInicio: [null],
            fechaTerminado: [null],
            problema: [''],
            observaciones: [''],
            informe: [''],
            equipo: [''],
            tipoHardware: [''],
            nombreResponsableEgreso: [''],
            cargoResponsableEgreso: [''],
            telefonoResponsableEgreso: [''],
            gestion: [3],
            tecnicoAsignado: [3],
            tipoResponsableEgreso: [''],
            oficinaResponsableEgreso: [''],
            numero: [464],
            fechaEgreso: [''],
            tecnicoEgreso: [''],
            ciResponsableEgreso: ['']
            }, { validators: fechasValidator });  // aquí aplicamos el validador


        // Si no es nuevo, cargar los datos de la tarjeta
        if (!this.data.isNew && this.data.card) {
            console.log('Cargando datos de la tarjeta:', this.data.card);
            
            // Primero cargar los datos básicos
            this.cardForm.patchValue({
                solicitante: this.data.card.nombreSolicitante || '',
                carnet: this.data.card.carnet || '',
                cargoSolicitante: this.data.card.cargo || '',
                tipoSolicitante: this.data.card.tipoSolicitante || '',
                oficina: this.data.card.oficinaSolicitante || '',
                telefono: this.data.card.telefonoSolicitante || '',
                tipoServicio: this.data.card.tipo || '',
                estado: this.data.card.estado || 'SIN ASIGNAR',
                tecnicoRegistro: this.data.card.tecnicoRegistro ,
                fechaRegistro: this.data.card.fechaRegistro || new Date().toISOString(),
                fechaInicio: this.data.card.fechaInicio || null,
                fechaTerminado: this.data.card.fechaTerminado || null,
                problema: this.data.card.problema || '',
                observaciones: this.data.card.observacionesProblema || '',
                informe: this.data.card.informe || '',
                equipo: this.data.card.codigoBienes || '',
                tecnicoAsignado: this.data.card.tecnicoAsignado,
                nombreResponsableEgreso: this.data.card.nombreResponsableEgreso || '',
                cargoResponsableEgreso: this.data.card.cargoResponsableEgreso || '',
                telefonoResponsableEgreso: this.data.card.telefonoResponsableEgreso || '',
                tipoResponsableEgreso: this.data.card.tipoResponsableEgreso || '',
                oficinaResponsableEgreso: this.data.card.oficinaResponsableEgreso || '',
                ciResponsableEgreso: this.data.card.ciResponsableEgreso || '',
                fechaEgreso: this.data.card.fechaEgreso || null,
                tecnicoEgreso: this.data.card.tecnicoEgreso || ''
            });

            // Forzar ejecución de la validación después del patch
            this.cardForm.updateValueAndValidity();

            // Marcar touched los campos de fecha para que el error se vea de inmediato
            this.cardForm.get('fechaInicio')?.markAsTouched();
            this.cardForm.get('fechaTerminado')?.markAsTouched();

            
            

            // Si hay un equipo_id, buscar su código
            if (this.data.card.codigoBienes) {
                this._scrumboardService.buscarEquipos(1, 100, '')
                    .subscribe({
                        next: (equipos) => {
                            const equipo = equipos.find(e => e.equipos_id === parseInt(this.data.card.codigoBienes));
                            if (equipo) {
                                this.searchEquipoCtrl.setValue(equipo.codigo, { emitEvent: false });
                                this.cardForm.controls['equipo'].setValue(equipo.equipos_id);
                                // También obtener la información del bien
                                this._scrumboardService.getBienes(equipo.codigo)
                                    .subscribe({
                                        next: (response) => {
                                            this.bienes = response;
                                        },
                                        error: (err) => {
                                            console.error('Error al obtener bienes:', err);
                                            this.bienes = null;
                                        }
                                    });
                            }
                        },
                        error: (err) => {
                            console.error('Error al buscar equipo:', err);
                        }
                    });
            }
        }

        // Marcar todos los campos como touched para activar la validación
        Object.keys(this.cardForm.controls).forEach(key => {
            const control = this.cardForm.get(key);
            control.markAsTouched();
        });

        // Suscribirse a los cambios del input
        this.searchEquipoCtrl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                if (typeof value === 'string') {
                    this.onSearchEquipos(value);
                }
            });

        // Si no es nuevo y hay un equipo_id, buscar y cargar su información
        if (!this.data.isNew && this.data.card?.codigoBienes) {
            console.log('Buscando equipo con ID:', this.data.card.codigoBienes);
            
            // Primero buscar el equipo por su ID
            this._scrumboardService.buscarEquipos(1, 100, '')
                .subscribe({
                    next: (equipos) => {
                        // Encontrar el equipo que coincida con el ID
                        const equipo = equipos.find(e => e.equipos_id === parseInt(this.data.card.codigoBienes));
                        if (equipo) {
                            console.log('Equipo encontrado:', equipo);
                            
                            // Establecer el código en el input y el ID en el formulario
                            this.searchEquipoCtrl.setValue(equipo.codigo, { emitEvent: false });
                            this.cardForm.controls['equipo'].setValue(equipo.equipos_id);

                            // Cargar la información de bienes
                            this._scrumboardService.getBienes(equipo.codigo)
                                .subscribe({
                                    next: (response) => {
                                        this.bienes = response;
                                        console.log('Información de bienes cargada:', this.bienes);
                                    },
                                    error: (err) => {
                                        console.error('Error al obtener bienes:', err);
                                        this.bienes = null;
                                    }
                                });

                            // También cargar los equipos filtrados para el dropdown
                            this.filtredEquipos = equipos
                                .filter(e => e.codigo && e.codigo.trim() !== '')
                                .reduce((acc, current) => {
                                    const exists = acc.find(item => item.codigo === current.codigo);
                                    if (!exists) {
                                        return [...acc, current];
                                    }
                                    return acc;
                                }, []);
                        } else {
                            console.warn('No se encontró el equipo con ID:', this.data.card.codigoBienes);
                        }
                    },
                    error: (err) => {
                        console.error('Error al buscar equipo:', err);
                    }
                });
        }

        // Suscribirse a cambios en el formulario para actualización automática
        this.cardForm.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(2000)  // Esperar 2 segundos después del último cambio
            )
            .subscribe(formValue => {
                console.log('Detectado cambio en el formulario:', {
                    formValue,
                    isDirty: this.cardForm.dirty,
                    isValid: this.cardForm.valid,
                    actualizando: this.actualizando
                });

                if (!this.actualizando && this.cardForm.dirty) {
                    console.log('Iniciando actualización automática...');
                    this.onSubmit();
                }
            });

        if (this.data.card) {
            this.cardForm.patchValue(this.data.card);
            
            // Cargar el nombre del técnico registro
            if (this.data.card.tecnicoRegistro) {
                this._scrumboardService.getTecnicoById(this.data.card.tecnicoRegistro)
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe((response: any) => {
                        if (response?.data) {
                            this.tecnicoRegistroNombre = 
                                `${response.data.nombres} ${response.data.apellidos}`.trim();
                        }
                    });
            }
        }

        // Si hay un técnico de egreso asignado, mostrar su nombre
        if (this.data.card?.tecnicoEgreso) {
            // Verificar si es un ID o un nombre
            const tecnicoEgreso = this.tecnicos.find(t => 
                t.id === this.data.card.tecnicoEgreso || 
                t.nombre === this.data.card.tecnicoEgreso
            );
            
            if (tecnicoEgreso) {
                this.cardForm.patchValue({
                    tecnicoEgreso: tecnicoEgreso.nombre
                });
            } else {
                // Si no se encuentra, usar el valor original
                this.cardForm.patchValue({
                    tecnicoEgreso: this.data.card.tecnicoEgreso
                });
            }
        }
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }


    onSubmit(): Promise<void> {
        if (this.actualizando) {
            // si ya hay un guardado en curso, reutiliza la promesa existente
            return this._savingPromise ?? Promise.resolve();
        }

        this.actualizando = true;

        const formData = this.cardForm.getRawValue();
        const updateData = {
            servicios_id: parseInt(this.data.card.id),
            nombreResponsableEgreso: formData.nombreResponsableEgreso || "edit",
            cargoSolicitante: formData.cargoSolicitante || " ",
            informe: formData.informe || "SE ACTIVO EL OFFICE",
            cargoResponsableEgreso: formData.cargoResponsableEgreso || " ",
            oficinaSolicitante: formData.oficina || "SECRETARIA DE DESARROLLO HUMANO",
            fechaRegistro: formData.fechaRegistro || "2020-04-16T12:20:58.420Z",
            equipo: formData.equipo || 1,
            problema: formData.problema || "ACTIVAR OFFICE",
            telefonoResponsableEgreso: formData.telefonoResponsableEgreso || " ",
            gestion: 3,
            telefonoSolicitante: formData.telefono || "4460697",
            tecnicoAsignado: formData.tecnicoAsignado,
            observaciones: formData.observaciones || " ",
            tipoResponsableEgreso: formData.tipoResponsableEgreso || " ",
            estado: formData.estado || "TERMINADO",
            tipoSolicitante: formData.tipoSolicitante || "INDEFINIDO - ITEM",
            fechaTerminado: formData.fechaTerminado || "2020-04-16T12:20:58.420Z",
            oficinaResponsableEgreso: formData.oficinaResponsableEgreso || " ",
            numero: 464,
            fechaInicio: formData.fechaInicio || "2020-04-16T12:20:58.420Z",
            fechaEgreso: formData.fechaEgreso || " ",
            ciSolicitante: formData.carnet || "5676174",
            nombreSolicitante: formData.solicitante || "JASSEL GABRIELA ENCINAS NAVIA",
            tipo: formData.tipoServicio || "ASISTENCIA",
            tecnicoRegistro: formData.tecnicoRegistro,
            tecnicoEgreso: formData.tecnicoEgreso || " ",
            ciResponsableEgreso: formData.ciResponsableEgreso || " "
        };

        this._savingPromise = new Promise<void>((resolve) => {
            this._scrumboardService.updateService(this.data.card.id, updateData)
                .pipe(delay(700))
                .subscribe({
                    next: () => {
                        this._scrumboardService.notifyCardUpdate(
                            'update',
                            Number(this.data.card.id),
                            this.data.card.listId
                        );

                        this._snackBar.open('Servicio actualizado correctamente', 'Cerrar', {
                            duration: 3000,
                            horizontalPosition: 'end',
                            verticalPosition: 'top',
                            panelClass: ['success-snackbar']
                        });

                        this.actualizando = false;
                        this.cardForm.markAsPristine();
                        resolve();
                    },
                    error: (error) => {
                        console.error('Error en actualización:', error);
                        this._snackBar.open('Error al actualizar el servicio', 'Cerrar', {
                            duration: 3000,
                            horizontalPosition: 'end',
                            verticalPosition: 'top',
                            panelClass: ['error-snackbar']
                        });
                        this.actualizando = false;
                        resolve(); // resolvemos para no bloquear el flujo
                    }
                });
        });

        return this._savingPromise;
    }


    onCancel(): void {
        this.dialogRef.close();
    }

    buscarBien(): void {
        // Aquí implementar la búsqueda del bien
        console.log('Buscando bien...');
        // Cuando se encuentre el bien, actualizar el tipo de hardware
        // this.cardForm.patchValue({ tipoHardware: 'Tipo encontrado' });
    }

    onDelete(): void {
        const dialogRef = this._dialog.open(ConfirmationDialogComponent, {
            data: {
                title: 'Eliminar servicio',
                message: '¿Está seguro de eliminar este servicio?'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this._scrumboardService.deleteService(this.data.card.id)
                    .subscribe({
                        next: () => {
                            // Notificar la eliminación con el listId
                            this._scrumboardService.notifyCardUpdate('delete', Number(this.data.card.id), this.data.card.listId);
                            
                            this._snackBar.open('Servicio eliminado correctamente', 'Cerrar', {
                                duration: 3000,
                                horizontalPosition: 'end',
                                verticalPosition: 'top',
                                panelClass: ['success-snackbar']
                            });
                            
                            this.dialogRef.close('deleted');
                        },
                        error: (error) => {
                            console.error('Error al eliminar servicio:', error);
                            this._snackBar.open('Error al eliminar el servicio', 'Cerrar', {
                                duration: 3000,
                                horizontalPosition: 'end',
                                verticalPosition: 'top',
                                panelClass: ['error-snackbar']
                            });
                        }
                    });
            }
        });
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const isInputClick = target.closest('input') !== null;
        const isTecnicosDropdown = target.closest('.tecnicos-dropdown') !== null;
        const isTecnicosEgresoDropdown = target.closest('.tecnicos-egreso-dropdown') !== null;
        const isEquiposDropdown = target.closest('.equipos-dropdown') !== null;
        
        if (!isInputClick) {
            if (!isTecnicosDropdown) {
                this.showTecnicosDropdown = false;
            }
            if (!isTecnicosEgresoDropdown) {
                this.showTecnicosEgresoDropdown = false;
            }
            if (!isEquiposDropdown) {
                this.showEquiposDropdown = false;
            }
            this._changeDetectorRef.detectChanges();
        }
    }

    onSearchEquipos(event: any): void {
        let query = '';
        
        // Manejar tanto el caso cuando recibimos el evento como cuando recibimos el string directamente
        if (typeof event === 'string') {
            query = event;
        } else if (event?.target?.value !== undefined) {
            query = event.target.value;
        }

        // Solo mostrar el dropdown y buscar si hay un query
        if (query.trim() !== '') {
            this.showEquiposDropdown = true;
            
            this._scrumboardService.buscarEquipos(1, 100, query)
                .subscribe({
                    next: (equipos: { equipos_id: number; codigo: string }[]) => {
                        // Filtrar equipos que coincidan con la búsqueda
                        this.filtredEquipos = equipos
                            .filter(equipo => 
                                equipo.codigo && 
                                equipo.codigo.trim() !== '' &&
                                equipo.codigo.toLowerCase().includes(query.toLowerCase())
                            )
                            .reduce((acc, current) => {
                                // Eliminar duplicados
                                const exists = acc.find(item => item.codigo === current.codigo);
                                if (!exists) {
                                    return [...acc, current];
                                }
                                return acc;
                            }, []);

                        this.showEquiposDropdown = this.filtredEquipos.length > 0;
                        this._changeDetectorRef.detectChanges();
                    },
                    error: (err) => {
                        console.error('Error al buscar equipos:', err);
                        this.filtredEquipos = [];
                        this.showEquiposDropdown = false;
                        this._changeDetectorRef.detectChanges();
                    },
                });
        } else {
            this.filtredEquipos = [];
            this.showEquiposDropdown = false;
            this._changeDetectorRef.detectChanges();
        }
    }

    onEquipoSelected(event: MatAutocompleteSelectedEvent): void {
        const equipo = event.option.value as Equipo;
        console.log('Equipo seleccionado:', equipo);
        this.selectEquipo(equipo);
    }

    selectEquipo(equipo: { equipos_id: number; codigo: string }): void {
        this.cardForm.controls['equipo'].setValue(equipo.equipos_id); // Guarda el ID del equipo
        this.searchEquipoCtrl.setValue(equipo.codigo, { emitEvent: false }); // Evitar que se dispare la búsqueda
        this.showEquiposDropdown = false;
        
        // Obtener información del bien después de seleccionar
        if (equipo.codigo) {
            this._scrumboardService.getBienes(equipo.codigo)
                .subscribe({
                    next: (response) => {
                        this.bienes = response;
                        // Forzar la actualización después de obtener los bienes
                        this.onSubmit();
                    },
                    error: (err) => {
                        console.error('Error al obtener bienes:', err);
                        this.bienes = null;
                    }
                });
        }
        
        this._changeDetectorRef.detectChanges();
    }

    displayFn = (equipo: Equipo): string => {
        return equipo ? equipo.codigo : '';
    }

    getBienes(): void {
        const codigoBienes = this.searchEquipoCtrl.value;
        
        // Limpiar espacios en blanco al inicio y al final del código
        const codigoBienesLimpio = typeof codigoBienes === 'string' 
            ? codigoBienes.trim() 
            : (codigoBienes as { codigo: string }).codigo.trim();
        
        if (codigoBienesLimpio) {
            this._scrumboardService.getBienes(codigoBienesLimpio)
                .subscribe({
                    next: (response) => {
                        this.bienes = response;
                        console.log('Bienes encontrados:', this.bienes);
                    },
                    error: (err) => {
                        console.error('Error al obtener bienes:', err);
                        this.bienes = null;
                    }
            });
        }
    }
    

    // Agregar método para manejar el focus
    onFocus(): void {
        // Mostrar todos los equipos al hacer focus
        this._scrumboardService.buscarEquipos(1, 100, '')
            .subscribe({
                next: (equipos: { equipos_id: number; codigo: string }[]) => {
                    this.filtredEquipos = equipos.filter(equipo => 
                        equipo.codigo && equipo.codigo.trim() !== ''
                    );
                    this.showEquiposDropdown = this.filtredEquipos.length > 0;
                    this._changeDetectorRef.detectChanges();
                },
                error: (err) => {
                    console.error('Error al buscar equipos:', err);
                    this.filtredEquipos = [];
                    this.showEquiposDropdown = false;
                    this._changeDetectorRef.detectChanges();
                }
            });
    }

    onTecnicoFilterChange(tecnicoId: string): void {
        // Actualizar el valor en el formulario
        this.cardForm.patchValue({
            tecnicoAsignado: tecnicoId
        });

        const updateData = {
            ...this.cardForm.getRawValue(),
            tecnicoAsignado: tecnicoId
        };

        this._scrumboardService.updateService(this.data.card.id, updateData)
            .subscribe({
                next: () => {
                    this._snackBar.open('Técnico asignado correctamente', 'Cerrar', {
                        duration: 3000,
                        horizontalPosition: 'end',
                        verticalPosition: 'top',
                        panelClass: ['success-snackbar']
                    });
                    this._scrumboardService.notifyCardUpdate('update', Number(this.data.card.id), this.data.card.listId);
                },
                error: (error) => {
                    console.error('Error al asignar técnico:', error);
                    this._snackBar.open('Error al asignar técnico', 'Cerrar', {
                        duration: 3000,
                        horizontalPosition: 'end',
                        verticalPosition: 'top',
                        panelClass: ['error-snackbar']
                    });
                }
            });
    }

    onSearchChange(term: string): void {
        // Eliminar espacios al inicio y al final del término
        const trimmedTerm = term.trim();
        
        this.searchTerm = trimmedTerm;
        this.showTecnicosDropdown = true;
        
        if (!trimmedTerm) {
            this.filteredTecnicos = this.tecnicos;
            return;
        }

        this.filteredTecnicos = this.tecnicos.filter(tecnico => 
            tecnico.nombre.toLowerCase().includes(trimmedTerm.toLowerCase())
        );
        
        this._changeDetectorRef.detectChanges();
    }

    getSelectedTecnicoDisplay(): string {
        const selectedTecnico = this.tecnicos.find(t => t.id === this.cardForm.get('tecnicoAsignado').value);
        return selectedTecnico ? selectedTecnico.nombre : 'Sin asignar';
    }

    // Agregar nuevo método
    getTecnicoEstado(): { message: string; color: string } | null {
        // Obtener el usuario actual del localStorage
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userRole = user?.data?.role;

        // Solo mostrar el estado si el usuario es admin (role 1)
        if (userRole !== '1') {
            return null;
        }

        const selectedTecnico = this.tecnicos.find(t => 
            t.id === this.cardForm.get('tecnicoAsignado').value
        );

        if (!selectedTecnico) {
            return null;
        }

        return {
            message: selectedTecnico.estado === 1 
                ? 'Asignado a técnico activo' 
                : 'Asignado a técnico inactivo',
            color: selectedTecnico.estado === 1 ? 'text-red-500' : 'text-green-500'
        };
    }

    

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    

    // Método privado para formatear fechas de manera consistente
    private formatDate(dateString: string | null | undefined): string {
        if (!dateString || dateString.trim() === '' || dateString.trim() === ' ') {
            return '';
        }

        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? '' : date.toISOString();
        } catch {
            return '';
        }
    }

    // Método para formatear fechas en los reportes
    private formatDisplayDate(dateString: string | null | undefined): string {
        const formattedDate = this.formatDate(dateString);
        if (!formattedDate) return 'N/A';

        try {
            return new Date(formattedDate).toLocaleDateString();
        } catch {
            return 'N/A';
        }
    }
    /** Espera ms milisegundos */
private _sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

/** Guarda si hay cambios y rehidrata la card desde backend (con anti-cache y reintentos) */
private async _saveAndRefresh(maxRetries = 6, delayMs = 250): Promise<void> {
  // 1) Forzar guardado si hay cambios o si ya hay un guardado en curso
  if (this.cardForm.dirty || this.actualizando) {
    await this.onSubmit();
  }

  const id = String(this.data.card.id);

  // 2) Reintentos para obtener versión fresca
  for (let i = 0; i < maxRetries; i++) {
    const noCacheId = id + `?t=${Date.now()}`; // cache-buster
    const fresh = await this._scrumboardService.getServiceById(noCacheId).toPromise();

    if (fresh) {
      // compara con el form para decidir si ya “refleja” lo último
      // valores del form para comparar
const f = this.cardForm.getRawValue();

// normaliza observaciones y equipo en ambos lados
const formObs    = (f.observaciones ?? f.observacionesProblema ?? '').trim();
const freshObs   = ((fresh as any).observaciones ?? fresh.observacionesProblema ?? '').trim();

const formEquipo  = String(f.equipo ?? f.codigoBienes ?? '');
const freshEquipo = String(((fresh as any).equipo ?? fresh.codigoBienes ?? ''));

const matches =
  (fresh.estado ?? '')       === (f.estado ?? '') &&
  (fresh.problema ?? '')     === (f.problema ?? '') &&
  freshObs                   === formObs &&
  (fresh.informe ?? '')      === (f.informe ?? '') &&
  freshEquipo                === formEquipo;


      if (matches || i === maxRetries - 1) {
        // sincroniza in-memory y formulario (sin emitir valueChanges)
        this.data.card = { ...this.data.card, ...fresh };
        this.cardForm.patchValue(this.data.card, { emitEvent: false });
        return;
      }
    }

    await this._sleep(delayMs);
  }
}


    private async generarPDFCompleto(): Promise<jsPDFWithPlugin> {
        if (!this.data.card) throw new Error('No hay servicio seleccionado');

        const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as jsPDFWithPlugin;
        const pageWidth  = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const MARGIN_X = 8;
        const START_Y  = 12;
        const today    = new Date();
                // PRIORIDAD: valores del form sobre this.data.card
// PRIORIDAD: valores del form sobre this.data.card
const formVal = this.cardForm?.getRawValue?.() ?? {};
const src: any = { ...this.data.card, ...formVal };


        

        // ====== Equipo (registro de equipo) ======
        let equipoDetalle: any = null;
        let codigoEquipoFromUI: string | null = null;
        const ctrlVal = this.searchEquipoCtrl?.value as string | Equipo | null;
        if (typeof ctrlVal === 'string') codigoEquipoFromUI = ctrlVal.trim() || null;
        else if (ctrlVal && typeof ctrlVal === 'object' && 'codigo' in ctrlVal) codigoEquipoFromUI = (ctrlVal as Equipo).codigo || null;
        const equiposId: number | null = this.cardForm?.get('equipo')?.value ?? null;

        if (equiposId) {
            try { equipoDetalle = await this._scrumboardService.getEquipoDetalleById(equiposId).toPromise(); }
            catch { equipoDetalle = null; }
        }
        let tipoDescFromApi: string | null = null;
        if (equipoDetalle?.tipo && !equipoDetalle?.tipoDescripcion) {
            try { tipoDescFromApi = await this._scrumboardService.getTipoDescripcionById(Number(equipoDetalle.tipo)).toPromise(); }
            catch { tipoDescFromApi = null; }
        }

        // ====== Header compacto ======
        const logoImg = await this.loadImage('/assets/images/logo/logo.svg');
        const canvas  = document.createElement('canvas'); canvas.width = 90; canvas.height = 90;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(logoImg, 0, 0, canvas.width, canvas.height);
        const logoBase64 = canvas.toDataURL('image/png');
        doc.addImage(logoBase64, 'PNG', MARGIN_X, START_Y - 4, 7, 7);

        doc.setFont(undefined, 'bold'); doc.setFontSize(8.5);
        doc.text('SISTEMA DE SERVICIO TÉCNICO', MARGIN_X + 10, START_Y - 1);

        doc.setFontSize(9);
        doc.text('DETALLE DE SERVICIO TÉCNICO', MARGIN_X, START_Y + 4);

        // 👉 Fecha/Hora + Paginación en el ENCABEZADO (ya no hay pie)
        doc.setFont(undefined, 'normal'); doc.setFontSize(6.6);
        doc.text(
            `FECHA ${today.toLocaleDateString()}  HORA ${today.toLocaleTimeString()}  ·  Pág. 1/1`,
            pageWidth - MARGIN_X,
            START_Y + 4,
            { align: 'right' }
        );

        doc.setLineWidth(0.1);
        doc.line(MARGIN_X, START_Y + 5.5, pageWidth - MARGIN_X, START_Y + 5.5);

        let y = START_Y + 9;

        // ====== Utilidades para tablas compactas ======
        const drawTriTable = (pairs: Array<[string, string]>) => {
            const rows: any[] = [];
            for (let i = 0; i < pairs.length; i += 3) {
                const a = pairs[i]   || ['', ''];
                const b = pairs[i+1] || ['', ''];
                const c = pairs[i+2] || ['', ''];
                rows.push([a[0], a[1], b[0], b[1], c[0], c[1]]);
            }
            const labelW = 22;
            const valueW = (pageWidth - 2*MARGIN_X - labelW*3) / 3;
            (doc as any).autoTable({
                startY: y + 1,
                theme: 'plain',
                body: rows,
                styles: { fontSize: 6.6, cellPadding: 0.35, overflow: 'linebreak', valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: labelW, fontStyle: 'bold' }, 1: { cellWidth: valueW },
                    2: { cellWidth: labelW, fontStyle: 'bold' }, 3: { cellWidth: valueW },
                    4: { cellWidth: labelW, fontStyle: 'bold' }, 5: { cellWidth: valueW },
                },
                margin: { left: MARGIN_X, right: MARGIN_X },
            });
            return (doc as any).lastAutoTable?.finalY || (y + 1);
        };

        const drawTwoPerRow = (pairs: Array<[string, string]>, labelW = 28) => {
            const rows: any[] = [];
            for (let i = 0; i < pairs.length; i += 2) {
                const a = pairs[i]   || ['', ''];
                const b = pairs[i+1] || ['', ''];
                rows.push([a[0], a[1], b[0], b[1]]);
            }
            const valueW = (pageWidth - 2*MARGIN_X - labelW*2) / 2;
            (doc as any).autoTable({
                startY: y + 1,
                theme: 'plain',
                body: rows,
                styles: { fontSize: 6.6, cellPadding: 0.35, overflow: 'linebreak', valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: labelW, fontStyle: 'bold' }, 1: { cellWidth: valueW },
                    2: { cellWidth: labelW, fontStyle: 'bold' }, 3: { cellWidth: valueW },
                },
                margin: { left: MARGIN_X, right: MARGIN_X },
            });
            return (doc as any).lastAutoTable?.finalY || (y + 1);
        };

        // ====== Datos del servicio (3 columnas) ======
        doc.setFont(undefined, 'bold'); doc.setFontSize(8.2); doc.text('DATOS DEL SERVICIO', MARGIN_X, y);
const fechaRegistro  = this.formatDisplayDate(src.fechaRegistro);
const fechaInicio    = this.formatDisplayDate(src.fechaInicio);
const fechaTerminado = this.formatDisplayDate(src.fechaTerminado);
const tecnicoAsignadoNombre =
  this.tecnicos?.find?.(t => t.id === src.tecnicoAsignado)?.nombre || 'Sin asignar';

    const servicioPairs: Array<[string, string]> = [
    ['Tipo de Servicio', String(src.tipo ?? 'N/A')],
    ['Estado', String(src.estado ?? 'N/A')],
    ['ID', String(src.id ?? 'N/A')],
    ['Registro', fechaRegistro],
    ['Inicio', fechaInicio],
    ['Término', fechaTerminado],
    ['Solicitante', String(src.nombreSolicitante ?? src.solicitante ?? 'N/A')],
    ['CI', String(src.carnet ?? 'N/A')],
    ['Cargo', String(src.cargo ?? 'N/A')],
    ['Tipo Sol.', String(src.tipoSolicitante ?? 'N/A')],
    ['Oficina', String(src.oficinaSolicitante ?? 'N/A')],
    ['Teléfono', String(src.telefonoSolicitante ?? 'N/A')],
    ['Tec. Asignado', tecnicoAsignadoNombre],
    ['Tec. Registro', this.tecnicoRegistroNombre || 'N/A'],
    ];

        y = drawTriTable(servicioPairs);

        // ====== Equipo (2 por fila) ======
        const tipoDesc = equipoDetalle?.tipoDescripcion || tipoDescFromApi || '';
        const codigoEquipo = equipoDetalle?.codigo || codigoEquipoFromUI || src.codigoBienes || 'N/A';


        const idRows = [
            ['Código de Bienes', String(codigoEquipo || 'N/A')],
            ['Tipo de Hardware', String(tipoDesc || 'N/A')],
            ['Marca', String(equipoDetalle?.marca || 'N/A')],
        ].filter((r): r is [string,string] => !!r[1] && r[1] !== 'N/A');
        const hwRows = [
            ['Procesador', String(equipoDetalle?.procesador || 'N/A')],
            ['Memoria RAM', String(equipoDetalle?.memoria || 'N/A')],
            ['Disco Duro', String(equipoDetalle?.discoduro || 'N/A')],
            ['Tarjeta Madre', String(equipoDetalle?.tarjetamadre || 'N/A')],
            ['Tarjeta de Video', String(equipoDetalle?.tarjetavideo || 'N/A')],
        ].filter((r): r is [string,string] => !!r[1] && r[1] !== 'N/A');

        if (idRows.length || hwRows.length) {
            y += 3; doc.setFont(undefined, 'bold'); doc.setFontSize(8.2); doc.text('EQUIPO', MARGIN_X, y);
            if (idRows.length) { y = drawTwoPerRow(idRows, 26); }
            if (hwRows.length) { y = drawTwoPerRow(hwRows, 26); }
        }

        // ====== Datos de egreso (solo TERMINADO) — 2 por fila ======
       const estadoActual: string = String(src.estado ?? '');
if (estadoActual.toUpperCase() === 'TERMINADO') {
  const tecnicoEgresoNombre = String(src.tecnicoEgreso ?? '').trim();
  const fechaEgreso = this.formatDisplayDate(src.fechaEgreso);

             const egresoRows = [
    ['Técnico Egreso', tecnicoEgresoNombre || 'N/A'],
    ['Fecha Egreso', fechaEgreso || 'N/A'],
    ['Resp. Egreso', String(src.nombreResponsableEgreso ?? 'N/A')],
    ['Cargo Resp.', String(src.cargoResponsableEgreso ?? 'N/A')],
    ['CI Resp.', String(src.ciResponsableEgreso ?? 'N/A')],
    ['Tel. Resp.', String(src.telefonoResponsableEgreso ?? 'N/A')],
    ['Tipo Resp.', String(src.tipoResponsableEgreso ?? 'N/A')],
    ['Oficina Resp.', String(src.oficinaResponsableEgreso ?? 'N/A')],
  ].filter((r): r is [string,string] => !!r[1] && r[1] !== 'N/A');

            if (egresoRows.length) {
                y += 3; doc.setFont(undefined, 'bold'); doc.setFontSize(8.2); doc.text('DATOS DE EGRESO', MARGIN_X, y);
                y = drawTwoPerRow(egresoRows, 28);
            }
        }

        // ====== Bloques de texto — líneas cortas ======
        const addWrapped = (titulo: string, contenido: any) => {
            const txt = String(contenido ?? '').trim();
            if (!txt) return;
            y += 2.5;
            doc.setFont(undefined, 'bold'); doc.setFontSize(8);
            doc.text(titulo, MARGIN_X, y);
            doc.setFont(undefined, 'normal'); doc.setFontSize(6.8);
            const wrapped = doc.splitTextToSize(txt, pageWidth - 2*MARGIN_X);
            let lineY = y + 2.6; const lineH = 2.8;
            for (const line of wrapped) {
                if (lineY > START_Y + 140) break; // límite ~media plana
                doc.text(line, MARGIN_X, lineY);
                lineY += lineH;
            }
            y = lineY - 0.4;
        };

addWrapped('PROBLEMA',      src.problema);
addWrapped('OBSERVACIONES', src.observacionesProblema ?? src.observaciones);
addWrapped('INFORME',       src.informe);



        // ====== Firma compacta ======
        const firmaY = Math.min(y + 6.5, START_Y + 140); // dentro de media plana
        const x2 = pageWidth - MARGIN_X; const x1 = x2 - 48;
        doc.setFont(undefined, 'bold'); doc.setFontSize(7.8);
        doc.text('Firma', (x1 + x2) / 2, firmaY - 1.6, { align: 'center' });
        doc.setLineWidth(0.2); doc.line(x1, firmaY, x2, firmaY);

    
        return doc;
    }


async generarPDF(): Promise<void> {
  try {
    if (!this.data.card?.id) {
      this._snackBar.open('No se puede generar el PDF: Información de la tarjeta no disponible', 'Cerrar', { 
        duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom'
      });
      return;
    }

    this.loading = true;

    // 1) GUARDA + REHIDRATA (con anti-cache y reintentos)
    await this._saveAndRefresh();

    // 2) Genera el PDF con datos frescos (form ya sincronizado)
    const doc = await this.generarPDFCompleto();

    // 3) Descarga/abre
    const pdfBuffer = doc.output('arraybuffer');
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);

    window.open(blobUrl, '_blank');

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `servicio_${this.data.card.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);

    this._snackBar.open('PDF generado exitosamente', 'Cerrar', { 
      duration: 2000, horizontalPosition: 'center', verticalPosition: 'bottom'
    });
  } catch (e: any) {
    console.error('Error al generar el PDF:', e);
    if (e?.status === 404) {
      this._snackBar.open('Servicio no encontrado.', 'Cerrar', { duration: 5000 });
    } else if (e?.status === 500) {
      this._snackBar.open('Error interno del servidor.', 'Cerrar', { duration: 3000 });
    } else {
      this._snackBar.open('No se pudo generar el PDF.', 'Cerrar', { duration: 3000 });
    }
  } finally {
    this.loading = false;
  }
}



    async imprimirPDF(): Promise<void> {
        try {
            const doc = await this.generarPDFCompleto();
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = 'none';
            document.body.appendChild(printFrame);

            const blob = doc.output('blob');
            const blobUrl = URL.createObjectURL(blob);

            printFrame.onload = () => {
                printFrame.contentWindow?.focus();
                printFrame.contentWindow?.print();
            };

            printFrame.src = blobUrl;
        } catch (error) {
            console.error('Error al imprimir el PDF:', error);
        }
    }

    buscarEmpleados(query: string): void {
        const queryLimpia = query.trim();

        if (queryLimpia.length > 2) {
            // Primero buscar en los empleados ya cargados
            const empleadosFiltrados = this.empleadosCargados.filter(emp => 
                emp.nombre_completo.toLowerCase().includes(queryLimpia.toLowerCase())
            );

            if (empleadosFiltrados.length > 0) {
                this.filteredEmpleados = empleadosFiltrados;
                this._changeDetectorRef.markForCheck();
            } else {
                // Si no hay coincidencias locales, consultar la API
                this._scrumboardService.buscarEmpleados(queryLimpia).pipe(
                    debounceTime(300)
                ).subscribe({
                    next: (data) => {
                        if (data && Array.isArray(data)) {
                            const nuevosEmpleados = data.map(empleado => ({
                                id: empleado.id || parseInt(empleado.nro_item) || 0,
                                nombre_completo: empleado.nombre_completo.trim(),
                                numdocumento: empleado.numdocumento,
                                cargo: empleado.cargo,
                                tipo_contrato: empleado.tipo_contrato,
                                unidad: empleado.unidad,
                                telefono: empleado.telefono,
                                telefono_coorp: empleado.telefono_coorp
                            }));

                            // Agregar los nuevos empleados al cache local
                            nuevosEmpleados.forEach(emp => {
                                if (!this.empleadosCargados.some(e => e.id === emp.id)) {
                                    this.empleadosCargados.push(emp);
                                }
                            });

                            this.filteredEmpleados = nuevosEmpleados;
                            this._changeDetectorRef.markForCheck();
                        }
                    },
                    error: (error) => {
                        console.error('Error al buscar empleados:', error);
                        this.filteredEmpleados = [];
                        this._changeDetectorRef.markForCheck();
                    }
                });
            }
        } else {
            this.filteredEmpleados = [];
        }
    }

    buscarEmpleadosPorCI(ci: string): void {
        const ciLimpio = ci.trim();

        if (ciLimpio.length > 2) {
            // Primero buscar en los empleados ya cargados
            const empleadosFiltrados = this.empleadosCargadosCI.filter(emp => 
                emp.numdocumento.includes(ciLimpio)
            );

            if (empleadosFiltrados.length > 0) {
                this.filteredEmpleadosCI = empleadosFiltrados;
                this._changeDetectorRef.markForCheck();
            } else {
                // Si no hay coincidencias locales, consultar la API
                this._scrumboardService.buscarEmpleadosPorCI(ciLimpio).pipe(
                    debounceTime(300)
                ).subscribe({
                    next: (data) => {
                        if (data && Array.isArray(data)) {
                            const nuevosEmpleados = data.map(empleado => ({
                                id: empleado.id || parseInt(empleado.nro_item) || 0,
                                nombre_completo: empleado.nombre_completo.trim(),
                                numdocumento: empleado.numdocumento,
                                cargo: empleado.cargo,
                                tipo_contrato: empleado.tipo_contrato,
                                unidad: empleado.unidad,
                                telefono: empleado.telefono,
                                telefono_coorp: empleado.telefono_coorp
                            }));

                            // Agregar los nuevos empleados al cache local
                            nuevosEmpleados.forEach(emp => {
                                if (!this.empleadosCargadosCI.some(e => e.id === emp.id)) {
                                    this.empleadosCargadosCI.push(emp);
                                }
                            });

                            this.filteredEmpleadosCI = nuevosEmpleados;
                            this._changeDetectorRef.markForCheck();
                        }
                    },
                    error: (error) => {
                        console.error('Error al buscar empleados por CI:', error);
                        this.filteredEmpleadosCI = [];
                        this._changeDetectorRef.markForCheck();
                    }
                });
            }
        } else {
            this.filteredEmpleadosCI = [];
        }
    }

    onEmpleadoSelected(event: any): void {
        const empleadoSeleccionado = event.option.value;
        
        if (!empleadoSeleccionado) {
            return;
        }

        // Actualizar el formulario con los datos del empleado
        this.cardForm.patchValue({
            solicitante: empleadoSeleccionado.nombre_completo || " ",
            carnet: empleadoSeleccionado.numdocumento || " ",
            cargoSolicitante: empleadoSeleccionado.cargo || " ",
            tipoSolicitante: empleadoSeleccionado.tipo_contrato || " ",
            oficina: empleadoSeleccionado.unidad || " ",
            telefono: empleadoSeleccionado.telefono_coorp || empleadoSeleccionado.telefono || " "
        });

        // Forzar detección de cambios
        this._changeDetectorRef.detectChanges();
    }

    buscarPorCI(): void {
        const ci = this.cardForm.get('carnet').value?.trim() || '';

        if (!ci) {
            this._snackBar.open('Por favor ingrese un número de CI', 'Cerrar', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom'
            });
            return;
        }

        this._scrumboardService.buscarEmpleadosPorCI(ci).subscribe({
            next: (response) => {
                if (response && response.length > 0) {
                    const empleado = response[0];

                    // Construir nombre completo desde los componentes individuales
                    const nombreCompleto = [
                        empleado.paterno || '',
                        empleado.materno || '',
                        empleado.nombre || '',
                        empleado.otro_nombre || ''
                    ].filter(Boolean).join(' ').trim();

                    // Actualizar el formulario
                    this.cardForm.patchValue({
                        solicitante: nombreCompleto || empleado.empleado || " ",
                        carnet: empleado.ci || ci,
                        cargoSolicitante: empleado.cargo || " ",
                        tipoSolicitante: empleado.tipocontrato || " ",
                        oficina: empleado.unidad || " ",
                        telefono: empleado.telefono || empleado.telefono_coorp || " "
                    });
                    
                    // Forzar detección de cambios
                    this._changeDetectorRef.detectChanges();

                    this._snackBar.open('Empleado encontrado', 'Cerrar', {
                        duration: 3000,
                        panelClass: ['success-snackbar'],
                        horizontalPosition: 'center',
                        verticalPosition: 'bottom'
                    });
                } else {
                    this._snackBar.open('No se encontró ningún empleado con ese CI', 'Cerrar', {
                        duration: 3000,
                        panelClass: ['error-snackbar'],
                        horizontalPosition: 'center',
                        verticalPosition: 'bottom'
                    });
                }
            },
            error: (error) => {
                console.error('Error al buscar empleado:', error);
                this._snackBar.open('Error al buscar empleado', 'Cerrar', {
                    duration: 3000,
                    panelClass: ['error-snackbar'],
                    horizontalPosition: 'center',
                    verticalPosition: 'bottom'
                });
            }
        });
    }

    displayFnEmpleado = (empleado: any): string => {
        if (!empleado) {
            return '';
        }
        if (typeof empleado === 'string') {
            return empleado;
        }
        // Mostrar CI o nombre según el campo que se está usando
        return empleado.numdocumento || empleado.nombre_completo || '';
    };

    onSearchTecnicoEgresoChange(term: string): void {
        // Eliminar espacios al inicio y al final del término
        const trimmedTerm = term.trim();
        
        this.searchTerm = trimmedTerm;
        this.showTecnicosEgresoDropdown = true;
        
        if (!trimmedTerm) {
            this.filteredTecnicosEgreso = this.tecnicos;
            return;
        }

        this.filteredTecnicosEgreso = this.tecnicos.filter(tecnico => 
            tecnico.nombre.toLowerCase().includes(trimmedTerm.toLowerCase())
        );
        
        this._changeDetectorRef.detectChanges();
    }

    getSelectedTecnicoEgresoDisplay(): string {
        // Buscar por nombre en lugar de ID
        const selectedTecnicoNombre = this.cardForm.get('tecnicoEgreso').value;
        return selectedTecnicoNombre || 'Sin asignar';
    }

    onTecnicoEgresoFilterChange(tecnicoId: string): void {
        // Encontrar el técnico seleccionado
        const selectedTecnico = this.tecnicos.find(t => t.id === tecnicoId);
        
        if (!selectedTecnico) {
            console.error('Técnico no encontrado');
            return;
        }

        // Actualizar el valor en el formulario
        this.cardForm.patchValue({
            tecnicoEgreso: selectedTecnico.nombre
        });

        const updateData = {
            ...this.cardForm.getRawValue(),
            tecnicoEgreso: selectedTecnico.nombre
        };

        this._scrumboardService.updateService(this.data.card.id, updateData)
            .subscribe({
                next: () => {
                    this._snackBar.open('Técnico de egreso asignado correctamente', 'Cerrar', {
                        duration: 3000,
                        horizontalPosition: 'end',
                        verticalPosition: 'top',
                        panelClass: ['success-snackbar']
                    });
                    this._scrumboardService.notifyCardUpdate('update', Number(this.data.card.id), this.data.card.listId);
                },
                error: (error) => {
                    console.error('Error al asignar técnico de egreso:', error);
                    this._snackBar.open('Error al asignar técnico de egreso', 'Cerrar', {
                        duration: 3000,
                        horizontalPosition: 'end',
                        verticalPosition: 'top',
                        panelClass: ['error-snackbar']
                    });
                }
            });
    }

    // Método para buscar responsables de egreso
    buscarResponsablesEgreso(query: string): void {
        const queryLimpia = query.trim();

        if (queryLimpia.length > 2) {
            // Primero buscar en los responsables ya cargados
            const responsablesFiltrados = this.responsablesCargados.filter(resp => 
                resp.nombre_completo.toLowerCase().includes(queryLimpia.toLowerCase())
            );

            if (responsablesFiltrados.length > 0) {
                this.filteredResponsablesEgreso = responsablesFiltrados;
                this._changeDetectorRef.markForCheck();
            } else {
                // Si no hay coincidencias locales, consultar la API
                this._scrumboardService.buscarEmpleados(queryLimpia).pipe(
                    debounceTime(300)
                ).subscribe({
                    next: (data) => {
                        if (data && Array.isArray(data)) {
                            const nuevosResponsables = data.map(responsable => ({
                                id: responsable.id || parseInt(responsable.nro_item) || 0,
                                nombre_completo: responsable.nombre_completo.trim(),
                                numdocumento: responsable.numdocumento,
                                cargo: responsable.cargo,
                                tipo_contrato: responsable.tipo_contrato,
                                unidad: responsable.unidad,
                                telefono: responsable.telefono,
                                telefono_coorp: responsable.telefono_coorp
                            }));

                            // Agregar los nuevos responsables al cache local
                            nuevosResponsables.forEach(resp => {
                                if (!this.responsablesCargados.some(r => r.id === resp.id)) {
                                    this.responsablesCargados.push(resp);
                                }
                            });

                            this.filteredResponsablesEgreso = nuevosResponsables;
                            this._changeDetectorRef.markForCheck();
                        }
                    },
                    error: (error) => {
                        console.error('Error al buscar responsables de egreso:', error);
                        this.filteredResponsablesEgreso = [];
                        this._changeDetectorRef.markForCheck();
                    }
                });
            }
        } else {
            this.filteredResponsablesEgreso = [];
        }
    }

    // Método para buscar responsables de egreso por CI
    buscarResponsableEgresoPorCI(): void {
        const ci = this.cardForm.get('ciResponsableEgreso').value?.trim() || '';

        if (!ci) {
            this._snackBar.open('Por favor ingrese un número de CI', 'Cerrar', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom'
            });
            return;
        }

        this._scrumboardService.buscarEmpleadosPorCI(ci).subscribe({
            next: (response) => {
                if (response && response.length > 0) {
                    const responsable = response[0];

                    // Construir nombre completo desde los componentes individuales
                    const nombreCompleto = [
                        responsable.paterno || '',
                        responsable.materno || '',
                        responsable.nombre || '',
                        responsable.otro_nombre || ''
                    ].filter(Boolean).join(' ').trim();

                    // Actualizar el formulario
                    this.cardForm.patchValue({
                        nombreResponsableEgreso: nombreCompleto || responsable.empleado || " ",
                        ciResponsableEgreso: responsable.ci || ci,
                        cargoResponsableEgreso: responsable.cargo || " ",
                        tipoResponsableEgreso: responsable.tipocontrato || " ",
                        oficinaResponsableEgreso: responsable.unidad || " ",
                        telefonoResponsableEgreso: responsable.telefono || responsable.telefono_coorp || " "
                    });
                    
                    // Forzar detección de cambios
                    this._changeDetectorRef.detectChanges();

                    this._snackBar.open('Responsable de egreso encontrado', 'Cerrar', {
                        duration: 3000,
                        panelClass: ['success-snackbar'],
                        horizontalPosition: 'center',
                        verticalPosition: 'bottom'
                    });
                } else {
                    this._snackBar.open('No se encontró ningún responsable con ese CI', 'Cerrar', {
                        duration: 3000,
                        panelClass: ['error-snackbar'],
                        horizontalPosition: 'center',
                        verticalPosition: 'bottom'
                    });
                }
            },
            error: (error) => {
                console.error('Error al buscar responsable de egreso:', error);
                this._snackBar.open('Error al buscar responsable de egreso', 'Cerrar', {
                    duration: 3000,
                    panelClass: ['error-snackbar'],
                    horizontalPosition: 'center',
                    verticalPosition: 'bottom'
                });
            }
        });
    }

    // Método para seleccionar un responsable de egreso
    onResponsableEgresoSelected(event: any): void {
        const responsableSeleccionado = event.option.value;
        
        if (!responsableSeleccionado) {
            return;
        }

        // Actualizar el formulario con los datos del responsable
        this.cardForm.patchValue({
            nombreResponsableEgreso: responsableSeleccionado.nombre_completo || " ",
            ciResponsableEgreso: responsableSeleccionado.numdocumento || " ",
            cargoResponsableEgreso: responsableSeleccionado.cargo || " ",
            tipoResponsableEgreso: responsableSeleccionado.tipo_contrato || " ",
            oficinaResponsableEgreso: responsableSeleccionado.unidad || " ",
            telefonoResponsableEgreso: responsableSeleccionado.telefono_coorp || responsableSeleccionado.telefono || " "
        });

        // Forzar detección de cambios
        this._changeDetectorRef.detectChanges();
    }

    // Método para buscar responsables de egreso por CI en el dropdown
    buscarResponsablesEgresoPorCI(ci: string): void {
        const ciLimpio = ci.trim();

        if (ciLimpio.length > 2) {
            // Primero buscar en los responsables ya cargados
            const responsablesFiltrados = this.responsablesCargadosCI.filter(resp => 
                resp.numdocumento.includes(ciLimpio)
            );

            if (responsablesFiltrados.length > 0) {
                this.filteredResponsablesEgresoCI = responsablesFiltrados;
                this._changeDetectorRef.markForCheck();
            } else {
                // Si no hay coincidencias locales, consultar la API
                this._scrumboardService.buscarEmpleadosPorCI(ciLimpio).pipe(
                    debounceTime(300)
                ).subscribe({
                    next: (data) => {
                        if (data && Array.isArray(data)) {
                            const nuevosResponsables = data.map(responsable => ({
                                id: responsable.id || parseInt(responsable.nro_item) || 0,
                                nombre_completo: responsable.nombre_completo.trim(),
                                numdocumento: responsable.numdocumento,
                                cargo: responsable.cargo,
                                tipo_contrato: responsable.tipo_contrato,
                                unidad: responsable.unidad,
                                telefono: responsable.telefono,
                                telefono_coorp: responsable.telefono_coorp
                            }));

                            // Agregar los nuevos responsables al cache local
                            nuevosResponsables.forEach(resp => {
                                if (!this.responsablesCargadosCI.some(r => r.id === resp.id)) {
                                    this.responsablesCargadosCI.push(resp);
                                }
                            });

                            this.filteredResponsablesEgresoCI = nuevosResponsables;
                            this._changeDetectorRef.markForCheck();
                        }
                    },
                    error: (error) => {
                        console.error('Error al buscar responsables de egreso por CI:', error);
                        this.filteredResponsablesEgresoCI = [];
                        this._changeDetectorRef.markForCheck();
                    }
                });
            }
        } else {
            this.filteredResponsablesEgresoCI = [];
        }
    }

    // Método para mostrar el nombre del responsable en el autocomplete
    displayFnResponsableEgreso = (responsable: any): string => {
        if (!responsable) {
            return '';
        }
        if (typeof responsable === 'string') {
            return responsable;
        }
        // Mostrar CI o nombre según el campo que se está usando
        return responsable.numdocumento || responsable.nombre_completo || '';
    };
}

