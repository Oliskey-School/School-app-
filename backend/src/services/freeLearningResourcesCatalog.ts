/**
 * The curated "Free Learning Resources" catalog.
 *
 * Every school gets a copy of these rows, because the Learning Hub stores
 * resources per school (getResources filters school_id + is_curated). For a
 * long time only the DEMO school had them, so the screen worked in the demo and
 * was empty for every real school in production.
 *
 * Two places consume this list and they must agree:
 *   - migration 20260930090000 backfills every existing school;
 *   - LearningHubService.seedCuratedCatalog covers each newly onboarded school.
 *
 * The entries were taken from the live catalog rather than retyped, so they are
 * exactly the vetted set the app already shipped — including the embeddability
 * checks migration 20260731030000 applied when it removed sources that refuse
 * to be framed. Adding an entry here only affects schools seeded afterwards;
 * to give it to existing schools, add a migration alongside it.
 */
export interface CuratedResource {
    title: string;
    description: string | null;
    url: string | null;
    source_name: string | null;
    category: string | null;
    subject: string | null;
    grade_level: string | null;
    recommended_age: string | null;
    tags: string[];
    resource_kind: string;
    type: string;
    curriculum_type: string | null;
}

export const FREE_LEARNING_RESOURCES: CuratedResource[] = [
    {"title":"Blockly Games","description":"Free block-based coding puzzles that teach programming logic without needing to type code.","url":"https://blockly.games/","source_name":"Blockly Games","category":"Computer Studies & Coding","subject":null,"grade_level":null,"recommended_age":"Primary 3 - JSS 3","tags":["Computer Studies","Coding & Programming"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"Code.org","description":"Free coding lessons and Hour of Code tutorials for every age, from block-based to real code.","url":"https://code.org/","source_name":"Code.org","category":"Computer Studies & Coding","subject":null,"grade_level":null,"recommended_age":"Creche - SSS3","tags":["Computer Studies","Coding & Programming"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"AdaptedMind — English Practice","description":"Free adaptive reading and grammar practice games that adjust to the student's level.","url":"https://www.adaptedmind.com/","source_name":"AdaptedMind","category":"English","subject":null,"grade_level":null,"recommended_age":"Primary 1 - Primary 6","tags":["English Language"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"National Geographic Kids","description":"Free articles, facts, photos, and games about animals, places, and cultures around the world.","url":"https://kids.nationalgeographic.com/","source_name":"National Geographic Kids","category":"Geography & Social Studies","subject":null,"grade_level":null,"recommended_age":"Primary 1 - JSS 3","tags":["Geography","Social Studies"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"Desmos Graphing Calculator","description":"Free, powerful graphing calculator used in classrooms worldwide — no signup needed to graph.","url":"https://www.desmos.com/calculator","source_name":"Desmos","category":"Mathematics","subject":null,"grade_level":null,"recommended_age":"JSS 1 - SSS 3","tags":["Mathematics"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"GeoGebra Classic","description":"Free graphing calculator, geometry, algebra, and statistics tools in one app.","url":"https://www.geogebra.org/classic","source_name":"GeoGebra","category":"Mathematics","subject":null,"grade_level":null,"recommended_age":"JSS 1 - SSS 3","tags":["Mathematics"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"Math Is Fun","description":"Math explained in plain language, with illustrated lessons, puzzles, and games from basic numbers to calculus.","url":"https://www.mathsisfun.com/","source_name":"Math Is Fun","category":"Mathematics","subject":null,"grade_level":null,"recommended_age":"Primary 1 - SSS 3","tags":["Mathematics"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"PhET — Fraction Matcher","description":"Free, research-based interactive math simulations from the University of Colorado Boulder.","url":"https://phet.colorado.edu/sims/html/fraction-matcher/latest/fraction-matcher_en.html","source_name":"PhET Interactive Simulations","category":"Mathematics","subject":null,"grade_level":null,"recommended_age":"Primary 3 - JSS 2","tags":["Mathematics"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"Shodor Interactivate","description":"Free interactive courseware for exploring math concepts through activities and simulations.","url":"https://www.shodor.org/interactivate/","source_name":"Shodor Interactivate","category":"Mathematics","subject":null,"grade_level":null,"recommended_age":"Primary 4 - SSS 3","tags":["Mathematics"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"PhET — Gravity and Orbits","description":"Explore gravity, orbits, and how planets and moons move through space.","url":"https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_en.html","source_name":"PhET Interactive Simulations","category":"STEM & Interactive Learning","subject":null,"grade_level":null,"recommended_age":"Primary 4 - SSS 1","tags":["STEM","Basic Science"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"Shodor Interactivate — STEM","description":"Free interactive STEM activities blending math and science exploration.","url":"https://www.shodor.org/interactivate/","source_name":"Shodor Interactivate","category":"STEM & Interactive Learning","subject":null,"grade_level":null,"recommended_age":"Primary 4 - SSS 3","tags":["STEM","Mathematics","Basic Science"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"PhET — States of Matter","description":"Explore atoms and molecules changing between solid, liquid, and gas states.","url":"https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html","source_name":"PhET Interactive Simulations","category":"Science","subject":null,"grade_level":null,"recommended_age":"Primary 5 - JSS 3","tags":["Basic Science","Science"],"resource_kind":"website","type":"link","curriculum_type":null},
    {"title":"Shodor Interactivate — Science","description":"Free interactive science activities and simulations for exploring core science concepts.","url":"https://www.shodor.org/interactivate/","source_name":"Shodor Interactivate","category":"Science","subject":null,"grade_level":null,"recommended_age":"Primary 4 - SSS 3","tags":["Basic Science","Science"],"resource_kind":"website","type":"link","curriculum_type":null}
];
