using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public interface ICurrentUserService
{
    int? UserId { get; }
    int? EmployeeId { get; }
    string? Username { get; }
    IReadOnlyList<Role> Roles { get; }
    bool IsAdmin { get; }
    bool IsAuthenticated { get; }
    bool HasRole(Role role);
}
