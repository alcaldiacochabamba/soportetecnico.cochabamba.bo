import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { UserService } from 'app/core/user/user.service';
import { environment } from '../../../environments/environment'; 
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _authenticated: boolean = false;
    private _httpClient = inject(HttpClient);
    private _userService = inject(UserService);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    set accessToken(token: string) {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string {
        return localStorage.getItem('accessToken') ?? '';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Forgot password
     *
     * @param email
     */
    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post(`${environment.baseUrl}/auth/forgot-password`, { email });
    }

    /**
     * Reset password
     *
     * @param token
     * @param newPassword
     */
    resetPassword(token: string, newPassword: string): Observable<any> {
        return this._httpClient.post(`${environment.baseUrl}/auth/reset-password`, { token, newPassword });
    }

    /**
     * Sign in
     */
    signIn(credentials: { email: string; password: string }): Observable<any> {
        console.log('Datos de inicio de sesión:', credentials);

        return this._httpClient.post(`${environment.baseUrl}/user/login`, credentials).pipe(
            catchError((error) => {
                console.error('Error de inicio de sesión:', error);
                return throwError(error);
            }),
            switchMap((response: any) => {
                console.log('Respuesta del backend:', response);

                if (response.token) {
                    this.accessToken = response.token;
                    console.log('Token recibido y almacenado:', this.accessToken);
                }

                return this._httpClient.get(`${environment.baseUrl}/user/${response.user.id}`).pipe(
                    switchMap((userData: any) => {
                        this._authenticated = true;
                        this._userService.user = userData;

                        localStorage.removeItem('user');
                        localStorage.setItem('user', JSON.stringify(userData));

                        console.log('Datos de usuario actualizados en localStorage:', userData);

                        return of({
                            ...response,
                            user: userData
                        });
                    })
                );
            })
        );
    }

    /**
     * Sign in using token
     */
    signInUsingToken(): Observable<any> {
        return this._httpClient.post(`${environment.baseUrl}/user/loginToken`, {
            accessToken: this.accessToken,
        }).pipe(
            catchError(() => of(false)),
            switchMap((response: any) => {
                if (response.accessToken) {
                    this.accessToken = response.accessToken;
                }

                this._authenticated = true;
                this._userService.user = response.user;

                return of(true);
            }),
        );
    }

    /**
     * Sign out
     */
    signOut(): Observable<any> {
        this._userService.user = null;
        localStorage.removeItem('accessToken');
        this._authenticated = false;
        return of(true);
    }

    /**
     * Sign up
     */
    signUp(user: { 
        firstName: string; 
        lastName: string; 
        username: string; 
        email: string; 
        password: string; 
        role: string; 
    }): Observable<any> {
        return this._httpClient.post(`${environment.baseUrl}/user`, user);
    }

    /**
     * Unlock session
     */
    unlockSession(credentials: { email: string; password: string }): Observable<any> {
        return this._httpClient.post(`${environment.baseUrl}/auth/unlock-session`, credentials);
    }

    /**
     * Check authentication status
     */
    check(): Observable<boolean> {
        if (this._authenticated) {
            return of(true);
        }

        if (!this.accessToken) {
            return of(false);
        }

        if (AuthUtils.isTokenExpired(this.accessToken)) {
            return of(false);
        }

        return this.signInUsingToken();
    }

    /**
     * Get user roles
     */
    getUserRoles(): string[] {
        const token = this.accessToken;
        if (!token) {
            return [];
        }

        try {
            const decoded: any = jwtDecode(token);
            return decoded.role || [];
        } catch (error) {
            console.error('Error al decodificar el token:', error);
            return [];
        }
    }
}
