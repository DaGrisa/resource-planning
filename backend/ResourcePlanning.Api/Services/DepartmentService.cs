using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class DepartmentService : IDepartmentService
{
    private readonly AppDbContext _db;

    public DepartmentService(AppDbContext db) => _db = db;

    public async Task<List<DepartmentDto>> GetAllAsync()
    {
        return await _db.Departments
            .AsNoTracking()
            .Include(d => d.LeadManager)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto(
                d.Id, d.Name, d.LeadManagerId,
                d.LeadManager != null ? d.LeadManager.FirstName + " " + d.LeadManager.LastName : null,
                d.Employees.Count(e => e.IsActive),
                d.CreatedAt, d.UpdatedAt
            ))
            .ToListAsync();
    }

    public async Task<DepartmentDetailDto?> GetByIdAsync(int id)
    {
        var d = await _db.Departments
            .AsNoTracking()
            .Include(d => d.LeadManager)
            .Include(d => d.Managers).ThenInclude(m => m.Employee)
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (d == null) return null;

        return new DepartmentDetailDto(
            d.Id, d.Name, d.LeadManagerId,
            d.LeadManager != null ? d.LeadManager.FirstName + " " + d.LeadManager.LastName : null,
            d.Employees.Count(e => e.IsActive),
            d.CreatedAt, d.UpdatedAt,
            d.Managers.Select(m => new DepartmentManagerDto(m.EmployeeId, m.Employee.FirstName + " " + m.Employee.LastName)).ToList(),
            d.Employees.Where(e => e.IsActive).Select(e => new DepartmentEmployeeDto(e.Id, e.FirstName, e.LastName, e.Email)).ToList()
        );
    }

    public async Task<DepartmentDto> CreateAsync(DepartmentCreateDto dto)
    {
        var entity = new Department
        {
            Name = dto.Name,
            LeadManagerId = dto.LeadManagerId
        };

        _db.Departments.Add(entity);
        await _db.SaveChangesAsync();

        if (dto.LeadManagerId.HasValue)
            await _db.Entry(entity).Reference(d => d.LeadManager).LoadAsync();

        return new DepartmentDto(entity.Id, entity.Name, entity.LeadManagerId,
            entity.LeadManager != null ? entity.LeadManager.FirstName + " " + entity.LeadManager.LastName : null,
            0, entity.CreatedAt, entity.UpdatedAt);
    }

    public async Task<bool> UpdateAsync(int id, DepartmentUpdateDto dto)
    {
        var entity = await _db.Departments.FindAsync(id);
        if (entity == null) return false;

        entity.Name = dto.Name;
        entity.LeadManagerId = dto.LeadManagerId;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Departments.Include(d => d.Employees).FirstOrDefaultAsync(d => d.Id == id);
        if (entity == null) return false;
        if (entity.Employees.Any(e => e.IsActive))
            throw new InvalidOperationException("Cannot delete department with active employees.");

        _db.Departments.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetManagersAsync(int id, List<int> employeeIds)
    {
        var dept = await _db.Departments.Include(d => d.Managers).FirstOrDefaultAsync(d => d.Id == id);
        if (dept == null) return false;

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.DepartmentManagers.RemoveRange(dept.Managers);
        foreach (var empId in employeeIds)
        {
            _db.DepartmentManagers.Add(new DepartmentManager { DepartmentId = id, EmployeeId = empId });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }
}
