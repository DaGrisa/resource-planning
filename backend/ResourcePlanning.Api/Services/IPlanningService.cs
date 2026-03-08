using ResourcePlanning.Api.DTOs;

namespace ResourcePlanning.Api.Services;

public interface IPlanningService
{
    Task<List<CapacityAllocationDto>> GetAllocationsAsync(int year, int weekFrom, int weekTo,
        int? employeeId = null, int? projectId = null, int? departmentId = null);
    Task UpsertAllocationsAsync(List<AllocationUpsertDto> allocations);
    Task<List<EmployeeWeekOverviewDto>> GetOverviewAsync(int year, int weekFrom, int weekTo, int? departmentId = null);
    Task<EmployeeWeekOverviewDto?> GetEmployeeAllocationsAsync(int employeeId, int year, int weekFrom, int weekTo);
    Task<List<ProjectWeekOverviewDto>> GetProjectOverviewAsync(int year, int weekFrom, int weekTo);
    Task UpsertProjectBudgetsAsync(List<ProjectWeeklyBudgetUpsertDto> budgets);
}
