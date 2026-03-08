export type ProjectType = 'Customer' | 'Internal';

export interface Project {
  id: number;
  name: string;
  projectType: ProjectType;
  projectLeadId: number | null;
  projectLeadName?: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  teamMembers?: { employeeId: number; employeeName: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateDto {
  name: string;
  projectType: ProjectType;
  projectLeadId: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ProjectUpdateDto extends ProjectCreateDto {
  isActive: boolean;
}
