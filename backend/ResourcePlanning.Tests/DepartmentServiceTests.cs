using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class DepartmentServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;

    public DepartmentServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task CreateAsync_ShouldCreateDepartment()
    {
        using var db = _factory.CreateContext();
        var service = new DepartmentService(db);

        var result = await service.CreateAsync(new DepartmentCreateDto("Engineering"));

        Assert.Equal("Engineering", result.Name);
        Assert.True(result.Id > 0);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnWithEmployeeCount()
    {
        using var db = _factory.CreateContext();
        var service = new DepartmentService(db);
        var empService = new EmployeeService(db);

        var dept = await service.CreateAsync(new DepartmentCreateDto("Dev"));
        await empService.CreateAsync(new EmployeeCreateDto("A", "B", "a@t.com", 42.5m, dept.Id));
        await empService.CreateAsync(new EmployeeCreateDto("C", "D", "c@t.com", 42.5m, dept.Id));

        var result = await service.GetAllAsync();

        Assert.Single(result);
        Assert.Equal(2, result[0].EmployeeCount);
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenHasActiveEmployees()
    {
        using var db = _factory.CreateContext();
        var service = new DepartmentService(db);
        var empService = new EmployeeService(db);

        var dept = await service.CreateAsync(new DepartmentCreateDto("Dev"));
        await empService.CreateAsync(new EmployeeCreateDto("A", "B", "a@t.com", 42.5m, dept.Id));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteAsync(dept.Id));
    }

    [Fact]
    public async Task DeleteAsync_ShouldSucceed_WhenEmpty()
    {
        using var db = _factory.CreateContext();
        var service = new DepartmentService(db);

        var dept = await service.CreateAsync(new DepartmentCreateDto("Empty"));
        var deleted = await service.DeleteAsync(dept.Id);

        Assert.True(deleted);
        var all = await service.GetAllAsync();
        Assert.Empty(all);
    }

    [Fact]
    public async Task SetManagersAsync_ShouldReplaceManagers()
    {
        using var db = _factory.CreateContext();
        var service = new DepartmentService(db);
        var empService = new EmployeeService(db);

        var dept = await service.CreateAsync(new DepartmentCreateDto("Dev"));
        var emp1 = await empService.CreateAsync(new EmployeeCreateDto("A", "B", "a@t.com", 42.5m, dept.Id));
        var emp2 = await empService.CreateAsync(new EmployeeCreateDto("C", "D", "c@t.com", 42.5m, dept.Id));

        await service.SetManagersAsync(dept.Id, new List<int> { emp1.Id });
        var detail = await service.GetByIdAsync(dept.Id);
        Assert.Single(detail!.Managers);

        await service.SetManagersAsync(dept.Id, new List<int> { emp1.Id, emp2.Id });
        detail = await service.GetByIdAsync(dept.Id);
        Assert.Equal(2, detail!.Managers.Count);
    }
}
