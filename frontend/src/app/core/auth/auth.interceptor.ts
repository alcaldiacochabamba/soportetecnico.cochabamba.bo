import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { catchError, Observable, throwError } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Listado de endpoints públicos que NO necesitan token
    const excludedUrls = [
        '/auth/login',
        '/auth/forgot-password',
        '/auth/reset-password'
    ];

    // Verificar si la URL actual está en la lista de exclusión
    const isExcluded = excludedUrls.some((url) => req.url.includes(url));

    let newReq = req.clone();

    if (!isExcluded) {
        // Si la ruta no está excluida, añadimos token
        if (authService.accessToken && !AuthUtils.isTokenExpired(authService.accessToken)) {
            newReq = req.clone({
                headers: req.headers.set('Authorization', 'Bearer ' + authService.accessToken),
            });
        }
    }

    // Response
    return next(newReq).pipe(
        catchError((error) => {
            // Catch "401 Unauthorized" responses
            if (error instanceof HttpErrorResponse && error.status === 401) {
                // Sign out
                authService.signOut();

                // Reload the app
                location.reload();
            }

            return throwError(() => error);
        }),
    );
};
