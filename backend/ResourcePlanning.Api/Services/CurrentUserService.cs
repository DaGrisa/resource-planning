using System.Security.Claims;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private IReadOnlyList<Role>? _roles;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public int? UserId
    {
        get
        {
            var claim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return claim != null ? int.Parse(claim) : null;
        }
    }

    public int? EmployeeId
    {
        get
        {
            var claim = User?.FindFirst("employeeId")?.Value;
            return claim != null ? int.Parse(claim) : null;
        }
    }

    public string? Username => User?.FindFirst(ClaimTypes.Name)?.Value;

    public IReadOnlyList<Role> Roles
    {
        get
        {
            if (_roles != null) return _roles;
            _roles = User?.FindAll(ClaimTypes.Role)
                .Select(c => Enum.Parse<Role>(c.Value))
                .ToList().AsReadOnly() ?? new List<Role>().AsReadOnly();
            return _roles;
        }
    }

    public bool IsAdmin => HasRole(Role.Admin);

    public bool HasRole(Role role) => Roles.Contains(role);
}
