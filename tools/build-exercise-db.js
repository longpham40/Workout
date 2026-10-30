// Builds data/exercise-db.json from free-exercise-db (https://github.com/yuhonas/free-exercise-db),
// which is public domain. The app loads it when you open the exercise library.
//   1. Download https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
//   2. Run:  node tools/build-exercise-db.js path/to/exercises.json
// Photos aren't copied: the app loads them from the jsDelivr CDN (see IMAGE_BASE in js/exercise-db.js).

const fs = require('fs');
const path = require('path');

const source = process.argv[2];
if (!source) {
  console.log('Usage: node tools/build-exercise-db.js path/to/exercises.json');
  process.exit(1);
}

const GEAR = {
  'body only': 'bodyweight',
  dumbbell: 'dumbbell',
  barbell: 'barbell',
  'e-z curl bar': 'barbell',
  kettlebells: 'kettlebell',
  machine: 'machine',
  cable: 'cable',
  bands: 'bands',
};
const LEVEL = { beginner: 'beginner', intermediate: 'intermediate', expert: 'advanced' };

const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
const out = raw
  // A few entries have no instructions; the library only lists ones you can learn from.
  .filter(e => e.instructions?.length)
  .map(e => {
    const item = {
      id: e.id,
      name: e.name,
      level: LEVEL[e.level] || 'beginner',
      // No equipment listed usually means bodyweight; foam rollers, balls and the like are "other".
      gear: e.equipment == null ? 'bodyweight' : GEAR[e.equipment] || 'other',
      category: e.category,
      primary: e.primaryMuscles,
      secondary: e.secondaryMuscles,
      steps: e.instructions,
      images: e.images.length,
    };
    if (e.force) item.force = e.force;
    if (e.mechanic) item.mechanic = e.mechanic;
    return item;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const file = path.join(__dirname, '..', 'data', 'exercise-db.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`Wrote ${out.length} exercises to data/exercise-db.json (${Math.round(fs.statSync(file).size / 1024)} KB).`);
