using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ResourcePlanning.Api.Data;

#nullable disable

namespace ResourcePlanning.Api.Data.MigrationsSqlServer
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260324111742_AddAbsenceTypeForHolidaysSqlServer")]
    public class AddAbsenceTypeForHolidaysSqlServer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year",
                table: "Absences");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Absences",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "Regular");

            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences",
                columns: new[] { "EmployeeId", "CalendarWeek", "Year", "Type" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Absences");

            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year",
                table: "Absences",
                columns: new[] { "EmployeeId", "CalendarWeek", "Year" },
                unique: true);
        }
    }
}
