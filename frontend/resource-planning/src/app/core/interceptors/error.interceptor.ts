import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError(error => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Cannot connect to server';
      } else if (error.status === 400) {
        message = error.error?.message || 'Invalid request';
      } else if (error.status === 401) {
        // Don't show snackbar for login failures (handled by login component)
        if (!req.url.includes('/auth/login')) {
          authService.logout();
          message = 'Session expired. Please log in again.';
        } else {
          return throwError(() => error);
        }
      } else if (error.status === 403) {
        message = error.error?.message || 'You do not have permission to perform this action';
      } else if (error.status === 404) {
        message = 'Resource not found';
      } else if (error.status === 409) {
        message = error.error?.message || 'Conflict';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      snackBar.open(message, 'Close', { duration: 5000 });
      return throwError(() => error);
    })
  );
};
