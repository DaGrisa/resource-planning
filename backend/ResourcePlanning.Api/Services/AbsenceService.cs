using Microsoft.EntityFrameworkCore;
using System.Globalization;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class AbsenceService : IAbsenceService
{
    private readonly AppDbContext _db;

    public AbsenceService(AppDbContext db) => _db = db;

    public async Task<List<AbsenceDto>> GetAbsencesAsync(int year, int weekFrom, int weekTo,
        int? employeeId = null, int? departmentId = null, AbsenceType? type = null)
    {
        var query = _db.Absences
            .AsNoTracking()
            .Include(a => a.Employee)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo);

        if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId);
        if (departmentId.HasValue) query = query.Where(a => a.Employee.DepartmentId == departmentId);
        if (type.HasValue) query = query.Where(a => a.Type == type.Value);

        return await query.Select(a => new AbsenceDto(
            a.Id,
            a.EmployeeId,
            a.Employee.FullName(),
            a.CalendarWeek,
            a.Year,
            a.Type,
            a.Hours,
            a.Note
        )).ToListAsync();
    }

    public async Task<List<HolidayDto>> GetHolidaysAsync(int year, int weekFrom, int weekTo)
    {
        var holidayRows = await _db.Absences
            .AsNoTracking()
            .Where(a => a.Type == AbsenceType.Holiday)
            .Where(a => a.Year == year && a.CalendarWeek >= weekFrom && a.CalendarWeek <= weekTo)
            .Where(a => a.HolidayDate != null)
            .Select(a => new
            {
                a.HolidayDate,
                a.CalendarWeek,
                a.Year,
                a.Note
            })
            .ToListAsync();

        return holidayRows
            .GroupBy(a => a.HolidayDate)
            .Select(g => new HolidayDto(
                g.Key!.Value,
                g.First().CalendarWeek,
                g.First().Year,
                g.Where(a => a.Note != null && a.Note != string.Empty)
                    .Select(a => a.Note)
                    .FirstOrDefault()
            ))
            .OrderBy(h => h.Date)
            .ToList();
    }

    public async Task UpsertAbsencesAsync(List<AbsenceUpsertDto> absences)
    {
        await ServiceOperationHelpers.BatchUpsertAsync(
            _db,
            _db.Absences,
            absences,
            async dtos =>
            {
                var employeeIds = dtos.Select(d => d.EmployeeId).Distinct().ToList();
                var years = dtos.Select(d => d.Year).Distinct().ToList();
                var calendarWeeks = dtos.Select(d => d.CalendarWeek).Distinct().ToList();

                var existingList = await _db.Absences
                    .Where(a => employeeIds.Contains(a.EmployeeId)
                             && years.Contains(a.Year)
                             && calendarWeeks.Contains(a.CalendarWeek))
                    .ToListAsync();

                return existingList.ToDictionary(a => (a.EmployeeId, a.CalendarWeek, a.Year, a.Type, a.HolidayDate));
            },
            dto => (dto.EmployeeId, dto.CalendarWeek, dto.Year, dto.Type, (DateOnly?)null),
            dto => dto.Hours <= 0,
            (existing, dto) =>
            {
                existing.Hours = dto.Hours;
                existing.Note = dto.Note;
            },
            dto => new Absence
            {
                EmployeeId = dto.EmployeeId,
                CalendarWeek = dto.CalendarWeek,
                Year = dto.Year,
                Type = dto.Type,
                Hours = dto.Hours,
                Note = dto.Note
            }
        );
    }

    public async Task UpsertHolidaysAsync(List<HolidayUpsertDto> holidays)
    {
        if (holidays.Count == 0) return;

        var employees = await _db.Employees
            .AsNoTracking()
            .Where(e => e.IsActive)
            .Select(e => new { e.Id, e.WeeklyHours })
            .ToListAsync();

        if (employees.Count == 0) return;

        var holidayDates = holidays
            .Select(d => d.Date)
            .Concat(holidays.Where(d => d.OriginalDate.HasValue).Select(d => d.OriginalDate!.Value))
            .Distinct()
            .ToList();
        var years = holidayDates.Select(ISOWeek.GetYear).Distinct().ToList();
        var calendarWeeks = holidayDates.Select(ISOWeek.GetWeekOfYear).Distinct().ToList();
        var employeeIds = employees.Select(e => e.Id).ToList();

        var existingList = await _db.Absences
            .Where(a => a.Type == AbsenceType.Holiday)
            .Where(a => a.HolidayDate != null)
            .Where(a => employeeIds.Contains(a.EmployeeId)
                     && years.Contains(a.Year)
                     && calendarWeeks.Contains(a.CalendarWeek))
            .ToListAsync();

        var existingMap = existingList.ToDictionary(
            a => (a.EmployeeId, a.HolidayDate));

        await using var tx = await _db.Database.BeginTransactionAsync();

        foreach (var holiday in holidays)
        {
            if (holiday.OriginalDate.HasValue && holiday.OriginalDate.Value != holiday.Date)
            {
                foreach (var employee in employees)
                {
                    if (existingMap.TryGetValue((employee.Id, holiday.OriginalDate.Value), out var oldExisting))
                    {
                        _db.Absences.Remove(oldExisting);
                        existingMap.Remove((employee.Id, holiday.OriginalDate.Value));
                    }
                }
            }

            var holidayYear = ISOWeek.GetYear(holiday.Date);
            var holidayWeek = ISOWeek.GetWeekOfYear(holiday.Date);

            foreach (var employee in employees)
            {
                existingMap.TryGetValue((employee.Id, holiday.Date), out var existing);

                var holidayHours = Math.Round(employee.WeeklyHours / 5m, 2);

                if (existing != null)
                {
                    existing.Hours = holidayHours;
                    existing.Note = holiday.Note;
                    existing.CalendarWeek = holidayWeek;
                    existing.Year = holidayYear;
                    existing.HolidayDate = holiday.Date;
                }
                else
                {
                    _db.Absences.Add(new Absence
                    {
                        EmployeeId = employee.Id,
                        HolidayDate = holiday.Date,
                        CalendarWeek = holidayWeek,
                        Year = holidayYear,
                        Type = AbsenceType.Holiday,
                        Hours = holidayHours,
                        Note = holiday.Note
                    });
                }
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
