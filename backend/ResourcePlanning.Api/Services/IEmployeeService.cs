using ResourcePlanning.Api.DTOs;

namespace ResourcePlanning.Api.Services;

public interface IEmployeeService
{
    Task<List<EmployeeDto>> GetAllAsync(bool activeOnly = true, int? departmentId = null);
    Task<EmployeeDto?> GetByIdAsync(int id);
    Task<EmployeeDto> CreateAsync(EmployeeCreateDto dto);
    Task<bool> UpdateAsync(int id, EmployeeUpdateDto dto);
    Task<bool> DeleteAsync(int id);
}
