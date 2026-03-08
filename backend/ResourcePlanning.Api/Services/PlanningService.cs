using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class PlanningService : IPlanningService
{
    private readonly AppDbContext _db;

    public PlanningService(AppDbContext db) => _db = db;

    public async Task<List<CapacityAllocationDto>> GetAllocationsAsync(int year, int weekFrom, int weekTo,
        int? employeeId = null, int? projectId = null, int? departmentId = null)
    {
        var query = _db.CapacityAllocations
            .AsNoTracking()
            .Include(a => a.Employee)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo);

        if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId);
        if (projectId.HasValue) query = query.Where(a => a.ProjectId == projectId);
        if (departmentId.HasValue) query = query.Where(a => a.Employee.DepartmentId == departmentId);

        return await query.Select(a => new CapacityAllocationDto(
            a.Id, a.EmployeeId, a.ProjectId, a.CalendarWeek, a.Year, a.PlannedHours
        )).ToListAsync();
    }

    public async Task UpsertAllocationsAsync(List<AllocationUpsertDto> allocations)
    {
        if (allocations.Count == 0) return;

        // Batch-load all potentially matching records in a single query
        var employeeIds = allocations.Select(d => d.EmployeeId).Distinct().ToList();
        var projectIds = allocations.Select(d => d.ProjectId).Distinct().ToList();
        var years = allocations.Select(d => d.Year).Distinct().ToList();
        var calendarWeeks = allocations.Select(d => d.CalendarWeek).Distinct().ToList();

        var existingList = await _db.CapacityAllocations
            .Where(a => employeeIds.Contains(a.EmployeeId)
                     && projectIds.Contains(a.ProjectId)
                     && years.Contains(a.Year)
                     && calendarWeeks.Contains(a.CalendarWeek))
            .ToListAsync();

        var existingMap = existingList.ToDictionary(
            a => (a.EmployeeId, a.ProjectId, a.CalendarWeek, a.Year));

        await using var tx = await _db.Database.BeginTransactionAsync();
        foreach (var dto in allocations)
        {
            existingMap.TryGetValue((dto.EmployeeId, dto.ProjectId, dto.CalendarWeek, dto.Year), out var existing);

            if (dto.PlannedHours <= 0)
            {
                if (existing != null) _db.CapacityAllocations.Remove(existing);
            }
            else if (existing != null)
            {
                existing.PlannedHours = dto.PlannedHours;
            }
            else
            {
                _db.CapacityAllocations.Add(new CapacityAllocation
                {
                    EmployeeId = dto.EmployeeId,
                    ProjectId = dto.ProjectId,
                    CalendarWeek = dto.CalendarWeek,
                    Year = dto.Year,
                    PlannedHours = dto.PlannedHours
                });
            }
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    public async Task<List<EmployeeWeekOverviewDto>> GetOverviewAsync(int year, int weekFrom, int weekTo, int? departmentId = null)
    {
        var employeesQuery = _db.Employees
            .AsNoTracking()
            .Include(e => e.Department)
            .Where(e => e.IsActive);

        if (departmentId.HasValue)
            employeesQuery = employeesQuery.Where(e => e.DepartmentId == departmentId);

        var employees = await employeesQuery.OrderBy(e => e.LastName).ThenBy(e => e.FirstName).ToListAsync();

        var employeeIds = employees.Select(e => e.Id).ToList();

        var allocations = await _db.CapacityAllocations
            .AsNoTracking()
            .Include(a => a.Project)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => employeeIds.Contains(a.EmployeeId))
            .ToListAsync();

        var absences = await _db.Absences
            .AsNoTracking()
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => employeeIds.Contains(a.EmployeeId))
            .ToListAsync();

        // O(1) dictionary lookups instead of O(N) repeated LINQ filtering per employee/week
        var allocByKey = allocations
            .GroupBy(a => (a.EmployeeId, a.CalendarWeek))
            .ToDictionary(g => g.Key, g => g.ToList());

        var absenceHoursByKey = absences
            .GroupBy(a => (a.EmployeeId, a.CalendarWeek))
            .ToDictionary(g => g.Key, g => g.Sum(a => a.Hours));

        var result = new List<EmployeeWeekOverviewDto>();

        foreach (var emp in employees)
        {
            var weeks = new List<WeekSummaryDto>();

            for (int w = weekFrom; w <= weekTo; w++)
            {
                allocByKey.TryGetValue((emp.Id, w), out var weekAllocations);
                weekAllocations ??= [];
                absenceHoursByKey.TryGetValue((emp.Id, w), out var absenceHours);

                var totalHours = weekAllocations.Sum(a => a.PlannedHours) + absenceHours;
                var percentage = emp.WeeklyHours > 0 ? totalHours / emp.WeeklyHours * 100 : 0;
                var status = percentage > 100 ? "over" : percentage >= 80 ? "optimal" : "under";

                weeks.Add(new WeekSummaryDto(
                    w, year, totalHours, Math.Round(percentage, 1), status,
                    weekAllocations.Select(a => new ProjectAllocationDetailDto(
                        a.ProjectId, a.Project.Name, a.PlannedHours,
                        emp.WeeklyHours > 0 ? Math.Round(a.PlannedHours / emp.WeeklyHours * 100, 1) : 0
                    )).ToList(),
                    absenceHours
                ));
            }

            result.Add(new EmployeeWeekOverviewDto(
                emp.Id,
                emp.FirstName + " " + emp.LastName,
                emp.Department?.Name ?? "",
                emp.WeeklyHours,
                weeks
            ));
        }

        return result;
    }

    public async Task<EmployeeWeekOverviewDto?> GetEmployeeAllocationsAsync(int employeeId, int year, int weekFrom, int weekTo)
    {
        var emp = await _db.Employees.AsNoTracking().Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == employeeId);
        if (emp == null) return null;

        var result = await GetOverviewAsync(year, weekFrom, weekTo);
        return result.FirstOrDefault(r => r.EmployeeId == employeeId);
    }

    public async Task<List<ProjectWeekOverviewDto>> GetProjectOverviewAsync(int year, int weekFrom, int weekTo)
    {
        var projects = await _db.Projects
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .ToListAsync();

        var projectIds = projects.Select(p => p.Id).ToList();

        var allocations = await _db.CapacityAllocations
            .AsNoTracking()
            .Include(a => a.Employee)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => projectIds.Contains(a.ProjectId))
            .ToListAsync();

        var budgets = await _db.ProjectWeeklyBudgets
            .AsNoTracking()
            .Where(b => b.Year == year && b.CalendarWeek >= weekFrom && b.CalendarWeek <= weekTo)
            .Where(b => projectIds.Contains(b.ProjectId))
            .ToListAsync();

        // O(1) dictionary lookups
        var allocByKey = allocations
            .GroupBy(a => (a.ProjectId, a.CalendarWeek))
            .ToDictionary(g => g.Key, g => g.ToList());

        var budgetByKey = budgets
            .ToDictionary(b => (b.ProjectId, b.CalendarWeek), b => b.BudgetedHours);

        var result = new List<ProjectWeekOverviewDto>();

        foreach (var proj in projects)
        {
            var weeks = new List<ProjectWeekSummaryDto>();

            for (int w = weekFrom; w <= weekTo; w++)
            {
                allocByKey.TryGetValue((proj.Id, w), out var weekAllocations);
                weekAllocations ??= [];
                budgetByKey.TryGetValue((proj.Id, w), out var budgetedHours);

                var allocatedHours = weekAllocations.Sum(a => a.PlannedHours);
                var percentage = budgetedHours > 0 ? allocatedHours / budgetedHours * 100 : 0;
                var status = budgetedHours <= 0 ? "none" : percentage > 100 ? "over" : percentage >= 80 ? "optimal" : "under";

                weeks.Add(new ProjectWeekSummaryDto(
                    w, year, budgetedHours, allocatedHours, Math.Round(percentage, 1), status,
                    weekAllocations.Select(a => new EmployeeAllocationDetailDto(
                        a.EmployeeId, a.Employee.FirstName + " " + a.Employee.LastName, a.PlannedHours
                    )).ToList()
                ));
            }

            result.Add(new ProjectWeekOverviewDto(
                proj.Id, proj.Name, proj.ProjectType.ToString(), weeks
            ));
        }

        return result;
    }

    public async Task UpsertProjectBudgetsAsync(List<ProjectWeeklyBudgetUpsertDto> budgets)
    {
        if (budgets.Count == 0) return;

        var projectIds = budgets.Select(d => d.ProjectId).Distinct().ToList();
        var years = budgets.Select(d => d.Year).Distinct().ToList();
        var calendarWeeks = budgets.Select(d => d.CalendarWeek).Distinct().ToList();

        var existingList = await _db.ProjectWeeklyBudgets
            .Where(b => projectIds.Contains(b.ProjectId)
                     && years.Contains(b.Year)
                     && calendarWeeks.Contains(b.CalendarWeek))
            .ToListAsync();

        var existingMap = existingList.ToDictionary(
            b => (b.ProjectId, b.CalendarWeek, b.Year));

        await using var tx = await _db.Database.BeginTransactionAsync();
        foreach (var dto in budgets)
        {
            existingMap.TryGetValue((dto.ProjectId, dto.CalendarWeek, dto.Year), out var existing);

            if (dto.BudgetedHours <= 0)
            {
                if (existing != null) _db.ProjectWeeklyBudgets.Remove(existing);
            }
            else if (existing != null)
            {
                existing.BudgetedHours = dto.BudgetedHours;
            }
            else
            {
                _db.ProjectWeeklyBudgets.Add(new ProjectWeeklyBudget
                {
                    ProjectId = dto.ProjectId,
                    CalendarWeek = dto.CalendarWeek,
                    Year = dto.Year,
                    BudgetedHours = dto.BudgetedHours
                });
            }
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    }
}
