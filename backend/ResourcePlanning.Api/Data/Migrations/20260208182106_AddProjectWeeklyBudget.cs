using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResourcePlanning.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectWeeklyBudget : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectWeeklyBudgets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    CalendarWeek = table.Column<int>(type: "INTEGER", nullable: false),
                    Year = table.Column<int>(type: "INTEGER", nullable: false),
                    BudgetedHours = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectWeeklyBudgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectWeeklyBudgets_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectWeeklyBudgets_ProjectId_CalendarWeek_Year",
                table: "ProjectWeeklyBudgets",
                columns: new[] { "ProjectId", "CalendarWeek", "Year" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectWeeklyBudgets");
        }
    }
}
