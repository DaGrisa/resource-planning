using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public interface IAbsenceService
{
    Task<List<AbsenceDto>> GetAbsencesAsync(int year, int weekFrom, int weekTo,
        int? employeeId = null, int? departmentId = null, AbsenceType? type = null);
    Task<List<HolidayDto>> GetHolidaysAsync(int year, int weekFrom, int weekTo);
    Task UpsertAbsencesAsync(List<AbsenceUpsertDto> absences);
    Task UpsertHolidaysAsync(List<HolidayUpsertDto> holidays);
    Task<bool> DeleteAbsenceAsync(int id);
}
