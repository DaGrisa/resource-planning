export interface Department {
  id: number;
  name: string;
  leadManagerId: number | null;
  leadManagerName?: string;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
  managers?: DepartmentManagerDto[];
  employees?: { id: number; firstName: string; lastName: string; email: string }[];
}

export interface DepartmentManagerDto {
  employeeId: number;
  employeeName: string;
}

export interface DepartmentCreateDto {
  name: string;
  leadManagerId: number | null;
}

export interface DepartmentUpdateDto extends DepartmentCreateDto {}
