// Workout content. Edit the text here and refresh the app to see it.

const TRAINING_TYPES = [
  {
    id: 'gym',
    name: 'Gym weights',
    icon: 'train',
    blurb: 'Barbells, dumbbells and machines to build strength and muscle.',
    equipment: 'Gym access',
  },
  {
    id: 'home',
    name: 'Home workouts',
    icon: 'home',
    blurb: 'Bodyweight circuits you can do in a small space, with optional dumbbells or bands.',
    equipment: 'None needed. Dumbbells or a band are optional.',
  },
  {
    id: 'cardio',
    name: 'Cardio',
    icon: 'cardio',
    blurb: 'Walking, running, cycling and intervals for your heart, lungs and stamina.',
    equipment: 'Good shoes. A bike, rower or treadmill is optional.',
  },
  {
    id: 'calisthenics',
    name: 'Calisthenics',
    icon: 'calisthenics',
    blurb: 'Master your own bodyweight: push-ups, pull-ups, dips, squats and skills.',
    equipment: 'A pull-up bar helps. Sturdy chairs or a low bar work for dips and rows.',
  },
];

const LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    blurb: 'New to this style, or back after 6+ months off. Learn the movements and build the habit.',
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    blurb: 'Six months or more of steady training. More volume and planned progression.',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    blurb: 'Two years or more of consistent training. Higher intensity, split routines and lighter recovery weeks.',
  },
];

const SAFETY_TIPS = [
  'Warm up for 5–10 minutes before every session: light cardio, then easy sets of your first exercise.',
  'Muscle burn and hard effort are normal. Sharp, stabbing or joint pain is not: stop that exercise.',
  'Pain that lasts more than 48 hours, or any swelling, means rest and get it checked by a physio or doctor.',
  'If you have a heart condition, an injury, are pregnant, or are returning after a long break, check with a doctor first.',
];
