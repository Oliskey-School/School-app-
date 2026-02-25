export interface LessonContent {
  objectives: string[];
  introduction: string;
  steps: { title: string; content: string }[];
  evaluation: string[];
}

export interface CurriculumMap {
  [subject: string]: {
    [className: string]: {
      [term: string]: {
        [topic: string]: {
          [subTopic: string]: LessonContent;
        };
      };
    };
  };
}

export const curriculumMap: CurriculumMap = {
  'Mathematics': {
    'Primary 4': {
      'Term 1': {
        'Number and Numeration': {
          'Place Value': {
            objectives: [
              'Identify the place value of digits in numbers up to 100,000',
              'Read and write numbers in words and figures',
              'Compare and order numbers based on their place value'
            ],
            introduction: 'Place value is the value of each digit in a number. For example, the 5 in 350 represents 5 tens, or 50.',
            steps: [
              {
                title: 'Understanding Units, Tens, and Hundreds',
                content: 'Start with 1-digit numbers (Units), 2-digit numbers (Tens), and 3-digit numbers (Hundreds). Explain how moving one position to the left increases the value by 10 times.'
              },
              {
                title: 'Expanding to Thousands',
                content: 'Introduce the thousands period. Show how 1,234 is composed of 1 Thousand, 2 Hundreds, 3 Tens, and 4 Units.'
              }
            ],
            evaluation: [
              'What is the place value of 7 in 74,321?',
              'Write forty-five thousand in figures.',
              'Compare 56,789 and 56,879.'
            ]
          },
          'Addition and Subtraction': {
            objectives: [
              'Add and subtract 4-digit numbers with regrouping',
              'Solve word problems involving addition and subtraction'
            ],
            introduction: 'Addition is finding the total, or sum, by combining two or more numbers. Subtraction is taking one number away from another.',
            steps: [
              {
                title: 'Column Addition',
                content: 'Align numbers by place value and add starting from units. Regroup when the sum is 10 or more.'
              },
              {
                title: 'Column Subtraction',
                content: 'Align numbers and subtract. Borrow from the next place value if the top digit is smaller than the bottom.'
              }
            ],
            evaluation: [
              'Calculate 4,567 + 3,892',
              'Find the difference between 9,000 and 4,532',
              'If a school has 1,200 boys and 1,350 girls, what is the total number of students?'
            ]
          }
        }
      }
    }
  },
  'English Studies': {
    'Primary 4': {
      'Term 1': {
        'Parts of Speech': {
          'Nouns': {
            objectives: [
              'Define a noun and identify common and proper nouns',
              'Differentiate between singular and plural nouns',
              'Use nouns correctly in sentences'
            ],
            introduction: 'A noun is a word that names a person, place, thing, or idea. Examples: John, Lagos, table, happiness.',
            steps: [
              {
                title: 'Common vs Proper Nouns',
                content: 'Common nouns name general things (city, boy), while proper nouns name specific things and start with capital letters (Abuja, Peter).'
              },
              {
                title: 'Singular and Plural',
                content: 'Most nouns add "s" to become plural (book -> books). Some have irregular plurals (child -> children, man -> men).'
              }
            ],
            evaluation: [
              'Circle the nouns in this sentence: "The girl went to the market in Ibadan."',
              'Give three examples of proper nouns.',
              'What is the plural of "ox"?'
            ]
          }
        }
      }
    }
  }
};
