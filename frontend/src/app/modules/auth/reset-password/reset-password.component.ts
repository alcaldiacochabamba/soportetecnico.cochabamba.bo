import { NgIf } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { FuseValidators } from '@fuse/validators';
import { AuthService } from 'app/core/auth/auth.service';
import { finalize } from 'rxjs';

@Component({
    selector     : 'auth-reset-password',
    templateUrl  : './reset-password.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations,
    standalone   : true,
    imports      : [
        NgIf,
        FuseAlertComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        RouterLink,
    ],
})
export class AuthResetPasswordComponent implements OnInit {
    @ViewChild('resetPasswordNgForm') resetPasswordNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type   : 'success',
        message: '',
    };
    resetPasswordForm: UntypedFormGroup;
    showAlert = false;
    private _token = '';

    // Flags para validación dinámica
    passwordLength = false;
    hasNumber = false;
    hasLetter = false;
    hasSpecialChar = false;

    constructor(
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
    ) {}

    ngOnInit(): void {
        // Recuperamos el token desde la URL
        this._token = this._route.snapshot.queryParamMap.get('token') || '';

        this.resetPasswordForm = this._formBuilder.group(
            {
                // minLength actualizado a 8 según requisito
                password       : ['', [Validators.required, Validators.minLength(8)]],
                passwordConfirm: ['', Validators.required],
            },
            {
                validators: FuseValidators.mustMatch('password', 'passwordConfirm'),
            },
        );

        // Suscribir cambios de contraseña para actualizar indicadores dinámicos
        this.resetPasswordForm.get('password')?.valueChanges.subscribe((value: string) => {
            this.updatePasswordChecks(value || '');
        });
    }

    // Getter para saber si se cumplen todas las reglas
    get allCriteriaMet(): boolean {
        return this.passwordLength && this.hasNumber && this.hasLetter && this.hasSpecialChar;
    }

    // Actualiza los flags de validación en vivo
    private updatePasswordChecks(value: string): void {
        this.passwordLength  = value.length >= 8;
        this.hasNumber       = /\d/.test(value);
        this.hasLetter       = /[A-Za-z]/.test(value);
        // Cualquier carácter NO alfanumérico cuenta como especial
        this.hasSpecialChar  = /[^A-Za-z0-9]/.test(value);
    }

    /**
     * Restablece la contraseña
     */
    resetPassword(): void {
        // Bloqueo doble: formulario inválido o reglas no cumplidas
        if (this.resetPasswordForm.invalid || !this.allCriteriaMet) {
            // Marca los controles como tocados para mostrar errores si fuese necesario
            this.resetPasswordForm.markAllAsTouched();
            return;
        }

        this.resetPasswordForm.disable();
        this.showAlert = false;

        const newPassword = this.resetPasswordForm.get('password')?.value;

        this._authService
            .resetPassword(newPassword, this._token)
            .pipe(
                finalize(() => {
                    this.resetPasswordForm.enable();
                    this.resetPasswordNgForm.resetForm();
                    this.showAlert = true;
                    // Reiniciar indicadores
                    this.passwordLength = this.hasNumber = this.hasLetter = this.hasSpecialChar = false;
                }),
            )
            .subscribe(
                () => {
                    this.alert = {
                        type   : 'success',
                        message: 'Tu contraseña ha sido restablecida correctamente.',
                    };
                    // Redirigir al login después de 2s
                    setTimeout(() => this._router.navigate(['/sign-in']), 2000);
                },
                (error) => {
                    console.error('Error en resetPassword:', error);
                    this.alert = {
                        type   : 'error',
                        message: 'Hubo un error al restablecer la contraseña. Inténtalo de nuevo.',
                    };
                },
            );
    }
}
