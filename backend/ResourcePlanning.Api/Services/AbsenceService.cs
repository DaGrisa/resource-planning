using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class AbsenceService : IAbsenceService
{
    private readonly AppDbContext _db;

    public AbsenceService(AppDbContext db) => _db = db;

    public async Task<List<AbsenceDto>> GetAbsencesAsync(int year, int weekFrom, int weekTo,
        int? employeeId = null, int? departmentId = null)
    {
        var query = _db.Absences
            .Include(a => a.Employee)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo);

        if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId);
        if (departmentId.HasValue) query = query.Where(a => a.Employee.DepartmentId == departmentId);

        return await query.Select(a => new AbsenceDto(
            a.Id,
            a.EmployeeId,
            a.Employee.FirstName + " " + a.Employee.LastName,
            a.CalendarWeek,
            a.Year,
            a.Hours,
            a.Note
        )).ToListAsync();
    }

    public async Task UpsertAbsencesAsync(List<AbsenceUpsertDto> absences)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        foreach (var dto in absences)
        {
            var existing = await _db.Absences.FirstOrDefaultAsync(a =>
                a.EmployeeId == dto.EmployeeId &&
                a.CalendarWeek == dto.CalendarWeek &&
                a.Year == dto.Year);

            if (dto.Hours <= 0)
            {
                if (existing != null) _db.Absences.Remove(existing);
            }
            else if (existing != null)
            {
                existing.Hours = dto.Hours;
                existing.Note = dto.Note;
            }
            else
            {
                _db.Absences.Add(new Absence
                {
                    EmployeeId = dto.EmployeeId,
                    CalendarWeek = dto.CalendarWeek,
                    Year = dto.Year,
                    Hours = dto.Hours,
                    Note = dto.Note
                });
            }
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    public async Task<bool> DeleteAbsenceAsync(int id)
    {
        var absence = await _db.Absences.FindAsync(id);
        if (absence == null) return false;

        _db.Absences.Remove(absence);
        await _db.SaveChangesAsync();
        return true;
    }
}
