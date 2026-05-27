# Project Engineering Standards: Data Isolation

To ensure data integrity and isolation in this multi-tenant, multi-branch system, all code must adhere to the **Scoped Service Pattern**.

## Mandatory Isolation Audit Checklist

Before any code modification is committed or considered complete, the following checklist **must** be validated:

1.  [ ] **Service-Based Access:** Database access is NOT performed directly in controllers/routes. All operations are mediated through service methods.
2.  [ ] **Mandatory Scoping:** Every Prisma `findMany`, `findFirst`, `findUnique`, `updateMany`, `deleteMany`, etc., query includes `school_id` and `branch_id` in the `where` clause.
3.  [ ] **Context Usage:** Services resolve the `branch_id` using `getEffectiveBranchId` (from `backend/src/utils/branchScope.ts`) when user context is provided, or require it as a mandatory argument.
4.  [ ] **No Global Queries:** Queries without `school_id` or `branch_id` filters are strictly forbidden unless explicitly authorized by a `SUPER_ADMIN` context (and clearly commented as a global platform action).

### Isolation Verification
If you modify or create code, run this check:
"Does this query include the tenant `school_id` and branch `branch_id` filters?"

If the answer is no, the code is structurally insecure and must be rejected.
