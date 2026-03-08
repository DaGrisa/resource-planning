using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class AbsenceServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;

    public AbsenceServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    private async Task<int> SeedEmployee(Api.Data.AppDbContext db)
    {
        var empService = new EmployeeService(db);
        var emp = await empService.CreateAsync(new EmployeeCreateDto("Test", "User", "test@t.com", 40m));
        return emp.Id;
    }

    [Fact]
    public async Task UpsertAbsences_ShouldCreate_WhenNew()
    {
        using var db = _factory.CreateContext();
        var empId = await SeedEmployee(db);
        var service = new AbsenceService(db);

        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 40m, "Vacation")
        });

        var result = await service.GetAbsencesAsync(2026, 6, 6);
        Assert.Single(result);
        Assert.Equal(40m, result[0].Hours);
        Assert.Equal("Vacation", result[0].Note);
    }

    [Fact]
    public async Task UpsertAbsences_ShouldUpdate_WhenExisting()
    {
        using var db = _factory.CreateContext();
        var empId = await SeedEmployee(db);
        var service = new AbsenceService(db);

        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 40m, "Vacation")
        });
        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 20m, "Half week")
        });

        var result = await service.GetAbsencesAsync(2026, 6, 6);
        Assert.Single(result);
        Assert.Equal(20m, result[0].Hours);
        Assert.Equal("Half week", result[0].Note);
    }

    [Fact]
    public async Task UpsertAbsences_ShouldDelete_WhenZeroHours()
    {
        using var db = _factory.CreateContext();
        var empId = await SeedEmployee(db);
        var service = new AbsenceService(db);

        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 40m, "Vacation")
        });
        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 0m, null)
        });

        var result = await service.GetAbsencesAsync(2026, 6, 6);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteAbsence_ShouldRemove_WhenExists()
    {
        using var db = _factory.CreateContext();
        var empId = await SeedEmployee(db);
        var service = new AbsenceService(db);

        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 40m, "Vacation")
        });

        var absences = await service.GetAbsencesAsync(2026, 6, 6);
        var deleted = await service.DeleteAbsenceAsync(absences[0].Id);
        Assert.True(deleted);

        var result = await service.GetAbsencesAsync(2026, 6, 6);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteAbsence_ShouldReturnFalse_WhenNotFound()
    {
        using var db = _factory.CreateContext();
        var service = new AbsenceService(db);

        var result = await service.DeleteAbsenceAsync(999);
        Assert.False(result);
    }

    [Fact]
    public async Task GetAbsences_ShouldFilterByWeekRange()
    {
        using var db = _factory.CreateContext();
        var empId = await SeedEmployee(db);
        var service = new AbsenceService(db);

        await service.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 5, 2026, 8m, null),
            new(empId, 6, 2026, 40m, null),
            new(empId, 7, 2026, 40m, null),
            new(empId, 8, 2026, 16m, null)
        });

        var result = await service.GetAbsencesAsync(2026, 6, 7);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetOverview_ShouldIncludeAbsenceHours()
    {
        using var db = _factory.CreateContext();
        var empId = await SeedEmployee(db);
        var projService = new ProjectService(db);
        var proj = await projService.CreateAsync(new ProjectCreateDto("Proj", ProjectType.Customer));

        var planningService = new PlanningService(db);
        var absenceService = new AbsenceService(db);

        // Allocate 20h to project + 20h absence = 40h total = 100% of 40h weekly
        await planningService.UpsertAllocationsAsync(new List<AllocationUpsertDto>
        {
            new(empId, proj.Id, 6, 2026, 20m)
        });
        await absenceService.UpsertAbsencesAsync(new List<AbsenceUpsertDto>
        {
            new(empId, 6, 2026, 20m, "Vacation")
        });

        var overview = await planningService.GetOverviewAsync(2026, 6, 6);
        Assert.Single(overview);
        Assert.Equal(40m, overview[0].Weeks[0].TotalPlannedHours);
        Assert.Equal(20m, overview[0].Weeks[0].AbsenceHours);
        Assert.Equal(100m, overview[0].Weeks[0].Percentage);
        Assert.Equal("optimal", overview[0].Weeks[0].Status);
    }
}
