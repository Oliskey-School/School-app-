import { chromium } from 'playwright';

process.env.TMP = process.env.TMP || 'C:\\tmp';
process.env.TEMP = process.env.TEMP || 'C:\\tmp';

const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api';

const viewTitles = {
  overview: 'Teacher Dashboard',
  timetable: 'Timetable Dashboard',
  lessonNotesUpload: 'Lesson Notes',
  reports: 'Student Reports',
  collaborationForum: 'Collaboration Forum',
  messages: 'Messages',
  newChat: 'New Chat',
  communication: 'Communication',
  settings: 'Settings',
  teacherSelfAttendance: 'My Attendance',
  attendanceHistory: 'Attendance History',
  library: 'Library',
  gallery: 'Photo Gallery',
  calendar: 'Calendar',
  assignmentsList: 'Assignments',
  curriculumSelection: 'Curriculum Selection',
  curriculum: 'Curriculum',
  reportCardInput: 'Report Card Input',
  notifications: 'Notifications',
  selectTermForReport: 'Select Term',
  professionalDevelopment: 'Professional Development',
  educationalGames: 'Educational Games',
  appointments: 'Appointments',
  virtualClass: 'Virtual Classroom',
  resources: 'Resource Hub',
  cbtScores: 'CBT Scores',
  cbtManagement: 'CBT Management',
  addStudent: 'Add Student',
  quizBuilder: 'Quiz Builder',
  classGradebook: 'Class Gradebook',
  lessonPlanner: 'AI Lesson Planner',
  lessonNotesUpload: 'Upload Lesson Notes',
  leaveRequest: 'Leave Request',
  payslips: 'Payslips',
  salaryProfile: 'Salary Profile',
  paymentHistory: 'Payment History',
  assessmentsHub: 'Assessments',
  badgeSystem: 'Achievement Badges',
  certificateViewer: 'Certificates',
  courseCatalog: 'Course Catalog',
  mentoringMatching: 'Mentoring',
  myPDCourses: 'My PD Courses',
  pdCalendar: 'PD Calendar',
  recognitionPlatform: 'Recognition',
  resourceSharing: 'Resource Sharing',
  studentCredentials: 'Student Credentials',
  workloadCalculator: 'Workload Calculator',
  examManagement: 'Exam Management'
};

const viewsToAudit = Object.keys(viewTitles);

async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

function hasCrashText(text) {
  return [
    'Dashboard Error',
    'View not found',
    'Teacher Profile Not Found',
    'Something went wrong',
    'Cannot read properties of',
    'is not a function'
  ].some((needle) => text.includes(needle));
}

const { response: loginResponse, data: loginData } = await api('/auth/demo/login', {
  method: 'POST',
  headers: { 'X-Forwarded-For': '10.51.0.10' },
  body: { role: 'teacher' }
});

if (!loginResponse.ok || !loginData?.token) {
  throw new Error(`Demo teacher login failed: ${loginResponse.status} ${JSON.stringify(loginData)}`);
}

const { data: teacherProfile } = await api('/teachers/me', { token: loginData.token });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(({ token, refreshToken, user }) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_refresh_token', refreshToken);
  localStorage.setItem('cached_user_profile', JSON.stringify(user));
  localStorage.setItem('selected_branch_id', user.branch_id);
  sessionStorage.setItem('active_dashboard_role', 'TEACHER');
  sessionStorage.setItem('is_demo_mode', 'true');
}, {
  token: loginData.token,
  refreshToken: loginData.refreshToken,
  user: loginData.user
});

const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const apiFailures = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});
page.on('response', (response) => {
  const url = response.url();
  if (url.includes('/api/') && response.status() >= 400) {
    apiFailures.push({ status: response.status(), url });
  }
});

await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.TEACHER_NAVIGATE && window.TEACHER_COMPONENTS, null, { timeout: 45000 });
await page.waitForTimeout(1500);

const registeredViews = await page.evaluate(() => window.TEACHER_COMPONENTS || []);
const auditedViews = viewsToAudit.filter((view) => registeredViews.includes(view));
const skippedViews = viewsToAudit.filter((view) => !registeredViews.includes(view));
const failures = [];
const passed = [];

for (const view of auditedViews) {
  const startErrorCount = pageErrors.length;
  const startConsoleErrorCount = consoleErrors.length;
  const startApiFailureCount = apiFailures.length;

  await page.evaluate(({ view, title }) => {
    window.TEACHER_NAVIGATE(view, title, {});
  }, { view, title: viewTitles[view] || view });

  await page.waitForTimeout(1800);
  const bodyText = await page.locator('body').innerText({ timeout: 5000 });
  const newPageErrors = pageErrors.slice(startErrorCount);
  const newConsoleErrors = consoleErrors.slice(startConsoleErrorCount);
  const newApiFailures = apiFailures.slice(startApiFailureCount);

  const viewFailures = [];
  if (hasCrashText(bodyText)) viewFailures.push('crash text visible');
  if (newPageErrors.length) viewFailures.push(`page errors: ${newPageErrors.join(' | ')}`);
  if (newApiFailures.length) viewFailures.push(`api failures: ${newApiFailures.map((f) => `${f.status} ${f.url}`).join(' | ')}`);
  if (newConsoleErrors.length) viewFailures.push(`console errors: ${newConsoleErrors.slice(0, 3).join(' | ')}`);

  if (viewFailures.length) {
    failures.push({ view, title: viewTitles[view], failures: viewFailures });
  } else {
    passed.push(view);
  }
}

await browser.close();

const summary = {
  teacher: {
    userId: loginData.user.id,
    teacherId: teacherProfile?.id,
    schoolId: loginData.user.school_id,
    branchId: loginData.user.branch_id
  },
  registeredViewCount: registeredViews.length,
  auditedViewCount: auditedViews.length,
  passedCount: passed.length,
  failureCount: failures.length,
  skippedViews,
  failures,
  passed
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) {
  process.exitCode = 1;
}
