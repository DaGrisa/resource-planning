namespace ResourcePlanning.Api.Services;

public interface IAuthorizationHelper
{
    Task<List<int>> GetManagedDepartmentIdsAsync();
    Task<List<int>> GetManagedProjectIdsAsync();
    Task<bool> CanAccessEmployeeAsync(int employeeId);
    Task<bool> CanManageDepartmentAsync(int departmentId);
    Task<bool> CanManageProjectAsync(int projectId);
}
