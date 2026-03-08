import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AllocationUpsertDto, CapacityAllocation, EmployeeWeekOverview, ProjectWeekOverview, ProjectBudgetUpsertDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/planning`;

  getAllocations(params: {
    year: number;
    weekFrom: number;
    weekTo: number;
    employeeId?: number;
    projectId?: number;
    departmentId?: number;
  }): Observable<CapacityAllocation[]> {
    let httpParams = new HttpParams()
      .set('year', params.year)
      .set('weekFrom', params.weekFrom)
      .set('weekTo', params.weekTo);
    if (params.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    return this.http.get<CapacityAllocation[]>(`${this.url}/allocations`, { params: httpParams });
  }

  upsertAllocations(allocations: AllocationUpsertDto[]): Observable<void> {
    return this.http.put<void>(`${this.url}/allocations`, allocations);
  }

  getOverview(params: {
    year: number;
    weekFrom: number;
    weekTo: number;
    departmentId?: number;
  }): Observable<EmployeeWeekOverview[]> {
    let httpParams = new HttpParams()
      .set('year', params.year)
      .set('weekFrom', params.weekFrom)
      .set('weekTo', params.weekTo);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    return this.http.get<EmployeeWeekOverview[]>(`${this.url}/overview`, { params: httpParams });
  }

  getEmployeeAllocations(employeeId: number, year: number, weekFrom: number, weekTo: number): Observable<EmployeeWeekOverview> {
    const params = new HttpParams()
      .set('year', year)
      .set('weekFrom', weekFrom)
      .set('weekTo', weekTo);
    return this.http.get<EmployeeWeekOverview>(`${this.url}/employee/${employeeId}`, { params });
  }

  getProjectOverview(params: {
    year: number;
    weekFrom: number;
    weekTo: number;
  }): Observable<ProjectWeekOverview[]> {
    const httpParams = new HttpParams()
      .set('year', params.year)
      .set('weekFrom', params.weekFrom)
      .set('weekTo', params.weekTo);
    return this.http.get<ProjectWeekOverview[]>(`${this.url}/project-overview`, { params: httpParams });
  }

  upsertProjectBudgets(budgets: ProjectBudgetUpsertDto[]): Observable<void> {
    return this.http.put<void>(`${this.url}/project-budgets`, budgets);
  }
}
