import { curriculumMap, LessonContent } from '../data/lessonCurriculumMap';

export interface LessonNoteRequest {
  subject: string;
  className: string;
  term: string;
  topic: string;
  subTopic: string;
}

/**
 * Local Lesson Note Generator Algorithm
 * Generates a formatted lesson note based on local curriculum data.
 * No external APIs required.
 */
export function generateLessonNote(data: LessonNoteRequest): string {
  const { subject, className, term, topic, subTopic } = data;

  // Retrieve content from local "database"
  const content: LessonContent | undefined = 
    curriculumMap[subject]?.[className]?.[term]?.[topic]?.[subTopic];

  if (!content) {
    return `ERROR: Lesson content not found for the selected criteria.
Please ensure the Subject, Class, Term, Topic, and Sub-Topic are correctly selected.`;
  }

  // Generate formatted note using template literals
  return `
SUBJECT: ${subject.toUpperCase()}
CLASS: ${className}
TERM: ${term}
TOPIC: ${topic}
SUB-TOPIC: ${subTopic}

============================================================
1. LEARNING OBJECTIVES
By the end of this lesson, students should be able to:
${content.objectives.map((obj, i) => `   (${String.fromCharCode(97 + i)}) ${obj}`).join('\n')}

2. INTRODUCTION
${content.introduction}

3. LESSON DEVELOPMENT (STEPS)
${content.steps.map((step, i) => `
STEP ${i + 1}: ${step.title.toUpperCase()}
------------------------------------------------------------
${step.content}`).join('\n')}

4. EVALUATION & QUIZ
Instructions: Answer the following questions based on the lesson content.
${content.evaluation.map((q, i) => `   Q${i + 1}. ${q}`).join('\n')}

============================================================
Generated Locally by School App Lesson System
`.trim();
}

/**
 * Generates a full curriculum resource locally without AI.
 * Uses the curriculum map for detailed content where available.
 */
export function generateLocalCurriculum(
  subject: string, 
  className: string, 
  schemes: { term1: any[], term2: any[], term3: any[] }
) {
  const termMapping = [
    { name: 'First Term', data: schemes.term1 },
    { name: 'Second Term', data: schemes.term2 },
    { name: 'Third Term', data: schemes.term3 }
  ];

  const generatedTerms = termMapping.map(termData => {
    // Normalize term name for lookup (e.g. "First Term" -> "Term 1")
    const lookupTerm = termData.name.includes('First') ? 'Term 1' : 
                       termData.name.includes('Second') ? 'Term 2' : 
                       termData.name.includes('Third') ? 'Term 3' : termData.name;

    const weeks = termData.data.map(week => {
      const subTopic = week.subTopics?.[0] || 'General';
      const content = curriculumMap[subject]?.[className]?.[lookupTerm]?.[week.topic]?.[subTopic];

      return {
        week: week.week,
        topic: week.topic,
        objectives: content?.objectives || [`Understand the concepts of ${week.topic}`],
        materials: ["Standard Textbook", "Illustrative Charts", "Worksheets"],
        duration: "40 Minutes",
        keyVocabulary: [week.topic, "Definition", "Example"],
        teachingSteps: content?.steps.map((s: any, i: number) => ({
          step: s.title,
          description: s.content
        })) || [
          { step: "Introduction", description: `Briefly introduce ${week.topic} to the class.` },
          { step: "Presentation", description: `Explain the main features and principles of ${week.topic}.` },
          { step: "Summary", description: `Review the key points covered in the lesson.` }
        ],
        assessmentMethods: ["Oral Questions", "Class Exercise"]
      };
    });

    const assessments = termData.data.map((week: any) => {
        const subTopic = week.subTopics?.[0] || 'General';
        const content = curriculumMap[subject]?.[className]?.['Term 1']?.[week.topic]?.[subTopic] || 
                        curriculumMap[subject]?.[className]?.['Term 2']?.[week.topic]?.[subTopic] ||
                        curriculumMap[subject]?.[className]?.['Term 3']?.[week.topic]?.[subTopic];
        
        return {
            week: week.week,
            type: "Assessment",
            totalMarks: 10,
            questions: content?.evaluation.map((q: string, i: number) => ({
                id: i + 1,
                question: q,
                type: 'Theory',
                marks: 2
            })) || [
                { id: 1, question: `Explain what you understand by ${week.topic}.`, type: 'Theory', marks: 10 }
            ]
        };
    });

    return {
      term: termData.name,
      weeks: weeks,
      lessonPlans: weeks,
      schemeOfWork: termData.data,
      assessments: assessments
    };
  });

  // Generate detailed notes for all weeks that have topics
  const detailedNotes: any[] = [];
  termMapping.forEach(termData => {
    const lookupTerm = termData.name.includes('First') ? 'Term 1' : 
                       termData.name.includes('Second') ? 'Term 2' : 
                       termData.name.includes('Third') ? 'Term 3' : termData.name;

    termData.data.forEach(week => {
      if (!week.topic) return;
      const subTopic = week.subTopics?.[0] || 'General';
      const noteStr = generateLessonNote({
        subject,
        className,
        term: lookupTerm,
        topic: week.topic,
        subTopic: subTopic
      });

      detailedNotes.push({
        topic: week.topic,
        note: noteStr
      });
    });
  });

  return {
    subject,
    className,
    terms: generatedTerms,
    detailedNotes
  };
}
