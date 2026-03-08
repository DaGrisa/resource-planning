using ResourcePlanning.Api.DTOs;

namespace ResourcePlanning.Api.Services;

public interface IAbsenceService
{
    Task<List<AbsenceDto>> GetAbsencesAsync(int year, int weekFrom, int weekTo,
        int? employeeId = null, int? departmentId = null);
    Task UpsertAbsencesAsync(List<AbsenceUpsertDto> absences);
    Task<bool> DeleteAbsenceAsync(int id);
}
