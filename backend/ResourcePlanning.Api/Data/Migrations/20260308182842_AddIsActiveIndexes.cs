using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResourcePlanning.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Projects_IsActive",
                table: "Projects",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_IsActive",
                table: "Employees",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Projects_IsActive",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Employees_IsActive",
                table: "Employees");
        }
    }
}
