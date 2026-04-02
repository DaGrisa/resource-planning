using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ResourcePlanning.Api.Data;

#nullable disable

namespace ResourcePlanning.Api.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260324115618_HolidaySingleDayAutoHours")]
    public partial class HolidaySingleDayAutoHours : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences");

            migrationBuilder.AddColumn<DateOnly>(
                name: "HolidayDate",
                table: "Absences",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences",
                columns: new[] { "EmployeeId", "CalendarWeek", "Year", "Type" },
                unique: true,
                filter: "HolidayDate IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_Type_HolidayDate",
                table: "Absences",
                columns: new[] { "EmployeeId", "Type", "HolidayDate" },
                unique: true,
                filter: "HolidayDate IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Absences_EmployeeId_Type_HolidayDate",
                table: "Absences");

            migrationBuilder.DropIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences");

            migrationBuilder.DropColumn(
                name: "HolidayDate",
                table: "Absences");

            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences",
                columns: new[] { "EmployeeId", "CalendarWeek", "Year", "Type" },
                unique: true);
        }
    }
}
