import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project, ProjectType } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatChipsModule, MatSlideToggleModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-header">
      <h1>Projects</h1>
      @if (authService.hasAnyRole('Admin', 'DepartmentManager', 'ProjectManager')) {
        <a mat-flat-button routerLink="/projects/new">
          <mat-icon>add</mat-icon> New Project
        </a>
      }
    </div>

    <div class="filters">
      <mat-form-field>
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="typeFilter" (selectionChange)="load()">
          <mat-option [value]="undefined">All</mat-option>
          <mat-option value="Customer">Customer</mat-option>
          <mat-option value="Internal">Internal</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-slide-toggle [checked]="showInactive" (change)="showInactive = $event.checked; load()">Show inactive</mat-slide-toggle>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && projects.length === 0 && !showInactive) {
      <div class="empty-state">No projects yet. Click "New Project" to get started.</div>
    }

    @if (!loading && projects.length > 0) {
    <table mat-table [dataSource]="projects" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let p">{{ p.name }}</td>
      </ng-container>

      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>Type</th>
        <td mat-cell *matCellDef="let p">
          <span class="type-badge" [attr.data-type]="p.projectType">{{ p.projectType }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="lead">
        <th mat-header-cell *matHeaderCellDef>Project Lead</th>
        <td mat-cell *matCellDef="let p">{{ p.projectLeadName || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="dates">
        <th mat-header-cell *matHeaderCellDef>Period</th>
        <td mat-cell *matCellDef="let p">
          {{ p.startDate ? (p.startDate | date:'shortDate') : '—' }}
          –
          {{ p.endDate ? (p.endDate | date:'shortDate') : 'ongoing' }}
        </td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let p">
          <span [class.inactive]="!p.isActive">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let p">
          <a mat-icon-button [routerLink]="['/projects', p.id, 'edit']"><mat-icon>edit</mat-icon></a>
          <a mat-icon-button [routerLink]="['/projects', p.id, 'team']"><mat-icon>group</mat-icon></a>
          <button mat-icon-button (click)="confirmDelete(p)" *ngIf="p.isActive"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
    }
  `,
  styles: [`
    .type-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #e0e0e0; }
    .type-badge[data-type="Customer"] { background: #bbdefb; }
    .type-badge[data-type="Internal"] { background: #c8e6c9; }
  `]
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  authService = inject(AuthService);

  projects: Project[] = [];
  loading = false;
  typeFilter?: ProjectType;
  showInactive = false;
  displayedColumns = ['name', 'type', 'lead', 'dates', 'status', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.projectService.getAll(!this.showInactive, this.typeFilter).pipe(
      finalize(() => this.loading = false)
    ).subscribe(d => this.projects = d);
  }

  confirmDelete(project: Project) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Deactivate Project', message: `Deactivate "${project.name}"?`, confirmText: 'Deactivate' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.projectService.delete(project.id).subscribe(() => {
          this.snackBar.open('Project deactivated', 'OK', { duration: 3000 });
          this.load();
        });
      }
    });
  }
}
