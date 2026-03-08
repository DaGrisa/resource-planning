using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _service;

    public ProjectsController(IProjectService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetAll(
        [FromQuery] bool activeOnly = true,
        [FromQuery] ProjectType? type = null)
    {
        return await _service.GetAllAsync(activeOnly, type);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDetailDto>> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DepartmentManager,ProjectManager")]
    public async Task<ActionResult<ProjectDto>> Create(ProjectCreateDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager,ProjectManager")]
    public async Task<IActionResult> Update(int id, ProjectUpdateDto dto)
    {
        return await _service.UpdateAsync(id, dto) ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager")]
    public async Task<IActionResult> Delete(int id)
    {
        return await _service.DeleteAsync(id) ? NoContent() : NotFound();
    }

    [HttpPut("{id}/team")]
    [Authorize(Roles = "Admin,DepartmentManager,ProjectManager")]
    public async Task<IActionResult> SetTeam(int id, [FromBody] List<int> employeeIds)
    {
        return await _service.SetTeamAsync(id, employeeIds) ? NoContent() : NotFound();
    }
}
