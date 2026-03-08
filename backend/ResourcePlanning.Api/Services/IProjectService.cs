using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public interface IProjectService
{
    Task<List<ProjectDto>> GetAllAsync(bool activeOnly = true, ProjectType? type = null);
    Task<ProjectDetailDto?> GetByIdAsync(int id);
    Task<ProjectDto> CreateAsync(ProjectCreateDto dto);
    Task<bool> UpdateAsync(int id, ProjectUpdateDto dto);
    Task<bool> DeleteAsync(int id);
    Task<bool> SetTeamAsync(int id, List<int> employeeIds);
}
