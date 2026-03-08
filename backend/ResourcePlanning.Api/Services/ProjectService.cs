using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _db;

    public ProjectService(AppDbContext db) => _db = db;

    public async Task<List<ProjectDto>> GetAllAsync(bool activeOnly = true, ProjectType? type = null)
    {
        var query = _db.Projects.Include(p => p.ProjectLead).AsQueryable();
        if (activeOnly) query = query.Where(p => p.IsActive);
        if (type.HasValue) query = query.Where(p => p.ProjectType == type);

        return await query.OrderBy(p => p.Name)
            .Select(p => ToDto(p))
            .ToListAsync();
    }

    public async Task<ProjectDetailDto?> GetByIdAsync(int id)
    {
        var p = await _db.Projects
            .Include(p => p.ProjectLead)
            .Include(p => p.Assignments).ThenInclude(a => a.Employee)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (p == null) return null;

        return new ProjectDetailDto(
            p.Id, p.Name, p.ProjectType.ToString(), p.ProjectLeadId,
            p.ProjectLead != null ? p.ProjectLead.FirstName + " " + p.ProjectLead.LastName : null,
            p.IsActive, p.StartDate, p.EndDate, p.CreatedAt, p.UpdatedAt,
            p.Assignments.Select(a => new ProjectTeamMemberDto(a.EmployeeId, a.Employee.FirstName + " " + a.Employee.LastName)).ToList()
        );
    }

    public async Task<ProjectDto> CreateAsync(ProjectCreateDto dto)
    {
        var entity = new Project
        {
            Name = dto.Name,
            ProjectType = dto.ProjectType,
            ProjectLeadId = dto.ProjectLeadId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate
        };

        _db.Projects.Add(entity);
        await _db.SaveChangesAsync();

        if (dto.ProjectLeadId.HasValue)
            await _db.Entry(entity).Reference(p => p.ProjectLead).LoadAsync();

        return ToDto(entity);
    }

    public async Task<bool> UpdateAsync(int id, ProjectUpdateDto dto)
    {
        var entity = await _db.Projects.FindAsync(id);
        if (entity == null) return false;

        entity.Name = dto.Name;
        entity.ProjectType = dto.ProjectType;
        entity.ProjectLeadId = dto.ProjectLeadId;
        entity.IsActive = dto.IsActive;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Projects.FindAsync(id);
        if (entity == null) return false;

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetTeamAsync(int id, List<int> employeeIds)
    {
        var project = await _db.Projects.Include(p => p.Assignments).FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return false;

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.ProjectAssignments.RemoveRange(project.Assignments);
        foreach (var empId in employeeIds)
        {
            _db.ProjectAssignments.Add(new ProjectAssignment { ProjectId = id, EmployeeId = empId });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    private static ProjectDto ToDto(Project p) => new(
        p.Id, p.Name, p.ProjectType.ToString(), p.ProjectLeadId,
        p.ProjectLead != null ? p.ProjectLead.FirstName + " " + p.ProjectLead.LastName : null,
        p.IsActive, p.StartDate, p.EndDate, p.CreatedAt, p.UpdatedAt
    );
}
