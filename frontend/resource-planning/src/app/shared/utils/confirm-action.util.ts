import { MatDialog } from '@angular/material/dialog';
import { Observable, filter, switchMap, take } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';

export function confirmExecute$<T>(
  dialog: MatDialog,
  data: ConfirmDialogData,
  execute: () => Observable<T>
): Observable<T> {
  return dialog.open(ConfirmDialogComponent, { data }).afterClosed().pipe(
    take(1),
    filter((confirmed): confirmed is true => confirmed === true),
    switchMap(() => execute())
  );
}
