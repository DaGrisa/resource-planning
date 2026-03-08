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
        foreach (var dto in allocations)
        {
            var existing = await _db.CapacityAllocations.FirstOrDefaultAsync(a =>
                a.EmployeeId == dto.EmployeeId &&
                a.ProjectId == dto.ProjectId &&
                a.CalendarWeek == dto.CalendarWeek &&
                a.Year == dto.Year);

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
    }

    public async Task<List<EmployeeWeekOverviewDto>> GetOverviewAsync(int year, int weekFrom, int weekTo, int? departmentId = null)
    {
        var employeesQuery = _db.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive);

        if (departmentId.HasValue)
            employeesQuery = employeesQuery.Where(e => e.DepartmentId == departmentId);

        var employees = await employeesQuery.OrderBy(e => e.LastName).ThenBy(e => e.FirstName).ToListAsync();

        var employeeIds = employees.Select(e => e.Id).ToList();

        var allocations = await _db.CapacityAllocations
            .Include(a => a.Project)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => employeeIds.Contains(a.EmployeeId))
            .ToListAsync();

        var absences = await _db.Absences
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => employeeIds.Contains(a.EmployeeId))
            .ToListAsync();

        var result = new List<EmployeeWeekOverviewDto>();

        foreach (var emp in employees)
        {
            var empAllocations = allocations.Where(a => a.EmployeeId == emp.Id).ToList();
            var empAbsences = absences.Where(a => a.EmployeeId == emp.Id).ToList();
            var weeks = new List<WeekSummaryDto>();

            for (int w = weekFrom; w <= weekTo; w++)
            {
                var weekAllocations = empAllocations.Where(a => a.CalendarWeek == w).ToList();
                var absenceHours = empAbsences.Where(a => a.CalendarWeek == w).Sum(a => a.Hours);
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
        var emp = await _db.Employees.Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == employeeId);
        if (emp == null) return null;

        var result = await GetOverviewAsync(year, weekFrom, weekTo);
        return result.FirstOrDefault(r => r.EmployeeId == employeeId);
    }

    public async Task<List<ProjectWeekOverviewDto>> GetProjectOverviewAsync(int year, int weekFrom, int weekTo)
    {
        var projects = await _db.Projects.Where(p => p.IsActive).OrderBy(p => p.Name).ToListAsync();

        var allocations = await _db.CapacityAllocations
            .Include(a => a.Employee)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => projects.Select(p => p.Id).Contains(a.ProjectId))
            .ToListAsync();

        var budgets = await _db.ProjectWeeklyBudgets
            .Where(b => b.Year == year && b.CalendarWeek >= weekFrom && b.CalendarWeek <= weekTo)
            .Where(b => projects.Select(p => p.Id).Contains(b.ProjectId))
            .ToListAsync();

        var result = new List<ProjectWeekOverviewDto>();

        foreach (var proj in projects)
        {
            var projAllocations = allocations.Where(a => a.ProjectId == proj.Id).ToList();
            var projBudgets = budgets.Where(b => b.ProjectId == proj.Id).ToList();
            var weeks = new List<ProjectWeekSummaryDto>();

            for (int w = weekFrom; w <= weekTo; w++)
            {
                var weekAllocations = projAllocations.Where(a => a.CalendarWeek == w).ToList();
                var weekBudget = projBudgets.FirstOrDefault(b => b.CalendarWeek == w);
                var allocatedHours = weekAllocations.Sum(a => a.PlannedHours);
                var budgetedHours = weekBudget?.BudgetedHours ?? 0;
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
        foreach (var dto in budgets)
        {
            var existing = await _db.ProjectWeeklyBudgets.FirstOrDefaultAsync(b =>
                b.ProjectId == dto.ProjectId &&
                b.CalendarWeek == dto.CalendarWeek &&
                b.Year == dto.Year);

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
    }
}
