# Nigerian Curriculum - Complete Subject Structure 📚

## Overview
This document outlines the complete Nigerian education curriculum from Early Years to Senior Secondary School, as implemented in the school management system.

---

## 🧸 EARLY YEARS (Pre-Nursery & Nursery)
**Grades**: 0-2 (Pre-Nursery, Nursery 1, Nursery 2)

At this stage, subjects are called **"Activity Areas"** focusing on foundational skills.

### Activity Areas:
1. **Numeracy (Number Work)** - Basic counting and number recognition
2. **Literacy (Letter Work/Phonics)** - Letter recognition and phonics
3. **Discovery Science** - Elementary science exploration
4. **Social Habits** - Civic and security education basics
5. **Health Habits** - Physical and health education
6. **Creative Arts** - Coloring, drawing, and craft
7. **Rhymes/Poems** - Language development through songs
8. **Handwriting** - Pre-writing skills development
9. **Religious Knowledge** - CRS/IRS introduction

---

## 🏫 PRIMARY SCHOOL (Basic 1-6)
**Grades**: 3-8 (Basic 1 through Basic 6)

The curriculum is divided into:
- **Lower Basic**: Basic 1-3 (Grades 3-5)
- **Middle Basic**: Basic 4-6 (Grades 6-8)

### Core Subjects (All Grades):
1. **English Studies**
2. **Mathematics**
3. **Basic Science and Technology**
4. **Social Studies**
5. **Civic Education**
6. **Security Education**
7. **Cultural and Creative Arts (CCA)**
8. **Nigerian Language** (Yoruba, Igbo, or Hausa)
9. **Physical and Health Education (PHE)**
10. **Computer Studies/ICT**
11. **Agriculture/Home Economics** (Pre-Vocational Studies)
12. **Christian Religious Studies (CRS)**
13. **Islamic Studies (IRS)**

### Additional Subject (From Basic 4):
14. **French Language** - Introduced from Basic 4 onwards (Grade 6+)

### Subject Categories:

#### Core Academic:
- English Studies
- Mathematics
- Basic Science and Technology
- Social Studies
- Civic Education

#### Languages & Arts:
- Nigerian Language
- Cultural and Creative Arts (CCA)
- French Language (Basic 4-6)

#### Religion & Values:
- Christian Religious Studies (CRS)
- Islamic Studies (IRS)
- Security Education

#### Practical Subjects:
- Physical and Health Education (PHE)
- Computer Studies/ICT
- Agriculture/Home Economics

---

## 🎓 JUNIOR SECONDARY SCHOOL (JSS 1-3)
**Grades**: 9-11 (JSS 1, JSS 2, JSS 3)

Also known as **Upper Basic**. Students typically take **10-13 subjects**.

### Subject Categories:

#### Core Compulsory (5 subjects):
1. **English Language**
2. **Mathematics**
3. **Basic Science**
4. **Social Studies**
5. **Civic Education**

#### Vocational/Technical (4 subjects):
6. **Basic Technology**
7. **Agricultural Science**
8. **Home Economics**
9. **Business Studies**

#### Arts & Languages (4 subjects):
10. **Cultural & Creative Arts (CCA)**
11. **French Language**
12. **Nigerian Language** (Hausa/Igbo/Yoruba)
13. **Music**

#### Religion (Choose 1):
14. **Christian Religious Studies (CRS)** OR
15. **Islamic Studies (IRS)**

#### Digital (1 subject):
16. **Computer Studies / Digital Literacy**

**Total**: 10-13 subjects depending on school offerings

---

## 🚀 SENIOR SECONDARY SCHOOL (SSS 1-3)
**Grades**: 12-14 (SSS 1, SSS 2, SSS 3)

Students choose a **"track"** (Science, Arts, or Commercial).

### 1. CORE COMPULSORY SUBJECTS (For ALL Tracks)

All students must take these **5 subjects** regardless of their chosen track:

1. **English Language**
2. **General Mathematics**
3. **Civic Education**
4. **Data Processing** (or one Trade Subject)
5. **Biology**

### 2. SCIENCE TRACK

#### Core Compulsory (5):
- English Language
- General Mathematics
- Civic Education
- Data Processing
- Biology

#### Science Electives (6):
6. **Physics** ⭐
7. **Chemistry** ⭐
8. **Further Mathematics** ⭐
9. **Geography**
10. **Agricultural Science**
11. **Technical Drawing** (Optional)

**Total**: 11 subjects

**Common Combinations**:
- Physics, Chemistry, Biology, Further Maths (Pure Science)
- Physics, Chemistry, Biology, Geography (Science/Geography)
- Physics, Chemistry, Biology, Agricultural Science (Agric Science)

---

### 3. ARTS TRACK

#### Core Compulsory (5):
- English Language
- General Mathematics
- Civic Education
- Data Processing
- Biology

#### Arts Electives (8):
6. **Literature-in-English** ⭐
7. **Government** ⭐
8. **History**
9. **Christian Religious Studies (CRS)** OR **Islamic Studies (IRS)**
10. **Nigerian Language** (Hausa/Igbo/Yoruba)
11. **Fine Arts** (Optional)
12. **Geography**

**Total**: 10-12 subjects

**Common Combinations**:
- Literature, Government, History, CRS/IRS (Humanities)
- Literature, Government, Geography, Nigerian Language (Social Sciences)
- Fine Arts, Literature, Government, History (Creative Arts)

---

### 4. COMMERCIAL TRACK

#### Core Compulsory (5):
- English Language
- General Mathematics
- Civic Education
- Data Processing
- Biology

#### Commercial Electives (7):
6. **Financial Accounting** ⭐
7. **Commerce** ⭐
8. **Economics** ⭐
9. **Government**
10. **Marketing** (Often taken as Trade subject)
11. **Office Practice**
12. **Business Studies**

**Total**: 11-12 subjects

**Common Combinations**:
- Accounting, Commerce, Economics, Government (Business Management)
- Accounting, Commerce, Economics, Marketing (Marketing/Sales)
- Accounting, Economics, Government, Office Practice (Public Administration)

---

## 📋 TRADE SUBJECTS (SSS)

Students can choose **one Trade Subject** instead of Data Processing:

1. **Catering Craft**
2. **Marketing**
3. **Dyeing/Bleaching**
4. **Data Processing** (Most common)
5. **Office Practice**
6. **Garment Making**
7. **Auto Mechanics**
8. **Electrical Installation**
9. **Building Construction**
10. **Metal Work**
11. **Wood Work**
12. **Printing**
13. **Cosmetology**

---

## 🎯 SUBJECT REQUIREMENTS BY TRACK

### Minimum Subject Count:
- **Science Track**: 9-11 subjects
- **Arts Track**: 9-12 subjects
- **Commercial Track**: 9-12 subjects

### WAEC/NECO Requirements:
Students must register for **minimum 8 subjects** including:
- English Language (Compulsory)
- Mathematics (Compulsory)
- 6 other subjects relevant to their track

---

## 💡 HOW TO USE IN THE APP

### Get Subjects for a Student:

```typescript
import { getSubjectsForGrade, getSubjectsByCategory } from './lib/schoolSystem';

// Get all subjects for a student
const subjects = getSubjectsForGrade(12, 'Science'); // SSS 1 Science

// Get subjects organized by category
const categorized = getSubjectsByCategory(12, 'Science');
// Returns:
// [
//   { category: 'Core Compulsory (All Tracks)', subjects: [...] },
//   { category: 'Science Track Electives', subjects: [...] }
// ]
```

### Display Grade Name:

```typescript
import { getGradeDisplayName } from './lib/schoolSystem';

const displayName = getGradeDisplayName(9); // Returns "JSS 1"
const displayName2 = getGradeDisplayName(12); // Returns "SSS 1"
```

### Get Trade Subjects:

```typescript
import { getTradeSubjects } from './lib/schoolSystem';

const trades = getTradeSubjects();
// Returns array of all available trade subjects
```

---

## 📊 SUBJECT COUNT SUMMARY

| Level | Grade Range | Subject Count |
|-------|-------------|---------------|
| Early Years | 0-2 | 9 Activity Areas |
| Primary (Basic 1-3) | 3-5 | 13 Subjects |
| Primary (Basic 4-6) | 6-8 | 14 Subjects (+ French) |
| Junior Secondary | 9-11 | 10-13 Subjects |
| Senior Secondary | 12-14 | 9-12 Subjects (by track) |

---

## 🎓 EXAMINATION BODIES

### Primary Level:
- **Common Entrance Examination** (for admission to JSS)

### Junior Secondary:
- **Basic Education Certificate Examination (BECE)**
- **Junior WAEC** (in some states)

### Senior Secondary:
- **West African Examinations Council (WAEC)**
- **National Examinations Council (NECO)**
- **National Business and Technical Examinations Board (NABTEB)** - for vocational subjects

---

## ✅ IMPLEMENTATION STATUS

✅ **Early Years** - 9 Activity Areas implemented
✅ **Primary** - 13-14 Subjects implemented
✅ **JSS** - 16 Subjects implemented
✅ **SSS Science** - 11 Subjects implemented
✅ **SSS Arts** - 12 Subjects implemented
✅ **SSS Commercial** - 12 Subjects implemented
✅ **Trade Subjects** - 13 Options implemented

---

## 📝 NOTES

1. **Religious Studies**: Students typically choose either CRS or IRS, not both
2. **Nigerian Language**: Schools offer one of Hausa, Igbo, or Yoruba based on location
3. **Trade Subjects**: One trade subject can replace Data Processing in SSS
4. **Biology**: While listed as core compulsory, some schools make it elective for Arts students
5. **Subject Combinations**: Students should choose subjects relevant to their intended university course

---

## 🔄 UPDATES

This curriculum structure follows the **Nigerian National Curriculum** as approved by the Nigerian Educational Research and Development Council (NERDC).

**Last Updated**: December 2025
**Curriculum Version**: 2024 Revised Edition

---

## 📚 REFERENCES

- Nigerian Educational Research and Development Council (NERDC)
- Federal Ministry of Education Curriculum Framework
- WAEC Syllabus Guidelines
- NECO Syllabus Guidelines

---

**For implementation details, see**: `lib/schoolSystem.ts`
