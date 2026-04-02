import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ProjectBudgetUpsertDto, ProjectWeekOverview } from '../../../core/models';
import { getISOWeek, getWeekStart } from '../../../core/utils/week.utils';

export interface BulkBudgetData {
  overview: ProjectWeekOverview[];
  year: number;
  weekFrom: number;
  weekTo: number;
}

@Component({
  selector: 'app-bulk-budget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>Bulk Set Budget</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>Project</mat-label>
        <mat-select [(ngModel)]="selectedProjectId">
          @for (project of data.overview; track project.projectId) {
            <mat-option [value]="project.projectId">{{ project.projectName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="week-range">
        <mat-form-field>
          <mat-label>From Week</mat-label>
          <input matInput [matDatepicker]="fromPicker" [value]="fromDate" (dateChange)="onFromChange($event)" />
          <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
          <mat-hint>CW {{ fromWeek }}</mat-hint>
        </mat-form-field>

        <mat-form-field>
          <mat-label>To Week</mat-label>
          <input matInput [matDatepicker]="toPicker" [value]="toDate" (dateChange)="onToChange($event)" />
          <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
          <mat-hint>CW {{ toWeek }}</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field class="full-width">
        <mat-label>Budget hours per week</mat-label>
        <input matInput type="number" [(ngModel)]="budgetHours" min="0" step="1" />
      </mat-form-field>

      @if (selectedProjectId && fromWeek <= toWeek) {
        <div class="summary">
          Will set {{ budgetHours }}h for {{ weekCount }} week(s), CW {{ fromWeek }}–{{ toWeek }}
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="confirm()" [disabled]="!isValid">Apply</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .week-range { display: flex; gap: 16px; }
    .week-range mat-form-field { flex: 1; }
    .summary { margin-top: 8px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 13px; }
  `]
})
export class BulkBudgetComponent implements OnInit {
  data = inject<BulkBudgetData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BulkBudgetComponent>);

  selectedProjectId?: number;
  fromWeek = 0;
  toWeek = 0;
  fromDate: Date = new Date();
  toDate: Date = new Date();
  budgetHours = 0;
  year = new Date().getFullYear();

  get weekCount(): number {
    return this.toWeek >= this.fromWeek ? this.toWeek - this.fromWeek + 1 : 0;
  }

  get isValid(): boolean {
    return !!this.selectedProjectId && this.fromWeek > 0 && this.toWeek >= this.fromWeek && this.budgetHours >= 0;
  }

  ngOnInit() {
    this.year = this.data.year;
    this.fromWeek = this.data.weekFrom;
    this.toWeek = this.data.weekTo;
    this.fromDate = getWeekStart(this.year, this.fromWeek);
    this.toDate = getWeekStart(this.year, this.toWeek);
  }

  onFromChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.fromWeek = getISOWeek(date);
    this.fromDate = getWeekStart(this.year, this.fromWeek);
  }

  onToChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.toWeek = getISOWeek(date);
    this.toDate = getWeekStart(this.year, this.toWeek);
  }

  confirm() {
    if (!this.isValid) return;

    const budgets: ProjectBudgetUpsertDto[] = [];
    for (let week = this.fromWeek; week <= this.toWeek; week++) {
      budgets.push({
        projectId: this.selectedProjectId!,
        calendarWeek: week,
        year: this.year,
        budgetedHours: this.budgetHours
      });
    }

    this.dialogRef.close(budgets);
  }
}
