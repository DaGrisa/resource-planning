import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, EmployeeCreateDto, EmployeeUpdateDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/employees`;

  getAll(activeOnly = true, departmentId?: number): Observable<Employee[]> {
    let params = new HttpParams().set('activeOnly', activeOnly);
    if (departmentId) params = params.set('departmentId', departmentId);
    return this.http.get<Employee[]>(this.url, { params });
  }

  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/${id}`);
  }

  create(dto: EmployeeCreateDto): Observable<Employee> {
    return this.http.post<Employee>(this.url, dto);
  }

  update(id: number, dto: EmployeeUpdateDto): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
