using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResourcePlanning.Api.Data.MigrationsSqlServer
{
    /// <inheritdoc />
    public partial class SqlServer_InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LeadManagerId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    WeeklyHours = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Employees_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DepartmentManagers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentManagers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentManagers_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentManagers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_Employees_LeadManagerId",
                table: "Departments",
                column: "LeadManagerId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProjectType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProjectLeadId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Projects_Employees_ProjectLeadId",
                        column: x => x.ProjectLeadId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CapacityAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    CalendarWeek = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    PlannedHours = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CapacityAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CapacityAllocations_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CapacityAllocations_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectAssignments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectAssignments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectWeeklyBudgets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    CalendarWeek = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    BudgetedHours = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false)
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

            migrationBuilder.CreateTable(
                name: "Absences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    CalendarWeek = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Hours = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Absences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Absences_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Indexes
            migrationBuilder.CreateIndex(
                name: "IX_Absences_EmployeeId_CalendarWeek_Year",
                table: "Absences",
                columns: new[] { "EmployeeId", "CalendarWeek", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CapacityAllocations_EmployeeId_ProjectId_CalendarWeek_Year",
                table: "CapacityAllocations",
                columns: new[] { "EmployeeId", "ProjectId", "CalendarWeek", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CapacityAllocations_ProjectId",
                table: "CapacityAllocations",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentManagers_DepartmentId_EmployeeId",
                table: "DepartmentManagers",
                columns: new[] { "DepartmentId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentManagers_EmployeeId",
                table: "DepartmentManagers",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_LeadManagerId",
                table: "Departments",
                column: "LeadManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_Name",
                table: "Departments",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_DepartmentId",
                table: "Employees",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_EmployeeId",
                table: "ProjectAssignments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_ProjectId_EmployeeId",
                table: "ProjectAssignments",
                columns: new[] { "ProjectId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ProjectLeadId",
                table: "Projects",
                column: "ProjectLeadId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectWeeklyBudgets_ProjectId_CalendarWeek_Year",
                table: "ProjectWeeklyBudgets",
                columns: new[] { "ProjectId", "CalendarWeek", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_UserId_Role",
                table: "UserRoles",
                columns: new[] { "UserId", "Role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_EmployeeId",
                table: "Users",
                column: "EmployeeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UserRoles");
            migrationBuilder.DropTable(name: "Users");
            migrationBuilder.DropTable(name: "Absences");
            migrationBuilder.DropTable(name: "ProjectWeeklyBudgets");
            migrationBuilder.DropTable(name: "ProjectAssignments");
            migrationBuilder.DropTable(name: "CapacityAllocations");
            migrationBuilder.DropForeignKey(name: "FK_Departments_Employees_LeadManagerId", table: "Departments");
            migrationBuilder.DropTable(name: "DepartmentManagers");
            migrationBuilder.DropTable(name: "Projects");
            migrationBuilder.DropTable(name: "Employees");
            migrationBuilder.DropTable(name: "Departments");
        }
    }
}
