using ResourcePlanning.Api.DTOs;

namespace ResourcePlanning.Api.Services;

public interface IDepartmentService
{
    Task<List<DepartmentDto>> GetAllAsync();
    Task<DepartmentDetailDto?> GetByIdAsync(int id);
    Task<DepartmentDto> CreateAsync(DepartmentCreateDto dto);
    Task<bool> UpdateAsync(int id, DepartmentUpdateDto dto);
    Task<bool> DeleteAsync(int id);
    Task<bool> SetManagersAsync(int id, List<int> employeeIds);
}
