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
            .AsNoTracking()
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
        if (absences.Count == 0) return;

        // Batch-load all potentially matching records in a single query
        var employeeIds = absences.Select(d => d.EmployeeId).Distinct().ToList();
        var years = absences.Select(d => d.Year).Distinct().ToList();
        var calendarWeeks = absences.Select(d => d.CalendarWeek).Distinct().ToList();

        var existingList = await _db.Absences
            .Where(a => employeeIds.Contains(a.EmployeeId)
                     && years.Contains(a.Year)
                     && calendarWeeks.Contains(a.CalendarWeek))
            .ToListAsync();

        var existingMap = existingList.ToDictionary(
            a => (a.EmployeeId, a.CalendarWeek, a.Year));

        await using var tx = await _db.Database.BeginTransactionAsync();
        foreach (var dto in absences)
        {
            existingMap.TryGetValue((dto.EmployeeId, dto.CalendarWeek, dto.Year), out var existing);

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
