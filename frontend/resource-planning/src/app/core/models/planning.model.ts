export interface CapacityAllocation {
  id?: number;
  employeeId: number;
  projectId: number;
  calendarWeek: number;
  year: number;
  plannedHours: number;
}

export interface AllocationUpsertDto {
  employeeId: number;
  projectId: number;
  calendarWeek: number;
  year: number;
  plannedHours: number;
}

export interface EmployeeWeekOverview {
  employeeId: number;
  employeeName: string;
  departmentName: string;
  weeklyHours: number;
  weeks: WeekSummary[];
}

export interface WeekSummary {
  calendarWeek: number;
  year: number;
  totalPlannedHours: number;
  percentage: number;
  status: 'under' | 'optimal' | 'over';
  allocations: ProjectAllocationDetail[];
  absenceHours: number;
}

export interface ProjectAllocationDetail {
  projectId: number;
  projectName: string;
  plannedHours: number;
  percentage: number;
}

export interface ProjectWeekOverview {
  projectId: number;
  projectName: string;
  projectType: string;
  weeks: ProjectWeekSummary[];
}

export interface ProjectWeekSummary {
  calendarWeek: number;
  year: number;
  budgetedHours: number;
  allocatedHours: number;
  percentage: number;
  status: 'none' | 'under' | 'optimal' | 'over';
  allocations: EmployeeAllocationDetail[];
}

export interface EmployeeAllocationDetail {
  employeeId: number;
  employeeName: string;
  plannedHours: number;
}

export interface ProjectBudgetUpsertDto {
  projectId: number;
  calendarWeek: number;
  year: number;
  budgetedHours: number;
}
