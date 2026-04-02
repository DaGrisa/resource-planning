using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public static class EmployeeNameExtensions
{
    public static string FullName(this Employee employee)
    {
        return $"{employee.FirstName} {employee.LastName}";
    }
}
