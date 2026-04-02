import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

const ADMIN_ONLY = ['Admin'] as const;
const ADMIN_OR_DEPARTMENT_MANAGER = ['Admin', 'DepartmentManager'] as const;
const ADMIN_OR_PROJECT_MANAGER = ['Admin', 'ProjectManager'] as const;
const PLANNING_ROLES = ['Admin', 'DepartmentManager', 'ProjectManager'] as const;

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'my-planning',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-planning/my-planning.component').then(m => m.MyPlanningComponent)
  },
  {
    path: 'employees',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/employees/employee-list/employee-list.component').then(m => m.EmployeeListComponent)
  },
  {
    path: 'employees/new',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/employees/employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
  },
  {
    path: 'employees/:id/edit',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/employees/employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
  },
  {
    path: 'departments',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/departments/department-list/department-list.component').then(m => m.DepartmentListComponent)
  },
  {
    path: 'departments/new',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/departments/department-form/department-form.component').then(m => m.DepartmentFormComponent)
  },
  {
    path: 'departments/:id/edit',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/departments/department-form/department-form.component').then(m => m.DepartmentFormComponent)
  },
  {
    path: 'projects',
    canActivate: [authGuard, roleGuard(...PLANNING_ROLES)],
    loadComponent: () => import('./features/projects/project-list/project-list.component').then(m => m.ProjectListComponent)
  },
  {
    path: 'projects/new',
    canActivate: [authGuard, roleGuard(...PLANNING_ROLES)],
    loadComponent: () => import('./features/projects/project-form/project-form.component').then(m => m.ProjectFormComponent)
  },
  {
    path: 'projects/:id/edit',
    canActivate: [authGuard, roleGuard(...PLANNING_ROLES)],
    loadComponent: () => import('./features/projects/project-form/project-form.component').then(m => m.ProjectFormComponent)
  },
  {
    path: 'projects/:id/team',
    canActivate: [authGuard, roleGuard(...PLANNING_ROLES)],
    loadComponent: () => import('./features/projects/project-team/project-team.component').then(m => m.ProjectTeamComponent)
  },
  {
    path: 'planning',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/planning/capacity-grid/capacity-grid.component').then(m => m.CapacityGridComponent)
  },
  {
    path: 'planning/projects',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_PROJECT_MANAGER)],
    loadComponent: () => import('./features/planning/project-planning/project-planning.component').then(m => m.ProjectPlanningComponent)
  },
  {
    path: 'planning/overview',
    canActivate: [authGuard],
    loadComponent: () => import('./features/planning/planning-overview/planning-overview.component').then(m => m.PlanningOverviewComponent)
  },
  {
    path: 'planning/project-overview',
    canActivate: [authGuard, roleGuard(...PLANNING_ROLES)],
    loadComponent: () => import('./features/planning/project-overview/project-overview.component').then(m => m.ProjectOverviewComponent)
  },
  {
    path: 'absences',
    canActivate: [authGuard, roleGuard(...ADMIN_OR_DEPARTMENT_MANAGER)],
    loadComponent: () => import('./features/absences/absence-list/absence-list.component').then(m => m.AbsenceListComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard(...ADMIN_ONLY)],
    loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent)
  },
  {
    path: 'users/new',
    canActivate: [authGuard, roleGuard(...ADMIN_ONLY)],
    loadComponent: () => import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent)
  },
  {
    path: 'users/:id/edit',
    canActivate: [authGuard, roleGuard(...ADMIN_ONLY)],
    loadComponent: () => import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent)
  },
];
