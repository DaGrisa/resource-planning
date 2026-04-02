# ResourcePlanning

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Planning status thresholds

Planning status colors shown in overview screens are calculated by the backend using appsettings keys:

- `Planning:EmployeeOptimalThresholdPercent`
- `Planning:ProjectOptimalThresholdMinPercent`
- `Planning:ProjectOptimalThresholdMaxPercent`

Default values are configured in `backend/ResourcePlanning.Api/appsettings*.json`.

Project Planning and Project Overview read project threshold values from `GET /api/planning/project-thresholds`, so legend labels and project budget status colors match backend configuration.

Planning tooltips in Employee Planning, Project Planning, Employee Overview, and Project Overview show each absence/allocation item on a separate line.

In Employee Planning and Employee Overview, absence tooltip entries are split into `Holiday` and `Regular absence` so global holidays are clearly distinguishable.

Absences supports global holidays via the **Add Holiday** action; holidays are single-day entries and applied to all active employees.

Editing an existing holiday can also change its date; the frontend sends the original date in the upsert payload so the backend replaces the old holiday entries correctly.

Holiday hours are computed automatically as `1/5` of each employee's weekly hours, so no manual holiday-hours input is required.

The selected value of the **To Week** filter is persisted in localStorage and restored across page views that provide this filter (bulk plan dialogs are excluded).

Project Planning includes a **Bulk Plan** action to set a weekly budget for a selected project over a chosen week range.

Project Overview supports a **Monthly** view mode across all projects, with backend month aggregation that splits weekly planned/budgeted hours by working days when an ISO week spans two calendar months.

Project Overview supports PDF export in both Weekly and Monthly views (per project row).

Employee Planning **Bulk Plan** accepts `0` hours, which clears allocations for the selected project/week range when saved.

Route access configuration in `src/app/app.routes.ts` uses shared role-set constants (for example Admin-only and planning role groups) to avoid repeating identical `roleGuard(...)` combinations across many routes.

List components centralize confirmation-based destructive actions through `confirmExecute$` in `src/app/shared/utils/confirm-action.util.ts`.

Form components centralize post-save success snackbar + navigation behavior through `saveAndNavigate` in `src/app/shared/utils/save-action.util.ts`.
