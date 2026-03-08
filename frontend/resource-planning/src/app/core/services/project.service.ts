import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, ProjectCreateDto, ProjectUpdateDto, ProjectType } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/projects`;

  getAll(activeOnly = true, type?: ProjectType): Observable<Project[]> {
    let params = new HttpParams().set('activeOnly', activeOnly);
    if (type) params = params.set('type', type);
    return this.http.get<Project[]>(this.url, { params });
  }

  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.url}/${id}`);
  }

  create(dto: ProjectCreateDto): Observable<Project> {
    return this.http.post<Project>(this.url, dto);
  }

  update(id: number, dto: ProjectUpdateDto): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  setTeam(id: number, employeeIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/team`, employeeIds);
  }
}
