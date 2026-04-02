using Microsoft.Extensions.Configuration;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class PlanningServiceTests : ServiceTestBase
{
    private static readonly IConfiguration DefaultConfig = new ConfigurationBuilder().Build();

    private static IConfiguration CreateConfig(decimal? employeeThreshold = null, decimal? projectMinThreshold = null, decimal? projectMaxThreshold = null)
    {
        var values = new Dictionary<string, string?>();

        if (employeeThreshold.HasValue)
            values["Planning:EmployeeOptimalThresholdPercent"] = employeeThreshold.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);

        if (projectMinThreshold.HasValue)
            values["Planning:ProjectOptimalThresholdMinPercent"] = projectMinThreshold.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);

        if (projectMaxThreshold.HasValue)
            values["Planning:ProjectOptimalThresholdMaxPercent"] = projectMaxThreshold.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private async Task<(int empId, int projId)> SeedEmployeeAndProject(Api.Data.AppDbContext db)
    {
        var empService = new EmployeeService(db);
        var projService = new ProjectService(db);

        var emp = await empService.CreateAsync(new EmployeeCreateDto("Test", "User", "test@t.com", 40m));
        var proj = await projService.CreateAsync(new ProjectCreateDto("TestProject", ProjectType.Customer));
        return (emp.Id, proj.Id);
    }

    [Fact]
    public async Task UpsertAllocations_ShouldCreate_WhenNew()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 20m)
        });

        var result = await service.GetAllocationsAsync(2026, 6, 6);
        Assert.Single(result);
        Assert.Equal(20m, result[0].PlannedHours);
    }

    [Fact]
    public async Task UpsertAllocations_ShouldUpdate_WhenExisting()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 20m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 35m)
        });

        var result = await service.GetAllocationsAsync(2026, 6, 6);
        Assert.Single(result);
        Assert.Equal(35m, result[0].PlannedHours);
    }

    [Fact]
    public async Task UpsertAllocations_ShouldDelete_WhenZeroHours()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 20m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 0m)
        });

        var result = await service.GetAllocationsAsync(2026, 6, 6);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetOverview_ShouldComputeCorrectStatus()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        // 35h / 40h = 87.5% → optimal
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 35m)
        });

        var overview = await service.GetOverviewAsync(2026, 6, 6);
        Assert.Single(overview);
        Assert.Equal("optimal", overview[0].Weeks[0].Status);
        Assert.Equal(87.5m, overview[0].Weeks[0].Percentage);
    }

    [Fact]
    public async Task GetOverview_ShouldReturnOverStatus_WhenExceeding()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var projService = new ProjectService(db);
        var proj2 = await projService.CreateAsync(new ProjectCreateDto("P2", ProjectType.Internal));

        var service = new PlanningService(db, DefaultConfig);

        // 30h + 15h = 45h / 40h = 112.5% → over
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 30m),
            new(empId, proj2.Id, 6, 2026, 15m)
        });

        var overview = await service.GetOverviewAsync(2026, 6, 6);
        Assert.Equal("over", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetOverview_ShouldReturnUnderStatus_WhenBelowThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        // 10h / 40h = 25% → under
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 10m)
        });

        var overview = await service.GetOverviewAsync(2026, 6, 6);
        Assert.Equal("under", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetOverview_ShouldUseConfiguredEmployeeThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(employeeThreshold: 90m, projectMinThreshold: 70m, projectMaxThreshold: 95m);
        var service = new PlanningService(db, config);

        // 35h / 40h = 87.5% -> under when employee threshold is 90%
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 35m)
        });

        var overview = await service.GetOverviewAsync(2026, 6, 6);
        Assert.Equal("under", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetAllocations_ShouldFilterByWeekRange()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 5, 2026, 10m),
            new(empId, projId, 6, 2026, 20m),
            new(empId, projId, 7, 2026, 30m),
            new(empId, projId, 8, 2026, 40m)
        });

        var result = await service.GetAllocationsAsync(2026, 6, 7);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetEmployeeAllocationsAsync_ShouldReturnNull_WhenNotFound()
    {
        using var db = Factory.CreateContext();
        var service = new PlanningService(db, DefaultConfig);

        var result = await service.GetEmployeeAllocationsAsync(999, 2026, 1, 10);
        Assert.Null(result);
    }

    [Fact]
    public async Task UpsertProjectBudgets_ShouldCreate_WhenNew()
    {
        using var db = Factory.CreateContext();
        var (_, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 80m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Single(overview);
        Assert.Equal(80m, overview[0].Weeks[0].BudgetedHours);
    }

    [Fact]
    public async Task UpsertProjectBudgets_ShouldUpdate_WhenExisting()
    {
        using var db = Factory.CreateContext();
        var (_, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 80m)
        });
        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 100m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal(100m, overview[0].Weeks[0].BudgetedHours);
    }

    [Fact]
    public async Task UpsertProjectBudgets_ShouldDelete_WhenZeroHours()
    {
        using var db = Factory.CreateContext();
        var (_, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 80m)
        });
        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 0m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal(0m, overview[0].Weeks[0].BudgetedHours);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldComputeOptimalStatus()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(projectMinThreshold: 80m, projectMaxThreshold: 100m);
        var service = new PlanningService(db, config);

        // Budget 40h, allocate 35h → 87.5% → optimal
        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 40m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 35m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal("optimal", overview[0].Weeks[0].Status);
        Assert.Equal(87.5m, overview[0].Weeks[0].Percentage);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldComputeOverStatus()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        // Budget 20h, allocate 25h → 125% → over
        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 20m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 25m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal("over", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldReturnUnder_WhenBelowProjectMinThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(projectMinThreshold: 85m, projectMaxThreshold: 95m);
        var service = new PlanningService(db, config);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 100m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 80m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal("under", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldReturnOver_WhenAboveProjectMaxThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(projectMinThreshold: 85m, projectMaxThreshold: 95m);
        var service = new PlanningService(db, config);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 100m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 98m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal("over", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldUseProjectThresholds_IndependentOfEmployeeThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(employeeThreshold: 95m, projectMinThreshold: 80m, projectMaxThreshold: 90m);
        var service = new PlanningService(db, config);

        // 85 / 100 = 85% -> optimal for project range [80,90], regardless of employee threshold 95%
        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 100m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 85m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal("optimal", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldReturnOptimal_WhenPercentageEqualsMaxThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(projectMinThreshold: 90m, projectMaxThreshold: 110m);
        var service = new PlanningService(db, config);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 10m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 11m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal(110m, overview[0].Weeks[0].Percentage);
        Assert.Equal("optimal", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldReturnOptimal_WhenDisplayedPercentRoundsToMaxThreshold()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(projectMinThreshold: 90m, projectMaxThreshold: 110m);
        var service = new PlanningService(db, config);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 10m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 11.04m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal(110.4m, overview[0].Weeks[0].Percentage);
        Assert.Equal("optimal", overview[0].Weeks[0].Status);
    }

    [Fact]
    public async Task GetProjectThresholds_ShouldReturnConfiguredValues()
    {
        using var db = Factory.CreateContext();
        var config = CreateConfig(projectMinThreshold: 90m, projectMaxThreshold: 110m);
        var service = new PlanningService(db, config);

        var thresholds = await service.GetProjectThresholdsAsync();

        Assert.Equal(90m, thresholds.OptimalMinPercent);
        Assert.Equal(110m, thresholds.OptimalMaxPercent);
    }

    [Fact]
    public async Task GetProjectOverview_ShouldShowEmployeeBreakdown()
    {
        using var db = Factory.CreateContext();
        var empService = new EmployeeService(db);
        var projService = new ProjectService(db);

        var emp1 = await empService.CreateAsync(new EmployeeCreateDto("Alice", "A", "alice@t.com", 40m));
        var emp2 = await empService.CreateAsync(new EmployeeCreateDto("Bob", "B", "bob@t.com", 40m));
        var proj = await projService.CreateAsync(new ProjectCreateDto("Proj", ProjectType.Customer));

        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(proj.Id, 6, 2026, 50m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(emp1.Id, proj.Id, 6, 2026, 20m),
            new(emp2.Id, proj.Id, 6, 2026, 15m)
        });

        var overview = await service.GetProjectOverviewAsync(2026, 6, 6);
        Assert.Equal(35m, overview[0].Weeks[0].AllocatedHours);
        Assert.Equal(2, overview[0].Weeks[0].Allocations.Count);
    }

    [Fact]
    public async Task GetProjectOverviewMonthly_ShouldSplitWeekHoursAcrossMonthBoundaries_ByWorkdays()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

        // ISO week 14 of 2026 starts on Mar 30 (Mon) and spans Mar/Apr weekdays as 2/5 and 3/5.
        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 14, 2026, 50m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 14, 2026, 25m)
        });

        var monthly = await service.GetProjectOverviewMonthlyAsync(2026, 14, 14);
        var project = Assert.Single(monthly);
        Assert.Equal(2, project.Months.Count);

        var march = project.Months.Single(m => m.Month == 3 && m.Year == 2026);
        var april = project.Months.Single(m => m.Month == 4 && m.Year == 2026);

        Assert.Equal(20m, march.BudgetedHours);
        Assert.Equal(10m, march.AllocatedHours);
        Assert.Equal(50m, march.Percentage);
        Assert.Equal("under", march.Status);
        Assert.Equal(10m, Assert.Single(march.Allocations).PlannedHours);

        Assert.Equal(30m, april.BudgetedHours);
        Assert.Equal(15m, april.AllocatedHours);
        Assert.Equal(50m, april.Percentage);
        Assert.Equal("under", april.Status);
        Assert.Equal(15m, Assert.Single(april.Allocations).PlannedHours);
    }

    [Fact]
    public async Task GetProjectOverviewMonthly_ShouldUseProjectThresholds_ForStatus()
    {
        using var db = Factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var config = CreateConfig(projectMinThreshold: 90m, projectMaxThreshold: 110m);
        var service = new PlanningService(db, config);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(projId, 6, 2026, 10m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, projId, 6, 2026, 11.04m)
        });

        var monthly = await service.GetProjectOverviewMonthlyAsync(2026, 6, 6);
        var month = Assert.Single(Assert.Single(monthly).Months);

        Assert.Equal(110.4m, month.Percentage);
        Assert.Equal("optimal", month.Status);
    }

    [Fact]
    public async Task GetProjectOverviewMonthly_ShouldReturnAllActiveProjects_WithMonthCells()
    {
        using var db = Factory.CreateContext();
        var empService = new EmployeeService(db);
        var projService = new ProjectService(db);

        var emp = await empService.CreateAsync(new EmployeeCreateDto("Test", "User", "test-all-projects@t.com", 40m));
        var proj1 = await projService.CreateAsync(new ProjectCreateDto("A", ProjectType.Customer));
        var proj2 = await projService.CreateAsync(new ProjectCreateDto("B", ProjectType.Internal));

        var service = new PlanningService(db, DefaultConfig);

        await service.UpsertProjectBudgetsAsync(new List<ProjectWeeklyBudgetUpsertDto>
        {
            new(proj1.Id, 14, 2026, 50m),
            new(proj2.Id, 14, 2026, 25m)
        });
        await service.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(emp.Id, proj1.Id, 14, 2026, 10m)
        });

        var monthly = await service.GetProjectOverviewMonthlyAsync(2026, 14, 14);

        Assert.Equal(2, monthly.Count);
        Assert.All(monthly, p => Assert.Equal(2, p.Months.Count));

        var firstProject = monthly.Single(p => p.ProjectId == proj1.Id);
        Assert.Contains(firstProject.Months, m => m.Month == 3 && m.BudgetedHours == 20m && m.AllocatedHours == 4m);
        Assert.Contains(firstProject.Months, m => m.Month == 4 && m.BudgetedHours == 30m && m.AllocatedHours == 6m);

        var secondProject = monthly.Single(p => p.ProjectId == proj2.Id);
        Assert.Contains(secondProject.Months, m => m.Month == 3 && m.BudgetedHours == 10m && m.AllocatedHours == 0m);
        Assert.Contains(secondProject.Months, m => m.Month == 4 && m.BudgetedHours == 15m && m.AllocatedHours == 0m);
    }
}


