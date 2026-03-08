using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PlanningController : ControllerBase
{
    private readonly IPlanningService _service;

    public PlanningController(IPlanningService service) => _service = service;

    [HttpGet("allocations")]
    public async Task<ActionResult<List<CapacityAllocationDto>>> GetAllocations(
        [FromQuery] int year,
        [FromQuery] int weekFrom,
        [FromQuery] int weekTo,
        [FromQuery] int? employeeId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? departmentId = null)
    {
        return await _service.GetAllocationsAsync(year, weekFrom, weekTo, employeeId, projectId, departmentId);
    }

    [HttpPut("allocations")]
    [Authorize(Roles = "Admin,DepartmentManager,ProjectManager")]
    public async Task<IActionResult> UpsertAllocations([FromBody] List<AllocationUpsertDto> allocations)
    {
        await _service.UpsertAllocationsAsync(allocations);
        return NoContent();
    }

    [HttpGet("overview")]
    public async Task<ActionResult<List<EmployeeWeekOverviewDto>>> GetOverview(
        [FromQuery] int year,
        [FromQuery] int weekFrom,
        [FromQuery] int weekTo,
        [FromQuery] int? departmentId = null)
    {
        return await _service.GetOverviewAsync(year, weekFrom, weekTo, departmentId);
    }

    [HttpGet("employee/{id}")]
    public async Task<ActionResult<EmployeeWeekOverviewDto>> GetEmployeeAllocations(
        int id,
        [FromQuery] int year,
        [FromQuery] int weekFrom,
        [FromQuery] int weekTo)
    {
        var result = await _service.GetEmployeeAllocationsAsync(id, year, weekFrom, weekTo);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("project-overview")]
    public async Task<ActionResult<List<ProjectWeekOverviewDto>>> GetProjectOverview(
        [FromQuery] int year,
        [FromQuery] int weekFrom,
        [FromQuery] int weekTo)
    {
        return await _service.GetProjectOverviewAsync(year, weekFrom, weekTo);
    }

    [HttpPut("project-budgets")]
    [Authorize(Roles = "Admin,DepartmentManager,ProjectManager")]
    public async Task<IActionResult> UpsertProjectBudgets([FromBody] List<ProjectWeeklyBudgetUpsertDto> budgets)
    {
        await _service.UpsertProjectBudgetsAsync(budgets);
        return NoContent();
    }
}
