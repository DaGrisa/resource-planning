using Microsoft.Extensions.Configuration;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class PlanningServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;
    private static readonly IConfiguration DefaultConfig = new ConfigurationBuilder().Build();

    public PlanningServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
    public async Task GetAllocations_ShouldFilterByWeekRange()
    {
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
        var service = new PlanningService(db, DefaultConfig);

        var result = await service.GetEmployeeAllocationsAsync(999, 2026, 1, 10);
        Assert.Null(result);
    }

    [Fact]
    public async Task UpsertProjectBudgets_ShouldCreate_WhenNew()
    {
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
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
        using var db = _factory.CreateContext();
        var (empId, projId) = await SeedEmployeeAndProject(db);
        var service = new PlanningService(db, DefaultConfig);

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
        using var db = _factory.CreateContext();
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
    public async Task GetProjectOverview_ShouldShowEmployeeBreakdown()
    {
        using var db = _factory.CreateContext();
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
}
