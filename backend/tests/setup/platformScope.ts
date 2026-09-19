// Test fixtures act as the platform operator; API calls under test still run
// with real per-request tenant scope (see lib/tenantContext.ts).
import { enterPlatformScopeForTests } from '../../src/lib/tenantContext';
enterPlatformScopeForTests();
