using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class EmployeeService : IEmployeeService
{
    private readonly AppDbContext _db;

    public EmployeeService(AppDbContext db) => _db = db;

    public async Task<List<EmployeeDto>> GetAllAsync(bool activeOnly = true, int? departmentId = null)
    {
        var query = _db.Employees.AsNoTracking().Include(e => e.Department).AsQueryable();
        if (activeOnly) query = query.Where(e => e.IsActive);
        if (departmentId.HasValue) query = query.Where(e => e.DepartmentId == departmentId);

        return await query.OrderBy(e => e.LastName).ThenBy(e => e.FirstName)
            .Select(e => ToDto(e))
            .ToListAsync();
    }

    public async Task<EmployeeDto?> GetByIdAsync(int id)
    {
        var e = await _db.Employees.AsNoTracking().Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == id);
        return e == null ? null : ToDto(e);
    }

    public async Task<EmployeeDto> CreateAsync(EmployeeCreateDto dto)
    {
        var entity = new Employee
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            WeeklyHours = dto.WeeklyHours,
            DepartmentId = dto.DepartmentId
        };

        _db.Employees.Add(entity);
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Reference(e => e.Department).LoadAsync();
        return ToDto(entity);
    }

    public async Task<bool> UpdateAsync(int id, EmployeeUpdateDto dto)
    {
        var entity = await _db.Employees.FindAsync(id);
        if (entity == null) return false;

        entity.FirstName = dto.FirstName;
        entity.LastName = dto.LastName;
        entity.Email = dto.Email;
        entity.WeeklyHours = dto.WeeklyHours;
        entity.DepartmentId = dto.DepartmentId;
        entity.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Employees.FindAsync(id);
        if (entity == null) return false;

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    private static EmployeeDto ToDto(Employee e) => new(
        e.Id, e.FirstName, e.LastName, e.Email, e.WeeklyHours,
        e.IsActive, e.DepartmentId, e.Department?.Name,
        e.CreatedAt, e.UpdatedAt
    );
}
