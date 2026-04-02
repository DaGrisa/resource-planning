using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResourcePlanning.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAbsenceTypeForHolidays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year",
                table: "Absences");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Absences",
                type: "TEXT",
                nullable: false,
                defaultValue: "Regular");

            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year_Type",
                table: "Absences",
                columns: new[] { "EmployeeId", "CalendarWeek", "Year", "Type" },
                unique: true);
        }

        /// <inheritdoc />
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
