using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class UserServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;

    public UserServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task CreateAsync_ShouldCreateUserWithRoles()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        var result = await service.CreateAsync(new UserCreateDto(
            "newuser", "password123", "New User", null, new[] { "Admin", "Employee" }));

        Assert.True(result.Id > 0);
        Assert.Equal("newuser", result.Username);
        Assert.Equal("New User", result.DisplayName);
        Assert.Contains("Admin", result.Roles);
        Assert.Contains("Employee", result.Roles);
        Assert.Equal(2, result.Roles.Length);
    }

    [Fact]
    public async Task CreateAsync_ShouldHashPassword()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        await service.CreateAsync(new UserCreateDto("user1", "password123", "User 1", null, null));

        var user = db.Users.First();
        Assert.NotEqual("password123", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("password123", user.PasswordHash));
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllUsers()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        await service.CreateAsync(new UserCreateDto("user1", "pass1", "User 1", null, null));
        await service.CreateAsync(new UserCreateDto("user2", "pass2", "User 2", null, null));

        var result = await service.GetAllAsync();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnUser()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        var created = await service.CreateAsync(new UserCreateDto("user1", "pass1", "User 1", null, new[] { "Admin" }));

        var result = await service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal("user1", result!.Username);
        Assert.Contains("Admin", result.Roles);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotFound()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        var result = await service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateUserAndRoles()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        var created = await service.CreateAsync(new UserCreateDto("user1", "pass1", "User 1", null, new[] { "Admin" }));

        var updated = await service.UpdateAsync(created.Id,
            new UserUpdateDto("Updated Name", null, true, new[] { "Employee", "ProjectManager" }));

        Assert.True(updated);
        var fetched = await service.GetByIdAsync(created.Id);
        Assert.Equal("Updated Name", fetched!.DisplayName);
        Assert.DoesNotContain("Admin", fetched.Roles);
        Assert.Contains("Employee", fetched.Roles);
        Assert.Contains("ProjectManager", fetched.Roles);
    }

    [Fact]
    public async Task DeleteAsync_ShouldSoftDelete()
    {
        using var db = _factory.CreateContext();
        var service = new UserService(db);

        var created = await service.CreateAsync(new UserCreateDto("user1", "pass1", "User 1", null, null));
        var deleted = await service.DeleteAsync(created.Id);

        Assert.True(deleted);
        var fetched = await service.GetByIdAsync(created.Id);
        Assert.False(fetched!.IsActive);
    }

    [Fact]
    public async Task CreateAsync_WithLinkedEmployee()
    {
        using var db = _factory.CreateContext();
        db.Employees.Add(new Employee { FirstName = "John", LastName = "Doe", Email = "john@test.com" });
        await db.SaveChangesAsync();

        var service = new UserService(db);
        var result = await service.CreateAsync(new UserCreateDto("user1", "pass1", "User 1", 1, null));

        Assert.Equal(1, result.EmployeeId);
        Assert.Equal("John Doe", result.EmployeeName);
    }
}
