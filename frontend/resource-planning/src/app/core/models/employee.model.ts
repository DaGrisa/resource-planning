export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  weeklyHours: number;
  isActive: boolean;
  departmentId: number | null;
  departmentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCreateDto {
  firstName: string;
  lastName: string;
  email: string;
  weeklyHours: number;
  departmentId: number | null;
}

export interface EmployeeUpdateDto extends EmployeeCreateDto {
  isActive: boolean;
}
