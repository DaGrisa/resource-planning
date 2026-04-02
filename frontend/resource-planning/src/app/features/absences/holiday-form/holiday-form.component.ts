import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Holiday, HolidayUpsertDto } from '../../../core/models';

export interface HolidayFormData {
  year: number;
  existingHoliday?: Holiday;
}

@Component({
  selector: 'app-holiday-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ editMode ? 'Edit' : 'Add' }} Holiday</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>Holiday Date</mat-label>
        <input matInput [matDatepicker]="datePicker" [(ngModel)]="holidayDate" />
        <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
        <mat-datepicker #datePicker></mat-datepicker>
      </mat-form-field>

      @if (holidayDate) {
        <div class="hint">
          This holiday applies to all active employees and counts as 1/5 of each employee's weekly hours.
        </div>
      }

      <mat-form-field class="full-width">
        <mat-label>Note (optional)</mat-label>
        <input matInput [(ngModel)]="note" />
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .hint { margin: 8px 0; font-size: 13px; color: #666; }
  `]
})
export class HolidayFormComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<HolidayFormComponent, HolidayUpsertDto[]>>(MatDialogRef);
  data: HolidayFormData = inject<HolidayFormData>(MAT_DIALOG_DATA);

  holidayDate?: Date;
  note = '';
  editMode = false;

  ngOnInit() {
    if (this.data.existingHoliday) {
      this.editMode = true;
      this.holidayDate = new Date(this.data.existingHoliday.date);
      this.note = this.data.existingHoliday.note || '';
    }
  }

  canSave(): boolean {
    return !!this.holidayDate;
  }

  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  save() {
    if (!this.canSave()) return;

    const originalDate = this.data.existingHoliday?.date;

    const result: HolidayUpsertDto[] = [{
      date: this.formatLocalDate(this.holidayDate!),
      originalDate,
      note: this.note || undefined
    }];

    this.dialogRef.close(result);
  }
}
