using System.ComponentModel.DataAnnotations;

namespace ResourcePlanning.Api.DTOs;

public record CapacityAllocationDto(
    int Id,
    int EmployeeId,
    int ProjectId,
    int CalendarWeek,
    int Year,
    decimal PlannedHours
);

public record AllocationUpsertDto(
    [Required] int EmployeeId,
    [Required] int ProjectId,
    [Range(1, 53)] int CalendarWeek,
    [Range(2000, 2100)] int Year,
    [Range(0, 168)] decimal PlannedHours
);

public record EmployeeWeekOverviewDto(
    int EmployeeId,
    string EmployeeName,
    string DepartmentName,
    decimal WeeklyHours,
    List<WeekSummaryDto> Weeks
);

public record WeekSummaryDto(
    int CalendarWeek,
    int Year,
    decimal TotalPlannedHours,
    decimal Percentage,
    string Status,
    List<ProjectAllocationDetailDto> Allocations,
    decimal AbsenceHours = 0
);

public record ProjectAllocationDetailDto(
    int ProjectId,
    string ProjectName,
    decimal PlannedHours,
    decimal Percentage
);

public record ProjectWeeklyBudgetUpsertDto(
    [Required] int ProjectId,
    [Range(1, 53)] int CalendarWeek,
    [Range(2000, 2100)] int Year,
    [Range(0, 1000)] decimal BudgetedHours
);

public record ProjectWeekOverviewDto(
    int ProjectId,
    string ProjectName,
    string ProjectType,
    List<ProjectWeekSummaryDto> Weeks
);

public record ProjectWeekSummaryDto(
    int CalendarWeek,
    int Year,
    decimal BudgetedHours,
    decimal AllocatedHours,
    decimal Percentage,
    string Status,
    List<EmployeeAllocationDetailDto> Allocations
);

public record EmployeeAllocationDetailDto(
    int EmployeeId,
    string EmployeeName,
    decimal PlannedHours
);
