// Upper body and lower body workouts: one workout per area, training style and level.
// They stand on their own, so you can train by body area instead of (or as well as) a program.
// Calisthenics workouts are bodyweight only: no added weight.
//
// Each exercise line uses rx(exercise id, sets, reps or time, rest in seconds, optional note),
// the same as data/programs.js. Exercise ids match the names in data/exercises.js.

const BODY_AREAS = [
  {
    id: 'upper',
    name: 'Upper body',
    icon: 'upper',
    blurb: 'Chest, back, shoulders and arms.',
    plan: 'Pair it with a Lower body workout. Two of each a week works well, e.g. Upper Mon and Thu, Lower Tue and Fri. Leave about 48 hours before you train the same area again.',
  },
  {
    id: 'lower',
    name: 'Lower body',
    icon: 'lower',
    blurb: 'Quads, glutes, hamstrings and calves, plus core.',
    plan: 'Pair it with an Upper body workout. Two of each a week works well, e.g. Upper Mon and Thu, Lower Tue and Fri. Leave about 48 hours before you train the same area again.',
  },
];

// Training styles that have upper and lower body workouts. Cardio trains the whole body, so it isn't split.
const AREA_TYPES = ['gym', 'home', 'calisthenics'];

const AREA_WORKOUTS = {
  // ======================= UPPER BODY =======================
  upper: {
    gym: {
      beginner: {
        focus: 'One push and one pull for each direction, plus arms. Learn to control every rep.',
        duration: '40–45 min',
        main: [
          rx('dumbbell-bench-press', 3, '8–10', 90, 'Pick a weight that leaves 2–3 reps in the tank.'),
          rx('lat-pulldown', 3, '10–12', 90),
          rx('seated-dumbbell-press', 3, '10', 90),
          rx('seated-cable-row', 3, '10–12', 90, 'Squeeze your shoulder blades together for a second at the end.'),
          rx('dumbbell-curl', 2, '12', 60),
          rx('tricep-pushdown', 2, '12', 60),
        ],
      },
      intermediate: {
        focus: 'Heavy pressing and rowing first, then volume for shoulders and upper back.',
        duration: '55–65 min',
        main: [
          rx('bench-press', 4, '6–8', 150, 'Leave 1–2 reps in reserve on every set.'),
          rx('barbell-row', 4, '8', 120),
          rx('overhead-press', 3, '8', 120),
          rx('lat-pulldown', 3, '10', 90),
          rx('incline-dumbbell-press', 3, '10', 90),
          rx('lateral-raise', 3, '12–15', 60),
          rx('face-pull', 3, '15', 60, 'Light and smooth. This keeps your shoulders healthy.'),
        ],
      },
      advanced: {
        focus: 'Strength on the big lifts, then enough volume to keep building muscle.',
        duration: '70–80 min',
        main: [
          rx('bench-press', 5, '4–6', 180, 'Work up to a heavy set of 4–6 with 1 rep in reserve.'),
          rx('pull-up', 4, '6–8', 150, 'Add weight with a belt or backpack once you can do 4 × 8 cleanly.'),
          rx('overhead-press', 4, '6', 150),
          rx('one-arm-dumbbell-row', 3, '10 each side', 90),
          rx('incline-dumbbell-press', 3, '10', 90),
          rx('dip', 3, '8–12', 90),
          rx('lateral-raise', 3, '15', 45),
          rx('dumbbell-curl', 3, '10', 60),
          rx('face-pull', 3, '15', 60),
        ],
      },
    },
    home: {
      beginner: {
        focus: 'Push-up basics, rowing with a backpack and posture work. No equipment beyond a backpack.',
        duration: '25–30 min',
        main: [
          rx('incline-push-up', 3, '8–12', 60, 'Use a lower surface as it gets easier.'),
          rx('backpack-row', 3, '10–12', 60),
          rx('prone-ytw', 2, '6 of each letter', 45),
          rx('plank', 3, '20–30 s', 45),
        ],
      },
      intermediate: {
        focus: 'Floor push-ups, shoulder pressing and more back work to balance it out.',
        duration: '35–40 min',
        main: [
          rx('push-up', 4, '8–15', 75),
          rx('backpack-row', 4, '10–12', 75, 'Lower for 3 seconds on every rep.'),
          rx('pike-push-up', 3, '6–10', 75),
          rx('close-grip-push-up', 3, '8–12', 60),
          rx('prone-ytw', 3, '8 of each letter', 45),
          rx('plank', 3, '30–45 s', 45),
        ],
      },
      advanced: {
        focus: 'One-arm-biased pushing, chair dips and feet-up pike push-ups for strength at home.',
        duration: '40–45 min',
        main: [
          rx('archer-push-up', 4, '5–8 each side', 90),
          rx('pike-push-up', 4, '8–12', 90, 'Feet up on a chair to make it harder.'),
          rx('backpack-row', 4, '12–15', 75, 'Fill the backpack heavier, or pause for 2 seconds at the top.'),
          rx('dip', 3, '8–12', 90, 'Use two sturdy chairs that can’t slide.'),
          rx('close-grip-push-up', 3, '10–15', 60),
          rx('prone-ytw', 3, '10 of each letter', 45),
        ],
      },
    },
    calisthenics: {
      beginner: {
        focus: 'Building the pulling strength for your first pull-up, with easy pushing alongside.',
        duration: '30–35 min',
        main: [
          rx('incline-push-up', 3, '8–12', 75),
          rx('inverted-row', 3, '6–10', 90, 'Walk your feet back to make it easier.'),
          rx('scapular-pull-up', 3, '6–8', 60),
          rx('negative-pull-up', 3, '3–5', 120, 'Lower yourself for 3–5 seconds.'),
          rx('dead-hang', 3, '15–30 s', 60),
        ],
      },
      intermediate: {
        focus: 'Pull-ups and dips as the main lifts, with rows and pike push-ups for balance.',
        duration: '45–50 min',
        main: [
          rx('pull-up', 4, '5–8', 120),
          rx('dip', 4, '6–10', 120),
          rx('inverted-row', 3, '10–12', 90),
          rx('pike-push-up', 3, '8–10', 90),
          rx('push-up', 3, '15', 60),
          rx('hanging-knee-raise', 3, '10', 60),
        ],
      },
      advanced: {
        focus: 'Power pulling, slow deep dips and skill holds for shoulders and core. All bodyweight.',
        duration: '55–60 min',
        main: [
          rx('explosive-pull-up', 4, '3–5', 150, 'Pull fast so your chest reaches the bar. Stop when reps slow down.'),
          rx('dip', 4, '8–12', 120, 'Once 4 × 12 is easy, lower for 4 seconds and pause at the bottom.'),
          rx('archer-push-up', 4, '6 each side', 90),
          rx('inverted-row', 3, '12–15', 90, 'Feet up on a box to make it harder.'),
          rx('wall-handstand-hold', 4, '30–45 s', 90),
          rx('l-sit', 3, '10–20 s', 90),
        ],
      },
    },
  },

  // ======================= LOWER BODY =======================
  lower: {
    gym: {
      beginner: {
        focus: 'A squat, a hip hinge and machine work to build leg strength safely.',
        duration: '40–45 min',
        main: [
          rx('goblet-squat', 3, '10', 90, 'Sit down between your heels and keep your chest up.'),
          rx('romanian-deadlift', 3, '10', 90, 'Use dumbbells to start. Stop when you feel a stretch in your hamstrings.'),
          rx('leg-press', 3, '10–12', 90),
          rx('leg-curl', 2, '12', 60),
          rx('standing-calf-raise', 3, '12–15', 60),
          rx('dead-bug', 2, '8 each side', 45),
        ],
      },
      intermediate: {
        focus: 'Barbell squats for strength, then hinge and single-leg work.',
        duration: '55–65 min',
        main: [
          rx('back-squat', 4, '6–8', 180, 'Leave 1–2 reps in reserve on every set.'),
          rx('romanian-deadlift', 3, '8–10', 120),
          rx('bulgarian-split-squat', 3, '8 each leg', 90),
          rx('leg-curl', 3, '10–12', 60),
          rx('standing-calf-raise', 4, '10–12', 60, 'Pause for a second at the bottom of each rep.'),
          rx('pallof-press', 3, '10 each side', 45),
        ],
      },
      advanced: {
        focus: 'Heavy squats, then glutes and hamstrings with enough volume to keep growing.',
        duration: '70–80 min',
        main: [
          rx('back-squat', 5, '3–5', 180, 'Work up to heavy sets with 1 rep in reserve.'),
          rx('romanian-deadlift', 4, '6–8', 150, 'Stop each set 2 reps short. The squats have already tired your back.'),
          rx('hip-thrust', 3, '8–10', 120),
          rx('walking-lunge', 3, '10 each leg', 90),
          rx('leg-curl', 3, '10–12', 60),
          rx('standing-calf-raise', 4, '10–15', 60),
          rx('hanging-knee-raise', 3, '10–12', 60),
        ],
      },
    },
    home: {
      beginner: {
        focus: 'Squats, bridges and lunges to build strong legs and a stable core.',
        duration: '25–30 min',
        main: [
          rx('bodyweight-squat', 3, '10–15', 60),
          rx('glute-bridge', 3, '12–15', 60),
          rx('reverse-lunge', 2, '8 each leg', 60, 'Hold a wall or chair for balance if you need to.'),
          rx('wall-sit', 2, '20–30 s', 60),
          rx('standing-calf-raise', 2, '15', 45),
          rx('dead-bug', 2, '6–8 each side', 45),
        ],
      },
      intermediate: {
        focus: 'One leg at a time, so your bodyweight is enough to make it hard.',
        duration: '35–40 min',
        main: [
          rx('bulgarian-split-squat', 3, '8–12 each leg', 75),
          rx('single-leg-rdl', 3, '8–10 each leg', 60),
          rx('step-up', 3, '10 each leg', 60),
          rx('single-leg-glute-bridge', 3, '10–12 each leg', 60),
          rx('standing-calf-raise', 3, '15–20', 45, 'Do them on one leg once 20 is easy.'),
          rx('side-plank', 2, '20–30 s each side', 45),
        ],
      },
      advanced: {
        focus: 'Pistol squat strength, loaded single-leg work and jumps for power.',
        duration: '40–45 min',
        main: [
          rx('assisted-pistol-squat', 4, '5–8 each leg', 90, 'Use as little help from your hands as you can.'),
          rx('bulgarian-split-squat', 3, '10–12 each leg', 75, 'Wear a heavy backpack.'),
          rx('single-leg-rdl', 3, '10 each leg', 60, 'Hold a backpack in the opposite hand.'),
          rx('skater-jump', 3, '8 each side', 60),
          rx('single-leg-glute-bridge', 3, '15 each leg', 45),
          rx('wall-sit', 2, '60 s', 60),
          rx('standing-calf-raise', 3, '15 each leg', 45),
        ],
      },
    },
    calisthenics: {
      beginner: {
        focus: 'Solid squat, lunge and bridge basics, plus the hollow hold for core control.',
        duration: '30 min',
        main: [
          rx('bodyweight-squat', 3, '12–15', 60),
          rx('reverse-lunge', 3, '8 each leg', 60),
          rx('glute-bridge', 3, '15', 60),
          rx('step-up', 2, '10 each leg', 60),
          rx('standing-calf-raise', 3, '15', 45),
          rx('hollow-hold', 3, '15–20 s', 45),
        ],
      },
      intermediate: {
        focus: 'Working toward the pistol squat, with jumps and hanging core work.',
        duration: '40–45 min',
        main: [
          rx('assisted-pistol-squat', 3, '5–8 each leg', 90),
          rx('bulgarian-split-squat', 3, '10 each leg', 75),
          rx('single-leg-rdl', 3, '8 each leg', 60),
          rx('squat-jump', 3, '6–8', 75, 'Land softly and reset between reps.'),
          rx('single-leg-glute-bridge', 3, '12 each leg', 45),
          rx('hanging-knee-raise', 3, '8–12', 60),
        ],
      },
      advanced: {
        focus: 'Pistol strength, power jumps and the L-sit.',
        duration: '50–55 min',
        main: [
          rx('assisted-pistol-squat', 4, '6–10 each leg', 120, 'Hold on with one finger, or go hands-free when you can.'),
          rx('skater-jump', 4, '6 each side', 75),
          rx('single-leg-rdl', 3, '10 each leg', 60),
          rx('step-up', 3, '12 each leg', 60, 'Use a high step, knee level or above.'),
          rx('standing-calf-raise', 4, '15 each leg', 45),
          rx('l-sit', 3, '10–20 s', 90),
        ],
      },
    },
  },
};
