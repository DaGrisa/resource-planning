using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using System.Globalization;

namespace ResourcePlanning.Api.Services;

public class PlanningService : IPlanningService
{
    private readonly AppDbContext _db;
    private readonly decimal _employeeOptimalThreshold;
    private readonly decimal _projectOptimalThresholdMin;
    private readonly decimal _projectOptimalThresholdMax;

    public PlanningService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _employeeOptimalThreshold = configuration.GetValue<decimal>("Planning:EmployeeOptimalThresholdPercent", 80);
        _projectOptimalThresholdMin = configuration.GetValue<decimal>("Planning:ProjectOptimalThresholdMinPercent", 90);
        _projectOptimalThresholdMax = configuration.GetValue<decimal>("Planning:ProjectOptimalThresholdMaxPercent", 110);

        if (_projectOptimalThresholdMax < _projectOptimalThresholdMin)
        {
            (_projectOptimalThresholdMin, _projectOptimalThresholdMax) = (_projectOptimalThresholdMax, _projectOptimalThresholdMin);
        }
    }

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
        await ServiceOperationHelpers.BatchUpsertAsync(
            _db,
            _db.CapacityAllocations,
            allocations,
            async dtos =>
            {
                var employeeIds = dtos.Select(d => d.EmployeeId).Distinct().ToList();
                var projectIds = dtos.Select(d => d.ProjectId).Distinct().ToList();
                var years = dtos.Select(d => d.Year).Distinct().ToList();
                var calendarWeeks = dtos.Select(d => d.CalendarWeek).Distinct().ToList();

                var existingList = await _db.CapacityAllocations
                    .Where(a => employeeIds.Contains(a.EmployeeId)
                             && projectIds.Contains(a.ProjectId)
                             && years.Contains(a.Year)
                             && calendarWeeks.Contains(a.CalendarWeek))
                    .ToListAsync();

                return existingList.ToDictionary(a => (a.EmployeeId, a.ProjectId, a.CalendarWeek, a.Year));
            },
            dto => (dto.EmployeeId, dto.ProjectId, dto.CalendarWeek, dto.Year),
            dto => dto.PlannedHours <= 0,
            (existing, dto) => existing.PlannedHours = dto.PlannedHours,
            dto => new CapacityAllocation
            {
                EmployeeId = dto.EmployeeId,
                ProjectId = dto.ProjectId,
                CalendarWeek = dto.CalendarWeek,
                Year = dto.Year,
                PlannedHours = dto.PlannedHours
            }
        );
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

        var regularAbsenceHoursByKey = absences
            .Where(a => a.Type == AbsenceType.Regular)
            .GroupBy(a => (a.EmployeeId, a.CalendarWeek))
            .ToDictionary(g => g.Key, g => g.Sum(a => a.Hours));

        var holidayHoursByKey = absences
            .Where(a => a.Type == AbsenceType.Holiday)
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
                regularAbsenceHoursByKey.TryGetValue((emp.Id, w), out var regularAbsenceHours);
                holidayHoursByKey.TryGetValue((emp.Id, w), out var holidayHours);

                var totalHours = weekAllocations.Sum(a => a.PlannedHours) + absenceHours;
                var percentage = emp.WeeklyHours > 0 ? totalHours / emp.WeeklyHours * 100 : 0;
                var status = percentage > 100 ? "over" : percentage >= _employeeOptimalThreshold ? "optimal" : "under";

                weeks.Add(new WeekSummaryDto(
                    w, year, totalHours, Math.Round(percentage, 1), status,
                    weekAllocations.Select(a => new ProjectAllocationDetailDto(
                        a.ProjectId, a.Project.Name, a.PlannedHours,
                        emp.WeeklyHours > 0 ? Math.Round(a.PlannedHours / emp.WeeklyHours * 100, 1) : 0
                    )).ToList(),
                    absenceHours,
                    regularAbsenceHours,
                    holidayHours
                ));
            }

            result.Add(new EmployeeWeekOverviewDto(
                emp.Id,
                emp.FullName(),
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

    public Task<ProjectPlanningThresholdsDto> GetProjectThresholdsAsync()
    {
        return Task.FromResult(new ProjectPlanningThresholdsDto(
            _projectOptimalThresholdMin,
            _projectOptimalThresholdMax
        ));
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
                var roundedPercentage = Math.Round(percentage, 1);
                var roundedPercentageForStatus = Math.Round(percentage, 0);
                var status = budgetedHours <= 0
                    ? "none"
                    : roundedPercentageForStatus > _projectOptimalThresholdMax
                        ? "over"
                        : roundedPercentageForStatus >= _projectOptimalThresholdMin
                            ? "optimal"
                            : "under";

                weeks.Add(new ProjectWeekSummaryDto(
                    w, year, budgetedHours, allocatedHours, roundedPercentage, status,
                    weekAllocations.Select(a => new EmployeeAllocationDetailDto(
                        a.EmployeeId, a.Employee.FullName(), a.PlannedHours
                    )).ToList()
                ));
            }

            result.Add(new ProjectWeekOverviewDto(
                proj.Id, proj.Name, proj.ProjectType.ToString(), weeks
            ));
        }

        return result;
    }

    public async Task<List<ProjectMonthOverviewDto>> GetProjectOverviewMonthlyAsync(int year, int weekFrom, int weekTo)
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

        var weekMonthShares = BuildWeekMonthShares(year, weekFrom, weekTo);
        var monthKeys = weekMonthShares.Values
            .SelectMany(v => v.Select(s => (s.Year, s.Month)))
            .Distinct()
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        var budgetByProjectMonth = new Dictionary<(int ProjectId, int Year, int Month), decimal>();
        foreach (var budget in budgets)
        {
            if (!weekMonthShares.TryGetValue(budget.CalendarWeek, out var shares)) continue;

            foreach (var share in shares)
            {
                var key = (budget.ProjectId, share.Year, share.Month);
                budgetByProjectMonth.TryGetValue(key, out var current);
                budgetByProjectMonth[key] = current + budget.BudgetedHours * share.Ratio;
            }
        }

        var allocatedByProjectMonth = new Dictionary<(int ProjectId, int Year, int Month), decimal>();
        var employeeByProjectMonth = new Dictionary<(int ProjectId, int Year, int Month), Dictionary<int, EmployeeAllocationDetailDto>>();

        foreach (var allocation in allocations)
        {
            if (!weekMonthShares.TryGetValue(allocation.CalendarWeek, out var shares)) continue;

            foreach (var share in shares)
            {
                var key = (allocation.ProjectId, share.Year, share.Month);
                var hours = allocation.PlannedHours * share.Ratio;

                allocatedByProjectMonth.TryGetValue(key, out var current);
                allocatedByProjectMonth[key] = current + hours;

                if (!employeeByProjectMonth.TryGetValue(key, out var employeeMap))
                {
                    employeeMap = [];
                    employeeByProjectMonth[key] = employeeMap;
                }

                if (employeeMap.TryGetValue(allocation.EmployeeId, out var existing))
                {
                    employeeMap[allocation.EmployeeId] = existing with { PlannedHours = existing.PlannedHours + hours };
                }
                else
                {
                    employeeMap[allocation.EmployeeId] = new EmployeeAllocationDetailDto(
                        allocation.EmployeeId,
                        allocation.Employee.FullName(),
                        hours
                    );
                }
            }
        }

        var result = new List<ProjectMonthOverviewDto>();

        foreach (var project in projects)
        {
            var months = new List<ProjectMonthSummaryDto>();

            foreach (var (monthYear, monthNumber) in monthKeys)
            {
                budgetByProjectMonth.TryGetValue((project.Id, monthYear, monthNumber), out var budgetedHoursRaw);
                allocatedByProjectMonth.TryGetValue((project.Id, monthYear, monthNumber), out var allocatedHoursRaw);

                var budgetedHours = Math.Round(budgetedHoursRaw, 2);
                var allocatedHours = Math.Round(allocatedHoursRaw, 2);
                var percentageRaw = budgetedHours > 0 ? allocatedHours / budgetedHours * 100 : 0;
                var percentage = Math.Round(percentageRaw, 1);
                var roundedPercentageForStatus = Math.Round(percentageRaw, 0);

                var status = budgetedHours <= 0
                    ? "none"
                    : roundedPercentageForStatus > _projectOptimalThresholdMax
                        ? "over"
                        : roundedPercentageForStatus >= _projectOptimalThresholdMin
                            ? "optimal"
                            : "under";

                var allocationsForMonth = employeeByProjectMonth.TryGetValue((project.Id, monthYear, monthNumber), out var employeeMap)
                    ? employeeMap.Values
                        .Where(a => a.PlannedHours > 0)
                        .OrderBy(a => a.EmployeeName)
                        .Select(a => a with { PlannedHours = Math.Round(a.PlannedHours, 2) })
                        .ToList()
                    : [];

                months.Add(new ProjectMonthSummaryDto(
                    monthYear,
                    monthNumber,
                    budgetedHours,
                    allocatedHours,
                    percentage,
                    status,
                    allocationsForMonth
                ));
            }

            result.Add(new ProjectMonthOverviewDto(
                project.Id,
                project.Name,
                project.ProjectType.ToString(),
                months
            ));
        }

        return result;
    }

    private static Dictionary<int, List<MonthShare>> BuildWeekMonthShares(int year, int weekFrom, int weekTo)
    {
        var result = new Dictionary<int, List<MonthShare>>();

        for (var week = weekFrom; week <= weekTo; week++)
        {
            var weekStart = ISOWeek.ToDateTime(year, week, DayOfWeek.Monday);
            var dayCounts = new Dictionary<(int Year, int Month), int>();

            for (var day = 0; day < 5; day++)
            {
                var date = weekStart.AddDays(day);
                var key = (date.Year, date.Month);
                dayCounts.TryGetValue(key, out var count);
                dayCounts[key] = count + 1;
            }

            result[week] = dayCounts
                .Select(kvp => new MonthShare(kvp.Key.Year, kvp.Key.Month, kvp.Value / 5m))
                .OrderBy(s => s.Year)
                .ThenBy(s => s.Month)
                .ToList();
        }

        return result;
    }

    private sealed record MonthShare(int Year, int Month, decimal Ratio);

    public async Task UpsertProjectBudgetsAsync(List<ProjectWeeklyBudgetUpsertDto> budgets)
    {
        await ServiceOperationHelpers.BatchUpsertAsync(
            _db,
            _db.ProjectWeeklyBudgets,
            budgets,
            async dtos =>
            {
                var projectIds = dtos.Select(d => d.ProjectId).Distinct().ToList();
                var years = dtos.Select(d => d.Year).Distinct().ToList();
                var calendarWeeks = dtos.Select(d => d.CalendarWeek).Distinct().ToList();

                var existingList = await _db.ProjectWeeklyBudgets
                    .Where(b => projectIds.Contains(b.ProjectId)
                             && years.Contains(b.Year)
                             && calendarWeeks.Contains(b.CalendarWeek))
                    .ToListAsync();

                return existingList.ToDictionary(b => (b.ProjectId, b.CalendarWeek, b.Year));
            },
            dto => (dto.ProjectId, dto.CalendarWeek, dto.Year),
            dto => dto.BudgetedHours <= 0,
            (existing, dto) => existing.BudgetedHours = dto.BudgetedHours,
            dto => new ProjectWeeklyBudget
            {
                ProjectId = dto.ProjectId,
                CalendarWeek = dto.CalendarWeek,
                Year = dto.Year,
                BudgetedHours = dto.BudgetedHours
            }
        );
    }
}
