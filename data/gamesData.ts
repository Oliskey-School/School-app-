export interface EducationalGame {
  level: 'Early Years (1-3 years)' | 'Pre-Primary (3-5 years)' | 'Lower Primary (6-8 years)' | 'Upper Primary (9-11 years)' | 'Junior Secondary (12-14 years)' | 'Senior Secondary (15-18 years)';
  subject: string;
  gameName: string;
  howToPlay: string;
  learningGoal: string;
  mode: 'Online' | 'Offline' | 'Both';
}

export const educationalGamesData: EducationalGame[] = [
  // Early Years (1-3 years) - NEW
  {
    level: 'Early Years (1-3 years)',
    subject: 'Literacy',
    gameName: 'Peekaboo Letters',
    howToPlay: 'Hide letter cards under a blanket. Reveal them one by one saying "Peekaboo [Letter Name]!".',
    learningGoal: 'Object permanence and early letter recognition.',
    mode: 'Offline'
  },
  {
    level: 'Early Years (1-3 years)',
    subject: 'Numeracy',
    gameName: 'Counting Shapes Tap',
    howToPlay: 'Tap only the Circle shapes on the screen as they float by. Count out loud!',
    learningGoal: 'Shape recognition and counting 1-5.',
    mode: 'Online'
  },
  {
    level: 'Early Years (1-3 years)',
    subject: 'Physical',
    gameName: 'Simon Says Body Parts',
    howToPlay: '"Simon says toucy your nose!" Simple commands for body coordination.',
    learningGoal: 'Body awareness and listening skills.',
    mode: 'Offline'
  },

  // Pre-Primary (3-5 years)
  {
    level: 'Pre-Primary (3-5 years)',
    subject: 'Literacy',
    gameName: 'Alphabet Fishing',
    howToPlay: "Cut out fish shapes with letters on them. Attach a paperclip to each. Students use a magnet on a string (fishing rod) to \"catch\" a fish and say the letter's name and sound.",
    learningGoal: "Letter recognition and phonics.",
    mode: 'Offline'
  },
  {
    level: 'Pre-Primary (3-5 years)',
    subject: 'Numeracy',
    gameName: 'Number Bean Bag Toss',
    howToPlay: 'Place hoops or draw circles on the floor, each with a number (1-5). Children toss bean bags into the hoops and count how many landed in each numbered circle.',
    learningGoal: 'Number recognition, counting, and gross motor skills.',
    mode: 'Offline'
  },
  {
    level: 'Pre-Primary (3-5 years)',
    subject: 'Numeracy',
    gameName: 'Red Light, Green Light Counting',
    howToPlay: 'Run on Green, Stop on Red. When stopped, count out loud the number of steps taken.',
    learningGoal: 'Self-regulation and counting.',
    mode: 'Offline'
  },

  // Lower Primary (6-8 years)
  {
    level: 'Lower Primary (6-8 years)',
    subject: 'Mathematics',
    gameName: 'Math Sprint',
    howToPlay: 'Answer as many math problems as you can before the timer runs out! The problems adjust to your grade level.',
    learningGoal: 'Improving speed and accuracy in basic arithmetic calculations.',
    mode: 'Online'
  },
  {
    level: 'Lower Primary (6-8 years)',
    subject: 'Literacy',
    gameName: 'Spelling Sparkle',
    howToPlay: 'Students stand in a circle. The teacher gives a word. Each student says one letter to spell the word. The student who says the last letter adds "SPARKLE!" and the next person is out.',
    learningGoal: 'Spelling, listening skills, and turn-taking.',
    mode: 'Offline'
  },
  {
    level: 'Lower Primary (6-8 years)',
    subject: 'Integrated',
    gameName: 'Vocabulary Adventure',
    howToPlay: 'Navigate a map by solving word puzzles to unlock the next path.',
    learningGoal: 'Reading comprehension and vocabulary.',
    mode: 'Online'
  },

  // Upper Primary (9-11 years)
  {
    level: 'Upper Primary (9-11 years)',
    subject: 'Literacy',
    gameName: 'Vocabulary Pictionary',
    howToPlay: 'One player draws a new vocabulary word, and their team has to guess the word based on the drawing.',
    learningGoal: 'Vocabulary expansion, creative thinking, and communication.',
    mode: 'Both'
  },
  {
    level: 'Upper Primary (9-11 years)',
    subject: 'Science & Tech',
    gameName: 'Simple Machine Scavenger Hunt',
    howToPlay: 'Hunt around the school or home to find and photograph examples of simple machines (lever, pulley, etc.) and explain how they work.',
    learningGoal: 'Identifying scientific principles in everyday objects.',
    mode: 'Both'
  },
  {
    level: 'Upper Primary (9-11 years)',
    subject: 'Social Studies',
    gameName: 'Historical Hot Seat',
    howToPlay: 'One student pretends to be a historical figure. The class asks "yes" or "no" questions to guess their identity.',
    learningGoal: 'Deepening knowledge of historical figures and events.',
    mode: 'Both'
  },
  {
    level: 'Upper Primary (9-11 years)',
    subject: 'Mathematics',
    gameName: 'Math Battle Arena',
    howToPlay: 'Challenge a classmate to a rapid-fire math duel to capture their base.',
    learningGoal: 'Competitive mental math.',
    mode: 'Online'
  },

  // Junior Secondary (12-14 years)
  {
    level: 'Junior Secondary (12-14 years)',
    subject: 'Literacy',
    gameName: 'Debate Dash',
    howToPlay: 'The class is split into two sides for a debatable topic. Each student has 30 seconds to make one point for their side before passing to the next person.',
    learningGoal: 'Public speaking, critical thinking, and structuring arguments.',
    mode: 'Both'
  },
  {
    level: 'Junior Secondary (12-14 years)',
    subject: 'Mathematics',
    gameName: 'Geometry Jeopardy',
    howToPlay: 'Create a Jeopardy board with categories like "Angles," "Triangles," "Area & Perimeter." Teams choose and solve problems for points.',
    learningGoal: 'Reinforcing geometry concepts and problem-solving strategies.',
    mode: 'Both'
  },
  {
    level: 'Junior Secondary (12-14 years)',
    subject: 'Science & Tech',
    gameName: 'Code Block Challenge',
    howToPlay: 'Using platforms like Scratch or Code.org, complete challenges like making a character tell a joke.',
    learningGoal: 'Introduction to computational thinking and basic coding logic.',
    mode: 'Online'
  },
  {
    level: 'Junior Secondary (12-14 years)',
    subject: 'Social Studies',
    gameName: 'GeoGuesser Team Battle',
    howToPlay: 'Using GeoGuessr, project the map to the class. Teams discuss and agree on a guess for the location. The closest team gets points.',
    learningGoal: 'Geography, cultural awareness, and deductive reasoning.',
    mode: 'Online'
  },
  {
    level: 'Junior Secondary (12-14 years)',
    subject: 'Science',
    gameName: 'Virtual Science Lab',
    howToPlay: 'Mix chemicals safely in a virtual environment to observe reactions.',
    learningGoal: 'Lab safety and chemical reactions.',
    mode: 'Online'
  },

  // Senior Secondary (15-18 years)
  {
    level: 'Senior Secondary (15-18 years)',
    subject: 'Literacy',
    gameName: 'Literary Analysis Shark Tank',
    howToPlay: 'Students "pitch" their interpretation of a literary theme or character to a panel of "sharks", defending their thesis with textual evidence.',
    learningGoal: 'Deep literary analysis, persuasive argumentation, and public speaking.',
    mode: 'Both'
  },
  {
    level: 'Senior Secondary (15-18 years)',
    subject: 'Science & Tech',
    gameName: 'Virtual Lab Simulation',
    howToPlay: 'Using online platforms like PhET Simulations, conduct experiments that would be difficult in a real lab (e.g., nuclear fission). Then write a lab report.',
    learningGoal: 'Understanding complex scientific concepts and data analysis.',
    mode: 'Online'
  },
  {
    level: 'Senior Secondary (15-18 years)',
    subject: 'Life Skills',
    gameName: 'Stock Market Game',
    howToPlay: "Using a virtual stock market simulator, each student gets a starting budget to invest in real companies over a term and present their portfolio's performance.",
    learningGoal: 'Financial literacy, investment principles, and long-term planning.',
    mode: 'Online'
  },
  {
    level: 'Senior Secondary (15-18 years)',
    subject: 'Exam Prep',
    gameName: 'CBT Exam Master',
    howToPlay: 'Gamified past questions interactive challenge with leaderboards.',
    learningGoal: 'Exam readiness and speed.',
    mode: 'Online'
  }
];