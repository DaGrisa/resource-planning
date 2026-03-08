using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class ProjectServiceTests : IDisposable
{
    private readonly TestDbContextFactory _factory;

    public ProjectServiceTests()
    {
        _factory = new TestDbContextFactory();
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task CreateAsync_ShouldCreateProject()
    {
        using var db = _factory.CreateContext();
        var service = new ProjectService(db);

        var result = await service.CreateAsync(new ProjectCreateDto("Portal", ProjectType.Customer));

        Assert.Equal("Portal", result.Name);
        Assert.Equal("Customer", result.ProjectType);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetAllAsync_ShouldFilterByType()
    {
        using var db = _factory.CreateContext();
        var service = new ProjectService(db);

        await service.CreateAsync(new ProjectCreateDto("A", ProjectType.Customer));
        await service.CreateAsync(new ProjectCreateDto("B", ProjectType.Internal));

        var result = await service.GetAllAsync(type: ProjectType.Customer);

        Assert.Single(result);
        Assert.Equal("A", result[0].Name);
    }

    [Fact]
    public async Task DeleteAsync_ShouldSoftDelete()
    {
        using var db = _factory.CreateContext();
        var service = new ProjectService(db);

        var created = await service.CreateAsync(new ProjectCreateDto("Test", ProjectType.Customer));
        await service.DeleteAsync(created.Id);

        var all = await service.GetAllAsync(activeOnly: true);
        Assert.Empty(all);

        var allIncludingInactive = await service.GetAllAsync(activeOnly: false);
        Assert.Single(allIncludingInactive);
        Assert.False(allIncludingInactive[0].IsActive);
    }

    [Fact]
    public async Task SetTeamAsync_ShouldReplaceTeam()
    {
        using var db = _factory.CreateContext();
        var projectService = new ProjectService(db);
        var empService = new EmployeeService(db);

        var project = await projectService.CreateAsync(new ProjectCreateDto("P", ProjectType.Customer));
        var emp1 = await empService.CreateAsync(new EmployeeCreateDto("A", "B", "a@t.com"));
        var emp2 = await empService.CreateAsync(new EmployeeCreateDto("C", "D", "c@t.com"));

        await projectService.SetTeamAsync(project.Id, new List<int> { emp1.Id });
        var detail = await projectService.GetByIdAsync(project.Id);
        Assert.Single(detail!.TeamMembers);

        await projectService.SetTeamAsync(project.Id, new List<int> { emp1.Id, emp2.Id });
        detail = await projectService.GetByIdAsync(project.Id);
        Assert.Equal(2, detail!.TeamMembers.Count);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnOnlyActive_ByDefault()
    {
        using var db = _factory.CreateContext();
        var service = new ProjectService(db);

        await service.CreateAsync(new ProjectCreateDto("Active", ProjectType.Customer));
        var inactive = await service.CreateAsync(new ProjectCreateDto("Inactive", ProjectType.Internal));
        await service.DeleteAsync(inactive.Id);

        var result = await service.GetAllAsync();
        Assert.Single(result);
    }
}
