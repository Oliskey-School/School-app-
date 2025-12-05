

import { CurriculumSubject, Department, CurriculumSubjectCategory } from './types';

const curriculum: { [stage: string]: any } = {
  'Pre-primary': {
    'Crèche/Playgroup': {
      subjects: [
        { name: 'Social-Emotional Development', category: 'Foundational Play-Based Learning' },
        { name: 'Language and Communication', category: 'Foundational Play-Based Learning' },
        { name: 'Cognitive Skills', category: 'Foundational Play-Based Learning' },
        { name: 'Gross & Fine Motor Skills', category: 'Foundational Play-Based Learning' },
        { name: 'Sensory Exploration', category: 'Foundational Play-Based Learning' },
      ],
    },
    'Nursery 1': {
      subjects: [
        { name: 'Numeracy', category: 'Core Foundational' },
        { name: 'Literacy', category: 'Core Foundational' },
        { name: 'Social Habits', category: 'Core Foundational' },
        { name: 'Health Habits', category: 'Core Foundational' },
        { name: 'Creative Arts', category: 'Core Foundational' },
        { name: 'Rhymes and Songs', category: 'Core Foundational' },
        { name: 'Movement and Physical Activity', category: 'Core Foundational' },
      ],
    },
    'Nursery 2': {
      subjects: [
        { name: 'Numeracy', category: 'Core Foundational' },
        { name: 'Literacy', category: 'Core Foundational' },
        { name: 'Social Habits', category: 'Core Foundational' },
        { name: 'Health Habits', category: 'Core Foundational' },
        { name: 'Creative Arts', category: 'Core Foundational' },
        { name: 'Rhymes and Songs', category: 'Core Foundational' },
        { name: 'Movement and Physical Activity', category: 'Core Foundational' },
      ],
    },
    'Reception/Kindergarten': {
      subjects: [
        { name: 'Numeracy', category: 'Pre-Primary Core' },
        { name: 'Literacy', category: 'Pre-Primary Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Pre-Primary Core' },
        { name: 'Social Studies', category: 'Pre-Primary Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Pre-Primary Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Pre-Primary Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Pre-Primary Core' },
      ],
    },
  },
  'Primary': {
    '1': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Elective' },
      ],
    },
    '2': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Elective' },
      ],
    },
    '3': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Elective' },
      ],
    },
    '4': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'Agricultural Science', category: 'Core' },
        { name: 'Home Economics', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Elective' },
        { name: 'French Language', category: 'Elective' },
      ],
    },
     '5': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'Agricultural Science', category: 'Core' },
        { name: 'Home Economics', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Elective' },
        { name: 'French Language', category: 'Elective' },
      ],
    },
     '6': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science and Technology (BST)', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'Agricultural Science', category: 'Core' },
        { name: 'Home Economics', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Elective' },
        { name: 'French Language', category: 'Elective' },
      ],
    },
  },
  'JSS': {
    '1': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science', category: 'Core' },
        { name: 'Basic Technology', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Core' },
        { name: 'Business Studies', category: 'Pre-Vocational Electives' },
        { name: 'Agricultural Science', category: 'Pre-Vocational Electives' },
        { name: 'Home Economics', category: 'Pre-Vocational Electives' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Other Electives' },
        { name: 'French Language', category: 'Other Electives' },
        { name: 'Arabic Language', category: 'Other Electives' },
      ],
    },
    '2': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science', category: 'Core' },
        { name: 'Basic Technology', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Core' },
        { name: 'Business Studies', category: 'Pre-Vocational Electives' },
        { name: 'Agricultural Science', category: 'Pre-Vocational Electives' },
        { name: 'Home Economics', category: 'Pre-Vocational Electives' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Other Electives' },
        { name: 'French Language', category: 'Other Electives' },
        { name: 'Arabic Language', category: 'Other Electives' },
      ],
    },
    '3': {
      subjects: [
        { name: 'English Studies', category: 'Core' },
        { name: 'Mathematics', category: 'Core' },
        { name: 'Basic Science', category: 'Core' },
        { name: 'Basic Technology', category: 'Core' },
        { name: 'Social Studies', category: 'Core' },
        { name: 'Civic Education', category: 'Core' },
        { name: 'Computer Studies/ICT', category: 'Core' },
        { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Core' },
        { name: 'Physical and Health Education (PHE)', category: 'Core' },
        { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Core' },
        { name: 'Business Studies', category: 'Pre-Vocational Electives' },
        { name: 'Agricultural Science', category: 'Pre-Vocational Electives' },
        { name: 'Home Economics', category: 'Pre-Vocational Electives' },
        { name: 'Cultural and Creative Arts (CCA)', category: 'Other Electives' },
        { name: 'French Language', category: 'Other Electives' },
        { name: 'Arabic Language', category: 'Other Electives' },
      ],
    },
  },
  'SSS': {
    compulsory: [
      { name: 'English Language', category: 'Compulsory' },
      { name: 'General Mathematics', category: 'Compulsory' },
      { name: 'Civic Education', category: 'Compulsory' },
      { name: 'Computer Studies/ICT', category: 'Compulsory' },
      { name: 'Entrepreneurship', category: 'Compulsory' },
    ],
    departments: {
      Science: {
        core: [
          { name: 'Physics', category: 'Core' },
          { name: 'Chemistry', category: 'Core' },
          { name: 'Biology', category: 'Core' },
        ],
        electives: [
          { name: 'Further Mathematics', category: 'Elective' },
          { name: 'Agricultural Science', category: 'Elective' },
          { name: 'Technical Drawing', category: 'Elective' },
          { name: 'Geography', category: 'Elective' },
        ],
      },
      Commercial: {
        core: [
          { name: 'Economics', category: 'Core' },
          { name: 'Financial Accounting', category: 'Core' },
          { name: 'Commerce', category: 'Core' },
        ],
        electives: [
          { name: 'Government', category: 'Elective' },
          { name: 'Geography', category: 'Elective' },
          { name: 'Further Mathematics', category: 'Elective' },
          { name: 'Office Practice', category: 'Elective' },
        ],
      },
      Arts: {
        core: [
          { name: 'Literature-in-English', category: 'Core' },
          { name: 'Government', category: 'Core' },
          { name: 'One major Nigerian Language (Yoruba, Igbo, or Hausa)', category: 'Core' },
        ],
        electives: [
          { name: 'Christian/Islamic Religious Studies (CRS/IRS)', category: 'Elective' },
          { name: 'History', category: 'Elective' },
          { name: 'Economics', category: 'Elective' },
          { name: 'Fine Arts / Visual Arts', category: 'Elective' },
          { name: 'Music', category: 'Elective' },
          { name: 'French Language', category: 'Elective' },
        ],
      },
    },
  },
};

export const getCurriculum = (level: string, department?: Department): CurriculumSubject[] => {
  const parts = level.split(' ');
  const stage = parts[0];
  const classLevel = parts.slice(1).join(' ');

  if (stage === 'Primary' || stage === 'JSS') {
    return curriculum[stage][classLevel]?.subjects || [];
  }
  
  if (stage.startsWith('Nursery') || stage.startsWith('Crèche') || stage.startsWith('Reception')) {
      return curriculum['Pre-primary'][level]?.subjects || [];
  }

  if (stage === 'SSS') {
    if (!department) return [];
    const compulsory = curriculum.SSS.compulsory;
    const dept = curriculum.SSS.departments[department];
    if (!dept) return [];
    return [...compulsory, ...dept.core, ...dept.electives];
  }

  return [];
};
