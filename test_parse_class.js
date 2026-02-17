
const parseClassName = (name) => {
    const clean = name.trim();
    let grade = 0;
    let section = '';

    const standardMatch = clean.match(/^(?:Grade|Year)?\s*(\d+)\s*(.*)$/i);
    const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
    const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i);
    const primaryMatch = clean.match(/^Primary\s*(\d+)\s*(.*)$/i);

    if (standardMatch) {
        grade = parseInt(standardMatch[1]);
        section = standardMatch[2];
        console.log(`Matched Standard: ${grade} ${section}`);
    } else if (jsMatch) {
        grade = 6 + parseInt(jsMatch[1]);
        section = jsMatch[2];
        console.log(`Matched JSS: ${grade} ${section}`);
    } else if (ssMatch) {
        grade = 9 + parseInt(ssMatch[1]);
        section = ssMatch[2];
        console.log(`Matched SSS: ${grade} ${section}`);
    } else if (primaryMatch) {
        grade = parseInt(primaryMatch[1]);
        section = primaryMatch[2];
        console.log(`Matched Primary: ${grade} ${section}`);
    }

    section = section.replace(/^[-–]\s*/, '').trim();
    return { grade, section };
};

const testCases = [
    "Primary 1",
    "Primary 2",
    "Primary 3",
    "SSS 1",
    "SSS 2",
    "SSS 3",
    "JSS 1",
    "Grade 4"
];

testCases.forEach(name => {
    console.log(`Parsing "${name}":`, parseClassName(name));
});
