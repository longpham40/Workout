// Training programs: 4 types × 3 levels.
//
// Each exercise line uses rx(exercise id, sets, reps or time, rest in seconds, optional note).
// Exercise ids match the names in data/exercises.js.
// For cardio, "sets" is the number of rounds, and the reps text describes each round.

const rx = (ex, sets, reps, rest, note) => ({ ex, sets, reps, rest, note });

const WARMUPS = {
  gym: [
    '5 min easy bike, rower or brisk walk',
    '10 slow bodyweight squats and 10 hip hinges',
    '10 arm circles each way, then 10 band pull-aparts or wall slides',
    '2–3 light sets of your first exercise, building up to your working weight',
  ],
  home: [
    '2 min marching on the spot or easy jumping jacks',
    '10 slow bodyweight squats',
    '10 arm circles each way',
    '8 cat-cow stretches on hands and knees',
    '5 inchworms: walk your hands out to a plank and back',
  ],
  cardio: [
    '5 min brisk walk or very easy pace',
    '10 leg swings each leg, front to back and side to side',
    '10 walking lunges and 10 calf raises',
    'Before hard sessions: 3–4 relaxed 15-second pick-ups to a faster pace',
  ],
  calisthenics: [
    '2 min jumping jacks or jogging on the spot',
    '10 arm circles each way and 10 wrist circles',
    '10 scapular push-ups: in a plank, move only your shoulder blades',
    '10 bodyweight squats',
    '20 s dead hang, or 10 band pull-aparts',
  ],
};

const COOLDOWNS = {
  common: [
    '3–5 min easy walking to bring your heart rate down',
    'Hold each stretch for 30 s and breathe slowly. Ease off if anything feels sharp.',
  ],
  gym: ['Kneeling hip flexor stretch', 'Lying hamstring stretch', 'Doorway chest stretch'],
  home: ['Child’s pose', 'Figure-4 glute stretch', 'Standing quad stretch'],
  cardio: ['Calf stretch against a wall, knee straight then bent', 'Standing quad stretch', 'Kneeling hip flexor stretch'],
  calisthenics: ['Doorway chest stretch', 'Lat stretch holding a bar or door frame', 'Wrist stretches, palms down then palms up'],
};

const PROGRAMS = {
  // ======================= GYM WEIGHTS =======================
  gym: {
    beginner: {
      summary: 'Three full-body sessions a week using dumbbells and machines. They’re easier to learn and safer than barbells while you build technique.',
      duration: '45–60 min',
      schedule: 'Train on 3 days with a rest day between, e.g. Mon, Wed, Fri.',
      effort: 'Finish every set feeling you could do 3 more good reps (about 6–7 out of 10). Form comes first. You should never grind out a rep.',
      progression: 'Start with a weight you can lift for the bottom of the rep range. Add a rep or two each session. When you reach the top of the range on every set with good form, add the smallest weight step (about 2.5 kg / 5 lb for legs, 1–2 kg / 2–5 lb for arms) and start again from the bottom of the range.',
      deload: 'Every 6th week, do 2 sets instead of 3 with the same weights. If you miss reps two sessions in a row, drop the weight by 10% and build back up.',
      days: [
        {
          name: 'Full body A',
          focus: 'Squat, push and pull basics',
          main: [
            rx('goblet-squat', 3, '8–12', 90),
            rx('dumbbell-bench-press', 3, '8–12', 90),
            rx('lat-pulldown', 3, '10–12', 75),
            rx('romanian-deadlift', 3, '10–12', 90, 'Use dumbbells while you learn the movement.'),
            rx('plank', 3, '20–40 s', 45),
          ],
        },
        {
          name: 'Full body B',
          focus: 'Legs, shoulders and back',
          main: [
            rx('leg-press', 3, '10–12', 90),
            rx('seated-dumbbell-press', 3, '8–12', 90),
            rx('seated-cable-row', 3, '10–12', 75),
            rx('hip-thrust', 3, '10–12', 75),
            rx('dead-bug', 3, '8 each side', 45),
          ],
        },
        {
          name: 'Full body C',
          focus: 'Single-leg work, upper chest and carries',
          main: [
            rx('walking-lunge', 3, '8 each leg', 75),
            rx('incline-dumbbell-press', 3, '8–12', 90),
            rx('one-arm-dumbbell-row', 3, '10 each arm', 60),
            rx('leg-curl', 3, '10–12', 60),
            rx('farmer-carry', 3, '30 m (about 30 steps)', 60),
          ],
        },
      ],
    },

    intermediate: {
      summary: 'An upper/lower split, four days a week. Barbell lifts for strength in the low-rep range, plus accessory work for muscle.',
      duration: '55–70 min',
      schedule: 'Upper, Lower, rest, Upper, Lower, rest, rest. For example Mon, Tue, Thu, Fri.',
      effort: 'Main barbell lifts: stop 2 reps short of failure (about 8 out of 10). Accessories: the last set can go to about 9 out of 10, with good form.',
      progression: 'Main lifts: when you hit every set and rep at the target, add 2.5 kg (5 lb) next session. Accessories: build reps to the top of the range, then add weight.',
      deload: 'Every 5th or 6th week, cut the number of sets roughly in half and drop the weights by 10%. Come back fresher and stronger.',
      days: [
        {
          name: 'Upper A',
          focus: 'Strength: bench press and rows',
          main: [
            rx('bench-press', 4, '5–6', 150),
            rx('barbell-row', 4, '6–8', 120),
            rx('seated-dumbbell-press', 3, '8–10', 90),
            rx('lat-pulldown', 3, '10–12', 75),
            rx('tricep-pushdown', 3, '10–15', 60),
            rx('dumbbell-curl', 3, '10–15', 60),
          ],
        },
        {
          name: 'Lower A',
          focus: 'Strength: squat',
          main: [
            rx('back-squat', 4, '5–6', 180),
            rx('romanian-deadlift', 3, '8–10', 120),
            rx('walking-lunge', 3, '10 each leg', 90),
            rx('leg-curl', 3, '10–12', 60),
            rx('standing-calf-raise', 3, '12–15', 60),
            rx('pallof-press', 3, '10 each side', 45),
          ],
        },
        {
          name: 'Upper B',
          focus: 'Volume: pull-ups and overhead press',
          main: [
            rx('pull-up', 4, '6–10', 120, 'Use the lat pulldown if you can’t do 6 pull-ups yet.'),
            rx('overhead-press', 3, '6–8', 120),
            rx('incline-dumbbell-press', 3, '8–10', 90),
            rx('seated-cable-row', 3, '10–12', 75),
            rx('lateral-raise', 3, '12–15', 45),
            rx('face-pull', 3, '15', 45),
          ],
        },
        {
          name: 'Lower B',
          focus: 'Strength: deadlift',
          main: [
            rx('deadlift', 3, '5', 180),
            rx('bulgarian-split-squat', 3, '8–10 each leg', 90),
            rx('hip-thrust', 3, '8–12', 90),
            rx('leg-press', 3, '12–15', 90),
            rx('standing-calf-raise', 3, '12–15', 60),
            rx('dead-bug', 3, '10 each side', 45),
          ],
        },
      ],
    },

    advanced: {
      summary: 'Push, Pull, Legs, Upper, Lower: five days a week, with heavy main lifts and plenty of muscle-building volume.',
      duration: '60–75 min',
      schedule: 'Push, Pull, Legs, rest, Upper, Lower, rest.',
      effort: 'Main lifts: work up to about 8–9 out of 10, leaving 1–2 reps in the tank. Accessories: 8–9 out of 10, last set can reach failure on safe machine or dumbbell moves.',
      progression: 'Run 4-week waves. Weeks 1–3: add a little weight or a rep each week. Week 4: test heavier sets of 3. Then deload and start the next wave a little heavier.',
      deload: 'Every 5th week: same exercises, half the sets, about 60% of your usual weights. Sleep and eat well that week.',
      days: [
        {
          name: 'Push',
          focus: 'Chest, shoulders and triceps',
          main: [
            rx('bench-press', 5, '3–5', 180),
            rx('overhead-press', 4, '6–8', 150),
            rx('incline-dumbbell-press', 3, '8–10', 90),
            rx('dip', 3, '8–12', 90),
            rx('lateral-raise', 4, '12–20', 45),
            rx('overhead-tricep-extension', 3, '10–15', 60),
          ],
        },
        {
          name: 'Pull',
          focus: 'Back, biceps and grip',
          main: [
            rx('deadlift', 4, '3–5', 180),
            rx('pull-up', 4, '6–10', 120, 'Add weight once you can do 4 × 10.'),
            rx('barbell-row', 4, '6–8', 120),
            rx('face-pull', 3, '15–20', 45),
            rx('dumbbell-curl', 3, '10–12', 60),
            rx('farmer-carry', 3, '40 m', 90),
          ],
        },
        {
          name: 'Legs',
          focus: 'Squat strength and hamstrings',
          main: [
            rx('back-squat', 5, '3–5', 180),
            rx('romanian-deadlift', 4, '6–8', 150),
            rx('bulgarian-split-squat', 3, '8 each leg', 90),
            rx('leg-curl', 3, '10–12', 60),
            rx('standing-calf-raise', 4, '10–15', 60),
            rx('pallof-press', 3, '12 each side', 45),
          ],
        },
        {
          name: 'Upper',
          focus: 'Muscle-building volume',
          main: [
            rx('dumbbell-bench-press', 4, '8–12', 90),
            rx('one-arm-dumbbell-row', 4, '8–12 each arm', 75),
            rx('seated-dumbbell-press', 3, '10–12', 90),
            rx('lat-pulldown', 3, '10–12', 75),
            rx('lateral-raise', 3, '15–20', 45),
            rx('tricep-pushdown', 3, '12–15', 45),
          ],
        },
        {
          name: 'Lower',
          focus: 'Glutes, quads and core',
          main: [
            rx('leg-press', 4, '10–15', 120),
            rx('hip-thrust', 4, '8–12', 90),
            rx('walking-lunge', 3, '12 each leg', 90),
            rx('leg-curl', 3, '12–15', 60),
            rx('standing-calf-raise', 3, '15–20', 45),
            rx('hanging-knee-raise', 3, '10–15', 60),
          ],
        },
      ],
    },
  },

  // ======================= HOME WORKOUTS =======================
  home: {
    beginner: {
      summary: 'Three short full-body sessions with no equipment. A filled backpack is all you need for pulling exercises.',
      duration: '25–35 min',
      schedule: 'Train on 3 days with a rest day between, e.g. Mon, Wed, Fri.',
      effort: 'Finish every set feeling you could do 3–4 more reps (about 6 out of 10). You should be able to talk between sets.',
      progression: 'Add 1–2 reps per set each week. When you reach the top of the range on every set, move on to the harder version shown on the exercise.',
      deload: 'Every 6th week, do 2 sets of everything instead of 3.',
      days: [
        {
          name: 'Full body 1',
          focus: 'Squat, push and pull',
          main: [
            rx('bodyweight-squat', 3, '10–15', 60),
            rx('incline-push-up', 3, '8–12', 60),
            rx('glute-bridge', 3, '12–15', 45),
            rx('backpack-row', 3, '10–12', 60),
            rx('dead-bug', 3, '6 each side', 45),
          ],
        },
        {
          name: 'Full body 2',
          focus: 'Balance, posture and core',
          main: [
            rx('step-up', 3, '8 each leg', 60),
            rx('incline-push-up', 3, '8–12', 60),
            rx('prone-ytw', 2, '5 of each letter', 45),
            rx('bird-dog', 3, '6 each side', 45),
            rx('side-plank', 2, '15–30 s each side', 45),
          ],
        },
        {
          name: 'Full body 3',
          focus: 'Strength and a short finisher',
          main: [
            rx('wall-sit', 3, '20–40 s', 60),
            rx('push-up', 3, '5–10', 75, 'Knees on the floor is fine.'),
            rx('single-leg-rdl', 3, '8 each leg', 60),
            rx('backpack-row', 3, '10–12', 60),
            rx('plank', 3, '20–30 s', 45),
            rx('jumping-jacks', 3, '30 s', 30),
          ],
        },
      ],
    },

    intermediate: {
      summary: 'Four days: upper body, lower body, a fat-burning circuit and a core and mobility session. Dumbbells or a band are optional.',
      duration: '35–45 min',
      schedule: 'Upper, Lower, rest, Circuit, Core, rest, rest.',
      effort: 'Strength days: stop 2 reps short of failure (about 8 out of 10). Circuit day: breathing hard, but able to keep your form.',
      progression: 'Add reps until you reach the top of the range, then make it harder: a heavier backpack, slower lowering, or the harder version.',
      deload: 'Every 6th week, do two-thirds of your usual sets and skip the circuit day.',
      days: [
        {
          name: 'Upper body',
          focus: 'Chest, shoulders and back',
          main: [
            rx('push-up', 4, '10–15', 60),
            rx('backpack-row', 4, '10–12', 60),
            rx('pike-push-up', 3, '6–10', 75),
            rx('prone-ytw', 3, '8 of each letter', 45),
            rx('close-grip-push-up', 3, '8–12', 60),
            rx('side-plank', 3, '30 s each side', 30),
          ],
        },
        {
          name: 'Lower body',
          focus: 'Legs and glutes, one side at a time',
          main: [
            rx('bulgarian-split-squat', 4, '8–12 each leg', 60),
            rx('single-leg-rdl', 3, '10 each leg', 60),
            rx('step-up', 3, '10 each leg', 60),
            rx('single-leg-glute-bridge', 3, '10–12 each leg', 45),
            rx('standing-calf-raise', 3, '15–20', 45),
            rx('wall-sit', 2, '45–60 s', 60),
          ],
        },
        {
          name: 'Circuit',
          focus: 'Conditioning and calorie burn',
          note: 'Circuit: do each exercise in turn with 15 s rest, then rest 90 s after the last one. That’s one round. Do 4 rounds.',
          main: [
            rx('squat-jump', 4, '10', 15),
            rx('push-up', 4, '8–10', 15),
            rx('mountain-climber', 4, '30 s', 15),
            rx('reverse-lunge', 4, '8 each leg', 15),
            rx('burpee', 4, '6–8', 15),
            rx('high-knees', 4, '30 s', 90),
          ],
        },
        {
          name: 'Core and mobility',
          focus: 'A stronger, more resilient back',
          main: [
            rx('dead-bug', 3, '10 each side', 45),
            rx('bird-dog', 3, '8 each side', 45),
            rx('side-plank', 3, '30–45 s each side', 30),
            rx('plank', 3, '45 s', 45),
            rx('glute-bridge', 2, '15', 45),
          ],
        },
      ],
    },

    advanced: {
      summary: 'Five days of hard bodyweight training: push, legs, pull and core, power circuits, and a full-body endurance session.',
      duration: '40–50 min',
      schedule: 'Push, Legs, Pull, rest, Circuit, Endurance, rest.',
      effort: 'Strength days: about 8–9 out of 10. Circuits: hard, but every rep stays clean.',
      progression: 'Slow the lowering to 3 seconds, add pauses, load your backpack, or move to the harder version. Change one thing at a time.',
      deload: 'Every 5th week, halve the sets and skip the circuit.',
      days: [
        {
          name: 'Push',
          focus: 'Chest, shoulders and triceps',
          main: [
            rx('archer-push-up', 4, '5–8 each side', 90),
            rx('pike-push-up', 4, '8–12', 90, 'Feet on a chair.'),
            rx('push-up', 3, '15–25', 60),
            rx('close-grip-push-up', 3, '12–15', 60),
            rx('plank', 3, '60 s', 45),
          ],
        },
        {
          name: 'Legs',
          focus: 'Single-leg strength',
          main: [
            rx('bulgarian-split-squat', 4, '12–15 each leg', 75, 'Hold a loaded backpack.'),
            rx('assisted-pistol-squat', 4, '5–8 each leg', 90),
            rx('single-leg-rdl', 4, '10–12 each leg', 60),
            rx('single-leg-glute-bridge', 3, '12–15 each leg', 45),
            rx('standing-calf-raise', 4, '15–20 each leg', 45),
            rx('wall-sit', 2, '60–90 s', 60),
          ],
        },
        {
          name: 'Pull and core',
          focus: 'Back, posture and abs',
          main: [
            rx('backpack-row', 5, '10–15', 60, 'Load the bag as heavy as you can safely manage.'),
            rx('prone-ytw', 3, '10 of each letter', 45),
            rx('hollow-hold', 4, '20–40 s', 45),
            rx('side-plank', 3, '45 s each side', 30),
            rx('dead-bug', 3, '10 each side', 45),
          ],
        },
        {
          name: 'Power circuit',
          focus: 'High-intensity conditioning',
          note: 'Circuit: do each exercise in turn with 15 s rest, then rest 60–90 s after the last one. Do 5 rounds.',
          main: [
            rx('burpee', 5, '10', 15),
            rx('squat-jump', 5, '12', 15),
            rx('mountain-climber', 5, '40 s', 15),
            rx('skater-jump', 5, '10 each side', 15),
            rx('high-knees', 5, '30 s', 75),
          ],
        },
        {
          name: 'Full-body endurance',
          focus: 'Higher reps and a steady heart rate',
          main: [
            rx('reverse-lunge', 3, '15 each leg', 45),
            rx('push-up', 3, '20', 45),
            rx('backpack-row', 3, '15', 45),
            rx('single-leg-glute-bridge', 3, '15 each leg', 30),
            rx('jumping-jacks', 3, '60 s', 30),
            rx('plank', 3, '60 s', 45),
          ],
        },
      ],
    },
  },

  // ======================= CARDIO =======================
  cardio: {
    beginner: {
      summary: 'Three gentle sessions that build your stamina from walking to running, with no-impact machine days.',
      duration: '20–35 min',
      schedule: 'Three days a week with a rest day between. Walking on rest days is a bonus.',
      effort: 'Use the talk test: on steady sessions you should be able to speak in full sentences. Jog parts can feel a bit harder, but never gasping.',
      progression: 'Add 5 minutes to steady sessions each week until you reach 40 minutes. On walk-run days, add 30 seconds to each jog every week until you can jog for 20 minutes without stopping.',
      deload: 'Every 4th week, cut your session times by a third.',
      days: [
        { name: 'Steady walk', focus: 'Build the habit', main: [rx('brisk-walk', 1, '20–30 min', 0)] },
        {
          name: 'Walk-run',
          focus: 'Your first steps into running',
          main: [rx('walk-run-intervals', 7, '1 min jog + 2 min walk', 0, 'Seven rounds is about 21 minutes.')],
        },
        { name: 'Machine day', focus: 'No-impact stamina', main: [rx('easy-cardio-machine', 1, '20–30 min', 0)] },
      ],
    },

    intermediate: {
      summary: 'Four sessions built on the 80/20 rule: three easy, one hard. It’s the most reliable way to get fitter without getting hurt.',
      duration: '30–60 min',
      schedule: 'Easy run, Intervals, rest, Cross-train, rest, Long run, rest.',
      effort: 'Easy days: full sentences. Intervals: about 8 out of 10, only a few words. If in doubt, go easier.',
      progression: 'Increase your total weekly time by no more than 10% a week. Add one interval every two weeks, up to 8.',
      deload: 'Every 4th week, cut your total time by about 30% and skip the intervals.',
      days: [
        { name: 'Easy run', focus: 'Aerobic base', main: [rx('easy-run', 1, '30–40 min', 0)] },
        {
          name: 'Intervals',
          focus: 'Speed and fitness',
          main: [rx('interval-run', 6, '2 min hard + 2 min easy jog', 0)],
        },
        {
          name: 'Cross-train',
          focus: 'Low-impact fitness',
          main: [
            rx('easy-cardio-machine', 1, '30–40 min', 120),
            rx('jump-rope', 5, '1 min', 60, 'Optional. Skip it if your calves are sore.'),
          ],
        },
        { name: 'Long run', focus: 'Endurance', main: [rx('long-run', 1, '45–60 min', 0)] },
      ],
    },

    advanced: {
      summary: 'Five sessions for experienced runners: two quality workouts, one long run and two easy days.',
      duration: '40–90 min',
      schedule: 'Easy + hills, Intervals, Easy cross-train, rest, Tempo, Long run, rest.',
      effort: 'About 80% of your weekly time should be easy. Intervals at 8–9 out of 10, tempo at 7 out of 10, hills close to all-out but short.',
      progression: 'Build for 3 weeks: add a rep to intervals, 5 min to tempo blocks, or 10 min to the long run. Never add all three in the same week.',
      deload: 'Every 4th week, cut volume by 30–40%, keep a few short fast bits, and skip the long run.',
      days: [
        {
          name: 'Easy run + hills',
          focus: 'Aerobic base and leg power',
          main: [
            rx('easy-run', 1, '40–50 min', 120),
            rx('hill-sprints', 8, '10 s', 90, 'Walk back down to recover.'),
          ],
        },
        {
          name: 'Intervals',
          focus: 'Top-end fitness',
          main: [rx('interval-run', 5, '3 min hard + 2 min easy jog', 0)],
        },
        { name: 'Easy cross-train', focus: 'Recovery and extra aerobic work', main: [rx('easy-cardio-machine', 1, '40–60 min', 0)] },
        {
          name: 'Tempo run',
          focus: 'Holding a strong pace',
          main: [rx('tempo-run', 2, '12–15 min', 180, 'Easy jog between blocks.')],
        },
        { name: 'Long run', focus: 'Endurance', main: [rx('long-run', 1, '70–90 min', 0)] },
      ],
    },
  },

  // ======================= CALISTHENICS =======================
  calisthenics: {
    beginner: {
      summary: 'Three full-body sessions that build the base for pull-ups, push-ups and dips, while strengthening joints and tendons.',
      duration: '30–40 min',
      schedule: 'Train on 3 days with a rest day between, e.g. Mon, Wed, Fri.',
      effort: 'Stop each set 2–3 reps short of failure. Slow, controlled reps build strength faster than rushed ones.',
      progression: 'Add reps each week. When you reach the top of the range on every set, move to the harder version (for example, from incline to floor push-ups).',
      deload: 'Every 6th week, do 2 sets of everything.',
      days: [
        {
          name: 'Full body 1',
          focus: 'Push, row and squat',
          main: [
            rx('incline-push-up', 3, '8–12', 75),
            rx('inverted-row', 3, '6–10', 90),
            rx('bodyweight-squat', 3, '12–15', 60),
            rx('dead-hang', 3, '15–30 s', 60),
            rx('hollow-hold', 3, '15–20 s', 45),
          ],
        },
        {
          name: 'Full body 2',
          focus: 'Building toward your first pull-up',
          main: [
            rx('negative-pull-up', 3, '3–5', 120),
            rx('push-up', 3, '5–10', 75, 'Knees on the floor is fine.'),
            rx('reverse-lunge', 3, '8 each leg', 60),
            rx('scapular-pull-up', 3, '6–8', 60),
            rx('plank', 3, '20–40 s', 45),
          ],
        },
        {
          name: 'Full body 3',
          focus: 'Volume and control',
          main: [
            rx('push-up', 3, '5–10', 75),
            rx('inverted-row', 3, '8–10', 90),
            rx('glute-bridge', 3, '15', 45),
            rx('bodyweight-squat', 3, '15', 60),
            rx('negative-pull-up', 2, '3–5', 120),
            rx('dead-bug', 3, '8 each side', 45),
          ],
        },
      ],
    },

    intermediate: {
      summary: 'Four days: push, pull, legs and a skills day where you start learning the handstand and L-sit.',
      duration: '40–55 min',
      schedule: 'Push, Pull, rest, Legs, Skills, rest, rest.',
      effort: 'Strength moves: stop 1–2 reps short of failure. Skills: practise fresh and stop when form slips. They aren’t meant to tire you out.',
      progression: 'Reach the top of the rep range on all sets, then move to a harder version: a slower lowering, a pause, or the next progression.',
      deload: 'Every 6th week, halve your sets and just practise skills.',
      days: [
        {
          name: 'Push',
          focus: 'Chest, shoulders and triceps',
          main: [
            rx('push-up', 4, '12–20', 60),
            rx('dip', 4, '6–10', 120),
            rx('pike-push-up', 3, '8–12', 90),
            rx('close-grip-push-up', 3, '8–12', 60),
            rx('hollow-hold', 3, '30 s', 45),
          ],
        },
        {
          name: 'Pull',
          focus: 'Back, biceps and grip',
          main: [
            rx('pull-up', 5, '4–8', 150),
            rx('inverted-row', 4, '10–12', 90),
            rx('hanging-knee-raise', 3, '8–12', 60),
            rx('scapular-pull-up', 3, '8–10', 60),
            rx('dead-hang', 2, '30–45 s', 60),
          ],
        },
        {
          name: 'Legs',
          focus: 'Single-leg strength and power',
          main: [
            rx('bulgarian-split-squat', 4, '10–12 each leg', 75),
            rx('assisted-pistol-squat', 3, '5–8 each leg', 90),
            rx('single-leg-rdl', 3, '10 each leg', 60),
            rx('squat-jump', 3, '8', 90),
            rx('standing-calf-raise', 3, '15–20 each leg', 45),
          ],
        },
        {
          name: 'Skills',
          focus: 'Handstand and L-sit',
          main: [
            rx('wall-handstand-hold', 5, '20–30 s', 90),
            rx('l-sit', 5, '10–15 s', 60, 'Tuck your knees until you can hold 15 s.'),
            rx('push-up', 3, '15–20', 60),
            rx('pull-up', 3, '5–8', 120),
            rx('side-plank', 3, '30 s each side', 30),
          ],
        },
      ],
    },

    advanced: {
      summary: 'Five days of serious bodyweight strength: explosive and tempo basics, one-arm progressions, handstands and L-sits.',
      duration: '50–70 min',
      schedule: 'Push, Pull, Legs, rest, Skills, Full-body endurance, rest.',
      effort: 'Strength sets: about 8–9 out of 10. Skills: quality only. End each set before your form breaks down.',
      progression: 'Bodyweight only. Once you hit the top of a rep range, make it harder: lower for 4 seconds, pause at the hardest point, or move to the next progression (archer, explosive or one-arm). Track your best hold times on skill days.',
      deload: 'Every 5th week, halve your sets, go back to easier versions, and keep skill practice light.',
      days: [
        {
          name: 'Push',
          focus: 'One-arm push strength and slow, deep dips',
          main: [
            rx('archer-push-up', 4, '5–8 each side', 120),
            rx('dip', 4, '8–12', 120, 'Once you can do 4 × 12, lower for 4 seconds and pause at the bottom.'),
            rx('pike-push-up', 4, '8–12', 120, 'Feet on a box or chair.'),
            rx('hollow-hold', 3, '45 s', 45),
          ],
        },
        {
          name: 'Pull',
          focus: 'Power and strict, slow pulling',
          main: [
            rx('explosive-pull-up', 5, '3–5', 180),
            rx('pull-up', 4, '8–12', 120, 'Once you can do 4 × 12, pause for 2 seconds with your chin over the bar.'),
            rx('inverted-row', 3, '12–15', 75, 'Feet up on a bench.'),
            rx('hanging-knee-raise', 3, '10–15', 60, 'Straight legs if you can.'),
          ],
        },
        {
          name: 'Legs',
          focus: 'Pistols and single-leg strength',
          main: [
            rx('assisted-pistol-squat', 4, '6–10 each leg', 90, 'Use as little help as you can, or none.'),
            rx('bulgarian-split-squat', 4, '12–15 each leg', 75),
            rx('single-leg-rdl', 4, '10–12 each leg', 60),
            rx('squat-jump', 4, '8', 90),
            rx('standing-calf-raise', 4, '20 each leg', 45),
          ],
        },
        {
          name: 'Skills',
          focus: 'Handstand and L-sit',
          main: [
            rx('wall-handstand-hold', 6, '30–45 s', 90),
            rx('l-sit', 6, '10–20 s', 60),
            rx('dead-hang', 3, '45–60 s', 60),
            rx('hollow-hold', 3, '45 s', 45),
          ],
        },
        {
          name: 'Full-body endurance',
          focus: 'High-rep circuit',
          note: 'Circuit: do each exercise in turn with as little rest as you need, then rest 2 min. Do 5 rounds.',
          main: [
            rx('push-up', 5, '20', 0),
            rx('pull-up', 5, '8', 0),
            rx('bodyweight-squat', 5, '25', 0),
            rx('dip', 5, '12', 0),
            rx('burpee', 5, '10', 120),
          ],
        },
      ],
    },
  },
};
