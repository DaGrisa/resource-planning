import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Absence, AbsenceType, AbsenceUpsertDto, Holiday, HolidayUpsertDto } from '../models';
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
    type?: AbsenceType;
  }): Observable<Absence[]> {
    let httpParams = new HttpParams()
      .set('year', params.year)
      .set('weekFrom', params.weekFrom)
      .set('weekTo', params.weekTo);
    if (params.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    if (params.type) httpParams = httpParams.set('type', params.type);
    return this.http.get<Absence[]>(this.url, { params: httpParams });
  }

  getHolidays(params: {
    year: number;
    weekFrom: number;
    weekTo: number;
  }): Observable<Holiday[]> {
    const httpParams = new HttpParams()
      .set('year', params.year)
      .set('weekFrom', params.weekFrom)
      .set('weekTo', params.weekTo);
    return this.http.get<Holiday[]>(`${this.url}/holidays`, { params: httpParams });
  }

  upsert(absences: AbsenceUpsertDto[]): Observable<void> {
    return this.http.put<void>(this.url, absences);
  }

  upsertHolidays(holidays: HolidayUpsertDto[]): Observable<void> {
    return this.http.put<void>(`${this.url}/holidays`, holidays);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
