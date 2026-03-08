import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Project, ProjectAllocationDetail } from '../../../core/models';

export interface CellEditorData {
  employeeId: number;
  employeeName: string;
  weeklyHours: number;
  calendarWeek: number;
  year: number;
  allocations: ProjectAllocationDetail[];
  projects: Project[];
}

@Component({
  selector: 'app-cell-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.employeeName }} — CW {{ data.calendarWeek }}/{{ data.year }}</h2>
    <mat-dialog-content>
      <div class="info">Weekly capacity: {{ data.weeklyHours }}h</div>

      @for (alloc of allocations; track alloc.projectId; let i = $index) {
        <div class="alloc-row">
          <mat-form-field class="project-field">
            <mat-label>Project</mat-label>
            <mat-select [(ngModel)]="alloc.projectId" (selectionChange)="onProjectChange(i)">
              @for (p of availableProjects(alloc.projectId); track p.id) {
                <mat-option [value]="p.id">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field class="hours-field">
            <mat-label>Hours</mat-label>
            <input matInput type="number" [(ngModel)]="alloc.plannedHours" min="0" step="0.5" (ngModelChange)="updatePercentages()" />
          </mat-form-field>

          <span class="pct">{{ alloc.percentage | number:'1.0-0' }}%</span>

          <button mat-icon-button (click)="removeAllocation(i)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <button mat-button (click)="addAllocation()" [disabled]="availableProjects(0).length === 0">
        <mat-icon>add</mat-icon> Add Project
      </button>

      <div class="total" [class.over]="totalHours > data.weeklyHours">
        Total: {{ totalHours | number:'1.1-1' }}h / {{ data.weeklyHours }}h ({{ totalPercentage | number:'1.0-0' }}%)
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="confirm()">Apply</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .info { margin-bottom: 16px; color: #666; }
    .alloc-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .project-field { flex: 1; }
    .hours-field { width: 100px; }
    .pct { width: 50px; text-align: right; font-size: 13px; color: #666; }
    .total { margin-top: 16px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-weight: 500; }
    .total.over { background: #ffcdd2; color: #c62828; }
  `]
})
export class CellEditorComponent implements OnInit {
  data = inject<CellEditorData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CellEditorComponent>);

  allocations: ProjectAllocationDetail[] = [];

  get totalHours(): number {
    return this.allocations.reduce((sum, a) => sum + (a.plannedHours || 0), 0);
  }

  get totalPercentage(): number {
    return this.data.weeklyHours > 0 ? this.totalHours / this.data.weeklyHours * 100 : 0;
  }

  ngOnInit() {
    this.allocations = this.data.allocations.map(a => ({ ...a }));
  }

  availableProjects(currentProjectId: number): Project[] {
    const usedIds = new Set(this.allocations.map(a => a.projectId).filter(id => id !== currentProjectId));
    return this.data.projects.filter(p => !usedIds.has(p.id));
  }

  onProjectChange(index: number) {
    const project = this.data.projects.find(p => p.id === this.allocations[index].projectId);
    if (project) {
      this.allocations[index].projectName = project.name;
    }
  }

  addAllocation() {
    const available = this.availableProjects(0);
    if (available.length === 0) return;
    this.allocations.push({
      projectId: available[0].id,
      projectName: available[0].name,
      plannedHours: 0,
      percentage: 0
    });
  }

  removeAllocation(index: number) {
    // Set hours to 0 so the backend deletes it
    this.allocations[index].plannedHours = 0;
    this.updatePercentages();
  }

  updatePercentages() {
    for (const alloc of this.allocations) {
      alloc.percentage = this.data.weeklyHours > 0 ? alloc.plannedHours / this.data.weeklyHours * 100 : 0;
    }
  }

  confirm() {
    // Include zero-hour allocations so the backend deletes them
    this.dialogRef.close(this.allocations);
  }
}
