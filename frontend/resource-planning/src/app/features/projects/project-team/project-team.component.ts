import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../core/services/project.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee, Project } from '../../../core/models';

@Component({
  selector: 'app-project-team',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatListModule, MatCheckboxModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <h1>Team Assignment: {{ project?.name }}</h1>
    </div>

    <div class="team-list">
      @for (emp of employees; track emp.id) {
        <mat-checkbox
          [checked]="selectedIds.has(emp.id)"
          (change)="toggle(emp.id)">
          {{ emp.firstName }} {{ emp.lastName }} ({{ emp.departmentName || 'No dept' }})
        </mat-checkbox>
      }
    </div>

    <div class="form-actions">
      <a mat-button routerLink="/projects">Back</a>
      <button mat-flat-button (click)="save()">Save Team</button>
    </div>
  `,
  styles: [`
    .team-list { display: flex; flex-direction: column; gap: 8px; max-width: 500px; margin: 16px 0; }
  `]
})
export class ProjectTeamComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private employeeService = inject(EmployeeService);
  private snackBar = inject(MatSnackBar);

  project: Project | null = null;
  employees: Employee[] = [];
  selectedIds = new Set<number>();

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;

    forkJoin([
      this.projectService.getById(id),
      this.employeeService.getAll()
    ]).subscribe(([project, employees]) => {
      this.project = project;
      this.employees = employees;
      project.teamMembers?.forEach(m => this.selectedIds.add(m.employeeId));
    });
  }

  toggle(id: number) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  save() {
    if (!this.project) return;
    this.projectService.setTeam(this.project.id, Array.from(this.selectedIds)).subscribe(() => {
      this.snackBar.open('Team updated', 'OK', { duration: 3000 });
    });
  }
}
