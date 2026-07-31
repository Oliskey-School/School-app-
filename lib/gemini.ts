
import { api } from './api';

// AI generation is proxied through the backend (/api/ai/chat) so the AI
// provider's API key never reaches the browser bundle. See lib/ai.ts's
// NvidiaClient for the same pattern used by the rest of the app's AI features.
const MODEL_NAME = "gemini-1.5-flash";

function stripJsonFences(text: string): string {
  const t = (text || '').trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : t;
}

async function generateJson(prompt: string): Promise<string> {
  const res = await api.aiChat({
    messages: [
      { role: 'system', content: 'Respond ONLY with valid minified JSON. No markdown, no code fences, no commentary.' },
      { role: 'user', content: prompt }
    ],
    model: MODEL_NAME
  });
  return stripJsonFences(res?.text || '');
}

export interface TimetableRequest {
  className: string;
  subjects: string[];
  teachers: {
    id: any;
    name: string;
    employment_type?: 'FT' | 'PT';
    available_days?: string[];
    subject_specialization?: string[];
  }[];
  periodsPerDay: number; // e.g. 8
  days: string[]; // ['Monday', 'Tuesday', ...]
  subjectPeriods?: { [subject: string]: number }; // Optional: Required periods per subject
}

export interface GeneratedSchedule {
  schedule: { [key: string]: string }; // "Monday-0": "Math"
  assignments: { [key: string]: string }; // "Monday-0": "Mr. Smith"
  validation?: {
    pt_teachers_scheduled_correctly: boolean;
    all_pt_on_available_days: boolean;
    no_teacher_conflicts: boolean;
    subject_loads_met: boolean;
    warnings: string[];
  };
}

export async function generateTimetableAI(data: TimetableRequest): Promise<GeneratedSchedule> {
  // Separate PT and FT teachers for the prompt
  const ptTeachers = data.teachers.filter(t => t.employment_type === 'PT');
  const ftTeachers = data.teachers.filter(t => t.employment_type !== 'PT');

  const prompt = `
    You are an expert Nigerian secondary school timetable scheduler with deep knowledge of pedagogical best practices.

    Create a conflict-free weekly timetable following these STRICT requirements:

    ## CLASS INFORMATION
    Class: ${data.className}
    Subjects: ${data.subjects.join(", ")}
    Days: ${data.days.join(", ")}
    Periods per day: ${data.periodsPerDay}

    ${data.subjectPeriods ? `## SUBJECT PERIOD REQUIREMENTS (MANDATORY)
${Object.entries(data.subjectPeriods).map(([subj, count]) => `- ${subj}: EXACTLY ${count} periods per week`).join('\n')}` : ''}

    ## TEACHER DATA

    ### PART-TIME (PT) TEACHERS - SCHEDULE THESE FIRST! ⚠️
${ptTeachers.length > 0 ? ptTeachers.map(t => `
    - ${t.name}
      Type: PT (Part-Time)
      Available ONLY on: ${(t.available_days || []).join(", ")}
      Subjects: ${(t.subject_specialization || []).join(", ")}
      ⚠️ CRITICAL: This teacher can ONLY be scheduled on ${(t.available_days || []).join("/")}
`).join('\n') : '    No Part-Time teachers'}

    ### FULL-TIME (FT) TEACHERS - Schedule after PT teachers
${ftTeachers.length > 0 ? ftTeachers.map(t => `
    - ${t.name}
      Type: FT (Full-Time)
      Available: All days (Monday-Friday)
      Subjects: ${(t.subject_specialization || []).join(", ")}
`).join('\n') : '    Using general teacher pool: ' + data.teachers.map(t => t.name).join(", ")}

    ## MANDATORY SCHEDULING RULES (DO NOT VIOLATE)

    ### 🔴 RULE 1: PT TEACHER PRIORITY (HIGHEST PRIORITY)
    - Schedule ALL Part-Time (PT) teachers FIRST before any FT teachers
    - PT teachers have LIMITED availability - their slots are the scarcest resource
    - PT teacher day restrictions are NON-NEGOTIABLE
    - Example: If "Mr. Bayo" is PT and available Mon/Wed, ALL his lessons MUST be on Mon/Wed ONLY

    ### 🔴 RULE 2: DAY AVAILABILITY (ABSOLUTE CONSTRAINT)
    - PT teachers can ONLY appear on their listed available days
    - If a PT teacher is available Mon/Wed, they cannot teach Tue/Thu/Fri under any circumstance
    - FT teachers can teach any day

    ### 🔴 RULE 3: NO CONFLICTS (ABSOLUTE CONSTRAINT)
    - A teacher cannot be in two places at the same time
    - Check across all classes - if this is JSS1 and the same teacher teaches JSS2, avoid same period
    - Format check: If "Mr. Smith" is at "Monday-0", he cannot also be at "Monday-0" elsewhere

    ### 🟡 RULE 4: CLUSTERING vs SPREADING (OPTIMIZATION)
    - PT teachers: Cluster their lessons back-to-back on their available days (e.g., Period 1,2,3 on Monday)
      Reason: Minimizes commute, maximizes efficiency
    - FT teachers: Spread lessons across different days
      Reason: Better retention, variety for students

    ### 🟡 RULE 5: PEDAGOGICAL BEST PRACTICES (SOFT CONSTRAINT)
    - Heavy subjects (Math, English, Sciences) → Morning periods (0-3)
    - Lighter subjects (Arts, PE, Music) → Afternoon periods (4-7)
    - Avoid same subject 3+ times in one day
    - Try to avoid consecutive periods of very demanding subjects

    ## OUTPUT FORMAT
    Return ONLY valid JSON with NO markdown code blocks:
    {
      "schedule": {
        "Monday-0": "Mathematics",
        "Monday-1": "English Language",
        "Tuesday-0": "Basic Science",
        ...
      },
      "assignments": {
        "Monday-0": "Mr. Adebayo",
        "Monday-1": "Mrs. Okonkwo",
        "Tuesday-0": "Mr. Bayo",
        ...
      },
      "validation": {
        "pt_teachers_scheduled_correctly": true,
        "all_pt_on_available_days": true,
        "no_teacher_conflicts": true,
        "subject_loads_met": true,
        "warnings": []
      }
    }

    ## CRITICAL VALIDATION CHECKS
    Before returning, verify:
    1. ✅ Every PT teacher appears ONLY on their available days
    2. ✅ No teacher is double-booked (same period, different classes)
    3. ✅ All subject period requirements are met (if provided)
    4. ✅ PT teacher lessons are clustered where possible

    If you cannot satisfy PT teacher constraints, set validation.pt_teachers_scheduled_correctly = false
    and include explanation in validation.warnings array.

    ## EXAMPLE VALIDATION (for reference)
    If "Mr. Bayo" is PT (Mon/Wed only) and you scheduled him on Thursday:
    {
      "validation": {
        "pt_teachers_scheduled_correctly": false,
        "warnings": ["Mr. Bayo (PT) was scheduled on Thursday but is only available Mon/Wed"]
      }
    }

    Remember: PT teacher availability is THE most important constraint. Violating it makes the timetable unusable.
  `;

  try {
    const text = await generateJson(prompt);
    const json = JSON.parse(text);
    return json as GeneratedSchedule;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate timetable. Please try again.");
  }
}

export interface AIQuestion {
  id: number;
  subject: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export async function generateExamQuestions(subject: string, topic: string = "General", difficulty: string = "Medium", count: number = 10): Promise<AIQuestion[]> {
  const prompt = `
    You are an expert exam question generator for Nigerian Senior Secondary School students (SS1-SS3), preparing for JAMB/WAEC.
    Create ${count} multiple-choice questions on the subject "${subject}" focusing on the topic "${topic}".
    Difficulty Level: ${difficulty}.

    Return ONLY valid JSON array. No markdown.
    Format:
    [
      {
        "id": 1,
        "subject": "${subject}",
        "text": "Question text here",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0, // Index of correct option (0-3)
        "explanation": "Brief explanation of the answer"
      }
    ]
  `;

  try {
    const text = await generateJson(prompt);
    const json = JSON.parse(text);
    return json as AIQuestion[];
  } catch (error) {
    console.error("AI Exam Generation Error:", error);
    return [];
  }
}
