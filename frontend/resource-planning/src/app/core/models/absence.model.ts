export type AbsenceType = 'Regular' | 'Holiday';

export interface Absence {
  id: number;
  employeeId: number;
  employeeName: string;
  calendarWeek: number;
  year: number;
  type: AbsenceType;
  hours: number;
  note?: string;
}

export interface AbsenceUpsertDto {
  employeeId: number;
  calendarWeek: number;
  year: number;
  hours: number;
  note?: string;
  type?: AbsenceType;
}

export interface Holiday {
  date: string;
  calendarWeek: number;
  year: number;
  note?: string;
}

export interface HolidayUpsertDto {
  date: string;
  originalDate?: string;
  note?: string;
}
