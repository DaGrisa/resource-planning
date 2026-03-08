using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _service;

    public DepartmentsController(IDepartmentService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<DepartmentDto>>> GetAll()
    {
        return await _service.GetAllAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DepartmentDetailDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<ActionResult<DepartmentDto>> Create(DepartmentCreateDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<IActionResult> Update(int id, DepartmentUpdateDto dto)
    {
        return await _service.UpdateAsync(id, dto) ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            return await _service.DeleteAsync(id) ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/managers")]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<IActionResult> SetManagers(int id, [FromBody] List<int> employeeIds)
    {
        return await _service.SetManagersAsync(id, employeeIds) ? NoContent() : NotFound();
    }
}
