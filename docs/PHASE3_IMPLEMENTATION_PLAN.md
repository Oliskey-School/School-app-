# Phase 3 Implementation Plan

## 🎯 Overview

**Phase:** 3 - Teacher Support & HR Tools  
**Timeline:** 7-8 weeks  
**Approach:** Incremental rollout in 3 sub-phases

---

## 📅 Implementation Roadmap

### Phase 3A: Payroll & Leave Management (Weeks 1-3) 🔴 CRITICAL

**Goal:** Enable accurate, transparent salary management and leave tracking

#### Week 1: Database & Core Payroll
- [ ] Design Phase 3A database schema
- [ ] Create payroll configuration tables
- [ ] Build salary calculation engine
- [ ] Implement Salary Configuration Screen (Admin)
- [ ] Create Teacher Salary Profile component

#### Week 2: Payslips & Payments
- [ ] Build Payslip Generator
- [ ] Create Payslip Viewer (Teacher)
- [ ] Implement Payment History
- [ ] Build Arrears Tracking System
- [ ] Create Payment Dashboard (Admin)

#### Week 3: Leave Management & Integration
- [ ] Build Leave Request System
- [ ] Create Leave Approval Workflow
- [ ] Implement Leave Balance Tracker
- [ ] Set up Payment Gateway APIs (sandbox)
- [ ] Testing & Bug Fixes

**Deliverables:**
- ✅ Teachers can view salary breakdown
- ✅ Admin can configure salaries
- ✅ Payslips generated monthly
- ✅ Leave requests submitted and approved
- ✅ Payment sandbox integration working

---

### Phase 3B: Professional Development (Weeks 4-5) 🟡 HIGH

**Goal:** Enable teacher training and professional growth

#### Week 4: PD Foundation
- [ ] Design PD database schema
- [ ] Create Course Catalog Screen
- [ ] Build Course Player Component
- [ ] Implement Progress Tracking
- [ ] Create My Courses Dashboard

#### Week 5: Certifications & Mentoring
- [ ] Build Certificate Generator
- [ ] Create Badge System
- [ ] Implement PD Calendar
- [ ] Build Mentoring Matching System
- [ ] Create PD Analytics Dashboard

**Deliverables:**
- ✅ Course catalog with 10+ courses
- ✅ Teachers can enroll and track progress
- ✅ Certificates issued on completion
- ✅ Mentoring pairs can be created

---

### Phase 3C: Workload & Community (Weeks 6-7) 🟢 MEDIUM

**Goal:** Improve teacher morale and workload management

#### Week 6: Workload Tools
- [ ] Enhanced Timetable Manager
- [ ] Build Workload Calculator
- [ ] Create Substitute Pool Management
- [ ] Implement Auto-Assignment Algorithm
- [ ] Build Coverage Dashboard

#### Week 7: Teacher Community
- [ ] Create Forum System
- [ ] Build Recognition Platform
- [ ] Implement Monthly Highlights
- [ ] Create Resource Sharing (enhanced)
- [ ] Build Community Dashboard

**Deliverables:**
- ✅ Automated substitute assignment
- ✅ Active teacher forum
- ✅ Recognition system live
- ✅ Workload balanced across teachers

---

## 🗄️ Database Schema Design

### Phase 3A Tables

```sql
-- Payroll Core
CREATE TABLE teacher_salaries (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  base_salary DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_frequency TEXT CHECK (payment_frequency IN ('Monthly', 'Bi-weekly', 'Weekly')),
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Components
CREATE TABLE salary_components (
  id BIGSERIAL PRIMARY KEY,
  teacher_salary_id BIGINT REFERENCES teacher_salaries(id),
  component_type TEXT CHECK (component_type IN ('Allowance', 'Bonus', 'Deduction')),
  component_name TEXT NOT NULL,
  amount DECIMAL(10,2),
  percentage DECIMAL(5,2),
  is_taxable BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payslips
CREATE TABLE payslips (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_salary DECIMAL(10,2),
  total_allowances DECIMAL(10,2),
  total_deductions DECIMAL(10,2),
  net_salary DECIMAL(10,2),
  status TEXT CHECK (status IN ('Draft', 'Approved', 'Paid', 'Cancelled')),
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment History
CREATE TABLE payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  payslip_id BIGINT REFERENCES payslips(id),
  teacher_id BIGINT REFERENCES teachers(id),
  amount DECIMAL(10,2),
  payment_method TEXT CHECK (payment_method IN ('Bank Transfer', 'Mobile Money', 'Cash', 'Check')),
  transaction_reference TEXT UNIQUE,
  bank_account TEXT,
  mobile_money_account TEXT,
  status TEXT CHECK (status IN ('Pending', 'Completed', 'Failed', 'Cancelled')),
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arrears Tracking
CREATE TABLE arrears (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  original_payslip_id BIGINT REFERENCES payslips(id),
  amount_owed DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  reason TEXT,
  due_date DATE,
  status TEXT CHECK (status IN ('Outstanding', 'Partially Paid', 'Cleared')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cleared_at TIMESTAMPTZ
);

-- Leave Management
CREATE TABLE leave_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  days_allowed INTEGER,
  requires_approval BOOLEAN DEFAULT TRUE,
  is_paid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_requests (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  leave_type_id BIGINT REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER,
  reason TEXT,
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_balances (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  leave_type_id BIGINT REFERENCES leave_types(id),
  year INTEGER,
  days_allocated INTEGER,
  days_used INTEGER DEFAULT 0,
  days_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, leave_type_id, year)
);
```

---

### Phase 3B Tables

```sql
-- PD Courses
CREATE TABLE pd_courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  instructor_name TEXT,
  duration_hours DECIMAL(4,1),
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  enrollment_limit INTEGER,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_modules (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES pd_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_lessons (
  id BIGSERIAL PRIMARY KEY,
  module_id BIGINT REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('Video', 'Text', 'Quiz', 'Document')),
  content_url TEXT,
  content_text TEXT,
  order_index INTEGER,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_enrollments (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  course_id BIGINT REFERENCES pd_courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('Enrolled', 'In Progress', 'Completed', 'Dropped')),
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  UNIQUE(teacher_id, course_id)
);

CREATE TABLE lesson_progress (
  id BIGSERIAL PRIMARY KEY,
  enrollment_id BIGINT REFERENCES course_enrollments(id),
  lesson_id BIGINT REFERENCES course_lessons(id),
  completed BOOLEAN DEFAULT FALSE,
  time_spent_minutes INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(enrollment_id, lesson_id)
);

-- Certificates
CREATE TABLE certificates (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  course_id BIGINT REFERENCES pd_courses(id),
  certificate_number TEXT UNIQUE,
  issue_date DATE,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges
CREATE TABLE badges (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teacher_badges (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  badge_id BIGINT REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, badge_id)
);

-- Mentoring
CREATE TABLE mentorship_programs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mentorship_pairs (
  id BIGSERIAL PRIMARY KEY,
  program_id BIGINT REFERENCES mentorship_programs(id),
  mentor_id BIGINT REFERENCES teachers(id),
  mentee_id BIGINT REFERENCES teachers(id),
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('Active', 'Completed', 'Paused', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, mentor_id, mentee_id)
);
```

---

### Phase 3C Tables

```sql
-- Workload Management
CREATE TABLE workload_metrics (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  week_start DATE,
  total_teaching_hours DECIMAL(5,2),
  total_non_teaching_hours DECIMAL(5,2),
  number_of_classes INTEGER,
  number_of_students INTEGER,
  workload_score DECIMAL(5,2),
 created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, week_start)
);

CREATE TABLE substitute_pool (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  subjects TEXT[],
  grade_levels INTEGER[],
  availability_days TEXT[],
  max_hours_per_week INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE substitute_assignments (
  id BIGSERIAL PRIMARY KEY,
  leave_request_id BIGINT REFERENCES leave_requests(id),
  original_teacher_id BIGINT REFERENCES teachers(id),
  substitute_teacher_id BIGINT REFERENCES teachers(id),
  date DATE,
  period TEXT,
  subject TEXT,
  class_name TEXT,
  status TEXT CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher Community
CREATE TABLE forum_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_threads (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES forum_categories(id),
  author_id BIGINT REFERENCES teachers(id),
  title TEXT NOT NULL,
  content TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_posts (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id BIGINT REFERENCES teachers(id),
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recognition
CREATE TABLE teacher_achievements (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  achievement_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  awarded_by BIGINT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE monthly_highlights (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id),
  month DATE,
  highlight_type TEXT CHECK (highlight_type IN ('Teacher of the Month', 'Best Attendance', 'Most Improved', 'Innovation Award')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 UI Components Breakdown

### Admin/HR Screens

1. **Payroll Dashboard**
   - Monthly payroll summary
   - Payment status overview
   - Pending approvals
   - Arrears summary

2. **Salary Configuration**
   - Teacher salary list
   - Add/edit salary
   - Allowances management
   - Deductions setup

3. **Payslip Management**
   - Generate payslips
   - Approve/reject
   - Bulk operations
   - Download PDFs

4. **Leave Management**
   - Leave requests queue
   - Approve/reject workflow
   - Leave calendar view
   - Leave balance overview

5. **PD Administration**
   - Course management
   - Enrollment tracking
   - Certificate issuance
   - PD analytics

6. **Workload Analytics**
   - Teacher workload overview
   - Substitute assignments
   - Coverage gaps
   - Workload distribution

---

### Teacher Screens

1. **My Payslip**
   - Current payslip view
   - Salary breakdown
   - Payment history
   - Download PDF

2. **Leave Requests**
   - Request leave
   - View leave balance
   - Leave history
   - Leave calendar

3. **PD Dashboard**
   - My courses
   - Course catalog
   - My certificates
   - Progress tracking

4. **Course Player**
   - Video/content viewer
   - Progress tracker
   - Quiz interface
   - Course navigation

5. **Certificate Vault**
   - All certificates
   - Download/share
   - Badge showcase

6. **Teacher Forum**
   - Browse topics
   - Create threads
   - Post replies
   - Search forum

7. **My Recognition**
   - Achievements
   - Monthly highlights
   - Peer endorsements

---

## 🔧 Technical Stack

### New Libraries Needed

```bash
# PDF Generation
npm install jspdf jspdf-autotable

# Rich Text Editor (for forum)
npm install react-quill quill

# Calendar Components
npm install react-big-calendar date-fns

# Video Player
npm install react-player

# Charts (already have recharts)
# Toast notifications (already have react-hot-toast)
```

### Payment Gateway SDKs

```bash
# Flutterwave (already integrated)
# Paystack
npm install @paystack/inline-js

# For mobile money - use API directly
```

---

## 📋 Implementation Checklist

### Phase 3A: Payroll & Leave (Weeks 1-3)

**Week 1:**
- [ ] Create `phase3a_schema.sql`
- [ ] Apply schema to database
- [ ] Create `PayrollDashboard.tsx`
- [ ] Create `SalaryConfig.tsx`
- [ ] Create `TeacherSalaryProfile.tsx`
- [ ] Build salary calculation utilities

**Week 2:**
- [ ] Create `PayslipGenerator.tsx`
- [ ] Create `PayslipViewer.tsx`
- [ ] Create `PaymentHistory.tsx`
- [ ] Create `ArrearsTracker.tsx`
- [ ] Build payslip PDF generator

**Week 3:**
- [ ] Create `LeaveRequest.tsx`
- [ ] Create `LeaveApproval.tsx`
- [ ] Create `LeaveBalance.tsx`
- [ ] Integrate payment gateway (sandbox)
- [ ] Testing & documentation

---

### Phase 3B: Professional Development (Weeks 4-5)

**Week 4:**
- [ ] Create `phase3b_schema.sql`
- [ ] Create `CourseCatalog.tsx`
- [ ] Create `CoursePlayer.tsx`
- [ ] Create `MyPDCourses.tsx`
- [ ] Build progress tracking logic

**Week 5:**
- [ ] Create `CertificateGenerator.tsx`
- [ ] Create `BadgeSystem.tsx`
- [ ] Create `PDCalendar.tsx`
- [ ] Create `MentoringMatching.tsx`
- [ ] Build certificate PDF generation

---

### Phase 3C: Workload & Community (Weeks 6-7)

**Week 6:**
- [ ] Create `phase3c_schema.sql`
- [ ] Create `EnhancedTimetable.tsx`
- [ ] Create `WorkloadCalculator.tsx`
- [ ] Create `SubstituteAssignment.tsx`
- [ ] Build auto-assignment algorithm

**Week 7:**
- [ ] Create `TeacherForum.tsx`
- [ ] Create `RecognitionPlatform.tsx`
- [ ] Create `MonthlyHighlights.tsx`
- [ ] Create `CommunityDashboard.tsx`
- [ ] Final testing & launch prep

---

## 🚀 Deployment Strategy

### Rollout Plan:

1. **Pilot Phase (Week 8)**
   - Deploy to 10 teachers
   - Gather feedback
   - Fix critical bugs

2. **Beta Rollout (Week 9)**
   - Deploy to 50% of teachers
   - Monitor performance
   - Adjust based on feedback

3. **Full Launch (Week 10)**
   - Deploy to all teachers
   - Announcement & training
   - Support documentation

---

## 📊 Success Metrics

### Week 3 Targets (Payroll):
- [ ] 100% teachers have salary configured
- [ ] Payslips generated for current month
- [ ] < 5 calculation errors
- [ ] 90% teacher satisfaction with payslip clarity

### Week 5 Targets (PD):
- [ ] 10+ courses available
- [ ] 50%+ teacher enrollment
- [ ] 20+ certificates issued
- [ ] 4+/5 course quality rating

### Week 7 Targets (Community):
- [ ] 70%+ teachers active in forum
- [ ] 50+ forum posts
- [ ] 100%  monthly highlights published
- [ ] 80%+ teacher engagement

---

**Ready to start Phase 3 implementation? Let's transform teacher experience!** 🚀
