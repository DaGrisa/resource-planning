import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

export interface SaveActionOptions {
  successMessage: string;
  navigateTo: string;
  onError?: (error: unknown) => void;
}

export function saveAndNavigate(
  request$: Observable<unknown>,
  snackBar: MatSnackBar,
  router: Router,
  options: SaveActionOptions
): void {
  request$.subscribe({
    next: () => {
      snackBar.open(options.successMessage, 'OK', { duration: 3000 });
      router.navigate([options.navigateTo]);
    },
    error: (error) => {
      options.onError?.(error);
    }
  });
}
