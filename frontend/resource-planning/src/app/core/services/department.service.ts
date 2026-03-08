import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Department, DepartmentCreateDto, DepartmentUpdateDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/departments`;

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.url);
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.url}/${id}`);
  }

  create(dto: DepartmentCreateDto): Observable<Department> {
    return this.http.post<Department>(this.url, dto);
  }

  update(id: number, dto: DepartmentUpdateDto): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  setManagers(id: number, employeeIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/managers`, employeeIds);
  }
}
