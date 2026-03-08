using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _service;

    public EmployeesController(IEmployeeService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<EmployeeDto>>> GetAll(
        [FromQuery] bool activeOnly = true,
        [FromQuery] int? departmentId = null)
    {
        return await _service.GetAllAsync(activeOnly, departmentId);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<ActionResult<EmployeeDto>> Create(EmployeeCreateDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<IActionResult> Update(int id, EmployeeUpdateDto dto)
    {
        return await _service.UpdateAsync(id, dto) ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<IActionResult> Delete(int id)
    {
        return await _service.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
