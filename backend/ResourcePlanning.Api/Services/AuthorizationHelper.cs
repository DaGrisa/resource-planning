using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class AuthorizationHelper : IAuthorizationHelper
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public AuthorizationHelper(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<int>> GetManagedDepartmentIdsAsync()
    {
        if (_currentUser.IsAdmin) return await _db.Departments.Select(d => d.Id).ToListAsync();

        var employeeId = _currentUser.EmployeeId;
        if (employeeId == null) return new List<int>();

        // Departments where the user's employee is lead manager or supporting manager
        var leadDepts = await _db.Departments
            .Where(d => d.LeadManagerId == employeeId)
            .Select(d => d.Id)
            .ToListAsync();

        var supportDepts = await _db.DepartmentManagers
            .Where(dm => dm.EmployeeId == employeeId)
            .Select(dm => dm.DepartmentId)
            .ToListAsync();

        return leadDepts.Union(supportDepts).Distinct().ToList();
    }

    public async Task<List<int>> GetManagedProjectIdsAsync()
    {
        if (_currentUser.IsAdmin) return await _db.Projects.Select(p => p.Id).ToListAsync();

        var employeeId = _currentUser.EmployeeId;
        if (employeeId == null) return new List<int>();

        return await _db.Projects
            .Where(p => p.ProjectLeadId == employeeId)
            .Select(p => p.Id)
            .ToListAsync();
    }

    public async Task<bool> CanAccessEmployeeAsync(int employeeId)
    {
        if (_currentUser.IsAdmin) return true;

        // Employee role: can only access self
        if (_currentUser.HasRole(Role.Employee) && _currentUser.EmployeeId == employeeId)
            return true;

        // DepartmentManager: can access employees in managed departments
        if (_currentUser.HasRole(Role.DepartmentManager))
        {
            var managedDepts = await GetManagedDepartmentIdsAsync();
            var emp = await _db.Employees.FindAsync(employeeId);
            if (emp?.DepartmentId != null && managedDepts.Contains(emp.DepartmentId.Value))
                return true;
        }

        // ProjectManager: can access employees on managed projects
        if (_currentUser.HasRole(Role.ProjectManager))
        {
            var managedProjects = await GetManagedProjectIdsAsync();
            var isOnProject = await _db.ProjectAssignments
                .AnyAsync(pa => pa.EmployeeId == employeeId && managedProjects.Contains(pa.ProjectId));
            if (isOnProject) return true;
        }

        return false;
    }

    public async Task<bool> CanManageDepartmentAsync(int departmentId)
    {
        if (_currentUser.IsAdmin) return true;

        if (_currentUser.HasRole(Role.DepartmentManager))
        {
            var managedDepts = await GetManagedDepartmentIdsAsync();
            return managedDepts.Contains(departmentId);
        }

        return false;
    }

    public async Task<bool> CanManageProjectAsync(int projectId)
    {
        if (_currentUser.IsAdmin) return true;

        if (_currentUser.HasRole(Role.DepartmentManager))
        {
            var managedDeptIds = await GetManagedDepartmentIdsAsync();
            var hasTeamMember = await _db.ProjectAssignments
                .Include(pa => pa.Employee)
                .AnyAsync(pa => pa.ProjectId == projectId &&
                                pa.Employee.DepartmentId.HasValue &&
                                managedDeptIds.Contains(pa.Employee.DepartmentId.Value));
            if (hasTeamMember) return true;

            var employeeId = _currentUser.EmployeeId;
            if (employeeId != null)
            {
                var isLead = await _db.Projects.AnyAsync(p => p.Id == projectId && p.ProjectLeadId == employeeId);
                if (isLead) return true;
            }
            return false;
        }

        if (_currentUser.HasRole(Role.ProjectManager))
        {
            var managedProjects = await GetManagedProjectIdsAsync();
            return managedProjects.Contains(projectId);
        }

        return false;
    }
}
