using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class EmployeeServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;

    public EmployeeServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task CreateAsync_ShouldCreateEmployee()
    {
        using var db = _factory.CreateContext();
        var service = new EmployeeService(db);

        var result = await service.CreateAsync(new EmployeeCreateDto("John", "Doe", "john@test.com"));

        Assert.Equal("John", result.FirstName);
        Assert.Equal("Doe", result.LastName);
        Assert.Equal("john@test.com", result.Email);
        Assert.Equal(42.5m, result.WeeklyHours);
        Assert.True(result.IsActive);
        Assert.True(result.Id > 0);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnOnlyActive_WhenActiveOnlyTrue()
    {
        using var db = _factory.CreateContext();
        var service = new EmployeeService(db);

        await service.CreateAsync(new EmployeeCreateDto("Active", "User", "active@test.com"));
        var inactive = await service.CreateAsync(new EmployeeCreateDto("Inactive", "User", "inactive@test.com"));
        await service.DeleteAsync(inactive.Id);

        var result = await service.GetAllAsync(activeOnly: true);

        Assert.Single(result);
        Assert.Equal("Active", result[0].FirstName);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAll_WhenActiveOnlyFalse()
    {
        using var db = _factory.CreateContext();
        var service = new EmployeeService(db);

        await service.CreateAsync(new EmployeeCreateDto("Active", "User", "active@test.com"));
        var inactive = await service.CreateAsync(new EmployeeCreateDto("Inactive", "User", "inactive@test.com"));
        await service.DeleteAsync(inactive.Id);

        var result = await service.GetAllAsync(activeOnly: false);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotFound()
    {
        using var db = _factory.CreateContext();
        var service = new EmployeeService(db);

        var result = await service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_ShouldModifyEmployee()
    {
        using var db = _factory.CreateContext();
        var service = new EmployeeService(db);

        var created = await service.CreateAsync(new EmployeeCreateDto("John", "Doe", "john@test.com"));
        var updated = await service.UpdateAsync(created.Id,
            new EmployeeUpdateDto("Jane", "Doe", "jane@test.com", 40m, null, true));

        Assert.True(updated);
        var fetched = await service.GetByIdAsync(created.Id);
        Assert.Equal("Jane", fetched!.FirstName);
        Assert.Equal(40m, fetched.WeeklyHours);
    }

    [Fact]
    public async Task DeleteAsync_ShouldSoftDelete()
    {
        using var db = _factory.CreateContext();
        var service = new EmployeeService(db);

        var created = await service.CreateAsync(new EmployeeCreateDto("John", "Doe", "john@test.com"));
        var deleted = await service.DeleteAsync(created.Id);

        Assert.True(deleted);
        var fetched = await service.GetByIdAsync(created.Id);
        Assert.False(fetched!.IsActive);
    }

    [Fact]
    public async Task GetAllAsync_ShouldFilterByDepartment()
    {
        using var db = _factory.CreateContext();
        db.Departments.Add(new Department { Name = "Dept A" });
        db.Departments.Add(new Department { Name = "Dept B" });
        await db.SaveChangesAsync();

        var service = new EmployeeService(db);
        await service.CreateAsync(new EmployeeCreateDto("A", "User", "a@test.com", 42.5m, 1));
        await service.CreateAsync(new EmployeeCreateDto("B", "User", "b@test.com", 42.5m, 2));

        var result = await service.GetAllAsync(departmentId: 1);

        Assert.Single(result);
        Assert.Equal("A", result[0].FirstName);
    }
}
