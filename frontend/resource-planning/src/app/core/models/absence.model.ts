export interface Absence {
  id: number;
  employeeId: number;
  employeeName: string;
  calendarWeek: number;
  year: number;
  hours: number;
  note?: string;
}

export interface AbsenceUpsertDto {
  employeeId: number;
  calendarWeek: number;
  year: number;
  hours: number;
  note?: string;
}
