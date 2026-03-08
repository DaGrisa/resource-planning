import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Absence, AbsenceUpsertDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AbsenceService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/absences`;

  getAll(params: {
    year: number;
    weekFrom: number;
    weekTo: number;
    employeeId?: number;
    departmentId?: number;
  }): Observable<Absence[]> {
    let httpParams = new HttpParams()
      .set('year', params.year)
      .set('weekFrom', params.weekFrom)
      .set('weekTo', params.weekTo);
    if (params.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    return this.http.get<Absence[]>(this.url, { params: httpParams });
  }

  upsert(absences: AbsenceUpsertDto[]): Observable<void> {
    return this.http.put<void>(this.url, absences);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
