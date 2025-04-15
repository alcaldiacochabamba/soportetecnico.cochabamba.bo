import { CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, AfterViewInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'environments/environment';
import { FuseAlertComponent } from '@fuse/components/alert';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Type {
    tipos_id: number;
    descripcion: string;
    estado: number;
}

@Component({
    selector       : 'settings-plan-billing',
    templateUrl    : './plan-billing.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone     : true,
    imports        : [
        FormsModule, 
        ReactiveFormsModule, 
        FuseAlertComponent, 
        MatRadioModule, 
        NgFor, 
        NgClass, 
        NgIf, 
        MatIconModule, 
        MatFormFieldModule, 
        MatInputModule, 
        MatSelectModule, 
        MatOptionModule, 
        MatButtonModule, 
        CurrencyPipe,
        MatTableModule,
        MatPaginatorModule,
        MatDialogModule,
        MatSortModule,
        MatSnackBarModule
    ],
})
export class SettingsPlanBillingComponent implements OnInit, AfterViewInit
{
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatPaginator) paginator: MatPaginator;

    typeForm: UntypedFormGroup;
    types: Type[] = [];
    dataSource: MatTableDataSource<Type>;
    displayedColumns: string[] = ['tipos_id', 'descripcion', 'estado', 'actions'];
    selectedType: Type | null = null;
    isEditMode = false;
    
    constructor(
        private _formBuilder: UntypedFormBuilder,
        private http: HttpClient,
        private _changeDetectorRef: ChangeDetectorRef,
        private _snackBar: MatSnackBar
    )
    {
        // Inicializar dataSource
        this.dataSource = new MatTableDataSource<Type>([]);
    }

    ngOnInit(): void {
        this.initForm();
        this.loadTypes();
    }

    ngAfterViewInit(): void {
        // Configurar sort y paginator después de la inicialización de la vista
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this._changeDetectorRef.detectChanges();
    }

    initForm(): void {
        this.typeForm = this._formBuilder.group({
            descripcion: [''],
            formulario: ['1', Validators.required],
            estado: [1, Validators.required]
        });
    }

    loadTypes(): void {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('No se encontró el token de autorización', 'error');
            return;
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        this.http.get<any>(`${environment.baseUrl}/type?page=1&limit=100&search=&sort=tipos_id&order=asc`, { headers })
            .subscribe({
                next: (response) => {
                    if (response && response.data && response.data.data) {
                        // Filtrar solo tipos activos y ordenar
                        this.types = response.data.data
                            .map((item: any) => item.tipos_id ? item.tipos_id : item)
                            .filter((type: Type) => type.estado === 1) // Solo tipos activos
                            .sort((a: Type, b: Type) => a.tipos_id - b.tipos_id);
                        
                        // Actualizar el dataSource
                        this.dataSource.data = this.types;
                        
                        this._changeDetectorRef.detectChanges();
                    } else {
                        this.showNotification('No se pudieron cargar los tipos', 'warning');
                    }
                },
                error: (error) => {
                    this.showNotification('Error al cargar tipos', 'error');
                }
            });
    }

    onSubmit(): void {
        if (this.typeForm.valid) {
            const formValue = {
                ...this.typeForm.value,
                formulario: '1',
                estado: 1
            };

            if (this.isEditMode && this.selectedType) {
                this.updateType(formValue);
            } else {
                this.createType();
            }
        }
    }

    createType(): void {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('No se encontró el token de autorización', 'error');
            return;
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        // Validar que la descripción no esté vacía
        if (!this.typeForm.get('descripcion')?.value.trim()) {
            this.showNotification('La descripción no puede estar vacía', 'error');
            return;
        }

        const formValue = {
            ...this.typeForm.value,
            formulario: '1',
            estado: 1
        };

        this.http.post<any>(`${environment.baseUrl}/type`, formValue, { headers })
            .subscribe({
                next: (response) => {
                    this.showNotification('Tipo creado exitosamente', 'success');
                    this.loadTypes();
                    this.resetForm();
                },
                error: (error) => {
                    this.showNotification('Error al crear tipo', 'error');
                }
            });
    }

    updateType(formValue: any): void {
        if (!this.selectedType) return;

        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('No se encontró el token de autorización', 'error');
            return;
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        this.http.put<any>(`${environment.baseUrl}/type/${this.selectedType.tipos_id}`, formValue, { headers })
            .subscribe({
                next: (response) => {
                    this.showNotification('Tipo actualizado exitosamente', 'success');
                    this.loadTypes();
                    this.resetForm();
                },
                error: (error) => {
                    this.showNotification('Error al actualizar tipo', 'error');
                }
            });
    }

    deleteType(type: Type): void {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('No se encontró el token de autorización', 'error');
            return;
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const updateData = {
            ...type,
            estado: 0 // Cambiar a inactivo
        };

        this.http.put<any>(`${environment.baseUrl}/type/${type.tipos_id}`, updateData, { headers })
            .subscribe({
                next: (response) => {
                    this.showNotification('Tipo desactivado exitosamente', 'success');
                    this.loadTypes();
                },
                error: (error) => {
                    this.showNotification('Error al desactivar tipo', 'error');
                }
            });
    }

    editType(type: Type): void {
        this.selectedType = type;
        this.isEditMode = true;
        this.typeForm.patchValue({
            descripcion: type.descripcion,
            formulario: '1',
            estado: 1
        });
    }

    resetForm(): void {
        this.typeForm.reset({
            descripcion: '',
            formulario: '1',
            estado: 1
        });
        this.selectedType = null;
        this.isEditMode = false;
    }

    // Método para mostrar notificaciones
    showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
        this._snackBar.open(message, 'Cerrar', {
            duration: 3000,
            panelClass: [`${type}-snackbar`],
            horizontalPosition: 'center',
            verticalPosition: 'top',
        });
    }

    trackByFn(index: number, item: Type): number {
        return item.tipos_id;
    }

    // Método para aplicar filtro (opcional)
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }
}
