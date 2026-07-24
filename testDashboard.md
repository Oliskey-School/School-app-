# /test <dashboard>

## Mission

Perform a complete production-level audit of the specified dashboard or module using specialized sub-agents for **Frontend, Backend, Database, API, UI/UX, Security, Performance, Accessibility, and End-to-End (E2E)** testing.

Treat this as a real production release. Do **not** skip any page, feature, workflow, component, button, input, edge case, or integration.

---

# Phase 1 — Discover Everything

Before testing:

1. Discover and list **every** page, route, section, tab, nested page, modal, drawer, popup, hidden page, and dynamic page.
2. For each page, list every interactive component, including:

   * Buttons
   * Inputs
   * Forms
   * Tables
   * Cards
   * Widgets
   * Charts
   * Filters
   * Search
   * Pagination
   * Dropdowns
   * Checkboxes
   * Radio buttons
   * Uploads
   * Downloads
   * Imports
   * Exports
   * Notifications
   * Settings
   * Context menus
   * Print actions
   * Bulk actions
   * Every clickable or editable element

Do **not** begin testing until the complete inventory is finished.

---

# Phase 2 — Real User Testing

Use a **real browser**, not assumptions.

Test the application exactly like an experienced user of that role (Admin, Teacher, Student, Parent, Accountant, HR, Library, Transport, Principal, Super Admin, etc.).

Review the UI/UX as if preparing the application for a public production launch.

Look for:

* Poor layouts
* Confusing workflows
* Duplicate features
* Unnecessary components
* Bad navigation
* Missing loading states
* Missing success/error states
* Accessibility problems
* Inconsistent design
* Anything that looks unfinished or unprofessional

Recommend improvements that make the application feel like a premium enterprise SaaS product.

---

# Phase 3 — Functional Testing

Test every page individually.

Verify:

* Rendering
* Navigation
* Buttons
* Forms
* Validation
* CRUD operations
* Search
* Filters
* Sorting
* Pagination
* Uploads
* Downloads
* Imports
* Exports
* Printing
* Reports
* Notifications
* Authentication
* Authorization
* Permissions
* API requests
* Error handling
* Empty states
* Loading states
* Success states
* Responsive layouts
* Accessibility
* Keyboard navigation

Nothing may be skipped.

---

# Phase 4 — Database Validation

Every page must use **real database data**.

Never accept:

* Mock data
* Placeholder data
* Hardcoded values
* Fake API responses
* Cached values hiding database changes

Confirm:

* Reads
* Writes
* Updates
* Deletes
* Relationships
* Constraints
* Foreign Keys
* Indexes
* Triggers
* RLS Policies
* Transactions
* Data Integrity
* Synchronization

---

# Phase 5 — Data Persistence

For every:

* Input
* Form
* Upload
* Setting
* Configuration
* Record
* Permission
* Attachment
* Workflow

Verify that data:

* Saves successfully
* Persists after refresh
* Persists after logout/login
* Persists after browser restart where applicable
* Persists after navigation
* Persists after cache clearing
* Persists after synchronization

If data should appear elsewhere in the application, verify it appears correctly in:

* Other dashboards
* Reports
* Analytics
* Notifications
* Search
* Exports
* APIs
* Any dependent feature

Every saved value must remain synchronized across the platform.

---

# Phase 6 — Cross-Dashboard & E2E Validation

You may navigate to any dashboard or module whenever necessary, including:

* Admin
* Super Admin
* Teacher
* Student
* Parent
* Accountant
* Finance
* HR
* Library
* Hostel
* Transport
* Inventory
* Payroll
* Admissions
* Exams
* Any connected module

Verify:

* Cross-dashboard synchronization
* Permissions
* Notifications
* Visibility
* Reports
* Audit logs
* Role-based access
* Complete user workflows

Return to the original dashboard after each verification and continue testing.

Validate the complete workflow from:

**UI → API → Backend → Database → Other Dashboards → UI**

---

# Phase 7 — Code Quality

Before considering any bug fixed:

* Search for the best available skills, tools, plugins, libraries, or official documentation for the task.
* Use the most appropriate skill to solve the problem.
* Research official documentation whenever implementation details are uncertain.
* Follow production engineering best practices.

Ensure code is:

* Clean
* Modular
* Readable
* Maintainable
* Secure
* Scalable
* Optimized
* Consistent
* Properly typed

Avoid:

* Duplicate logic
* Dead code
* Unused imports
* Memory leaks
* Performance issues
* Anti-patterns

---

# Phase 8 — TypeScript & Browser Validation

Every change must pass:

* TypeScript compilation
* Linting
* Build validation

Then verify in a **real browser**:

* No console errors
* No network errors
* Feature works correctly
* UI updates correctly
* APIs succeed
* Database updates correctly
* Refresh works
* Responsive layouts work

A task is **not complete** until browser validation succeeds.

---

# Phase 9 — Final QA Review

Review:

* UI/UX
* Performance
* Security
* Accessibility
* Data integrity
* Database consistency
* Browser compatibility
* API quality
* Overall architecture

Recommend anything that would make the application more professional, easier to use, or easier to maintain.

---

# Final Report

Provide:

* Every page tested
* Every feature tested
* Every button tested
* Every input tested
* Every workflow tested
* Every API tested
* Every database operation tested
* Passed tests
* Failed tests
* Bugs found
* Severity (Critical, High, Medium, Low)
* Root cause (Frontend, Backend, Database, API, Infrastructure, Security, or UX)
* Recommended fixes (highest priority first)
* UI/UX recommendations
* Performance observations
* Security observations
* Accessibility observations
* Database integrity results
* Data persistence results
* Cross-dashboard validation summary
* End-to-End testing summary
* Overall test coverage (%)
* Overall production readiness (%)
* Detailed explanation of what is complete, what remains incomplete, and what must be fixed before production.

---

# Completion Rule

Do **not** stop until:

* Every page is tested.
* Every component is tested.
* Every workflow is tested.
* Every integration is tested.
* Every API is verified.
* Every database operation is verified.
* Every dashboard dependency is verified.
* Every E2E workflow passes.
* Browser validation passes.
* TypeScript passes.
* No Critical or High severity issues remain unresolved unless explicitly documented.

The application is only considered complete when all requirements above have been verified.
