const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

fs.readdir(migrationsDir, (err, files) => {
    if (err) {
        console.error('Error reading migrations directory:', err);
        return;
    }

    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    // Separate files with number prefixes from those without
    const numberedFiles = sqlFiles.filter(f => /^\d+/.test(f)).sort();
    const unnumberedFiles = sqlFiles.filter(f => !/^\d+/.test(f)).sort();

    // Combine them, so numbered files come first in their existing order
    const sortedFiles = [...numberedFiles, ...unnumberedFiles];

    sortedFiles.forEach((file, index) => {
        const newName = `${String(index + 1).padStart(3, '0')}_${file.replace(/^\d+[_]?/, '')}`;
        const oldPath = path.join(migrationsDir, file);
        const newPath = path.join(migrationsDir, newName);

        if (oldPath !== newPath) {
            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error(`Error renaming ${file} to ${newName}:`, err);
                } else {
                    console.log(`Renamed ${file} to ${newName}`);
                }
            });
        }
    });
});
