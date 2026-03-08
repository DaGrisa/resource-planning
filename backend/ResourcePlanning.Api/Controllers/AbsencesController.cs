using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AbsencesController : ControllerBase
{
    private readonly IAbsenceService _service;

    public AbsencesController(IAbsenceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<AbsenceDto>>> GetAbsences(
        [FromQuery] int year,
        [FromQuery] int weekFrom,
        [FromQuery] int weekTo,
        [FromQuery] int? employeeId = null,
        [FromQuery] int? departmentId = null)
    {
        return await _service.GetAbsencesAsync(year, weekFrom, weekTo, employeeId, departmentId);
    }

    [HttpPut]
    [Authorize(Roles = "Admin,DepartmentManager,Employee")]
    public async Task<IActionResult> UpsertAbsences([FromBody] List<AbsenceUpsertDto> absences)
    {
        await _service.UpsertAbsencesAsync(absences);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,DepartmentManager,Employee")]
    public async Task<IActionResult> DeleteAbsence(int id)
    {
        var result = await _service.DeleteAbsenceAsync(id);
        return result ? NoContent() : NotFound();
    }
}
