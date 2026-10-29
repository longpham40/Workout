'use strict';

// Calorie and protein targets. These are estimates, not medical advice.
const Nutrition = (() => {
  // Multipliers on resting energy use, including your workouts.
  const ACTIVITY = {
    sedentary: { label: 'Desk job, little or no exercise', factor: 1.2 },
    light: { label: 'Desk job plus 2–3 workouts a week', factor: 1.375 },
    moderate: { label: '3–5 workouts a week, or on your feet a lot', factor: 1.55 },
    very: { label: 'Hard training most days, or a physical job', factor: 1.725 },
  };

  const GOALS = {
    lose: {
      name: 'Lose weight',
      short: 'Lose',
      blurb: 'About 0.5 kg (1 lb) a week, with high protein to keep your muscle.',
      kcalChange: -450,
      proteinPerKg: 2.0,
    },
    maintain: {
      name: 'Maintain weight',
      short: 'Maintain',
      blurb: 'Hold your weight steady while you get fitter and stronger.',
      kcalChange: 0,
      proteinPerKg: 1.6,
    },
    gain: {
      name: 'Gain weight',
      short: 'Gain',
      blurb: 'Lean gain of about 0.25–0.5 kg (½–1 lb) a week, mostly muscle.',
      kcalChange: 400,
      proteinPerKg: 1.8,
    },
  };

  const roundTo = (n, step) => Math.round(n / step) * step;

  // Mifflin-St Jeor resting energy, times activity, plus the goal adjustment.
  function targets(profile) {
    const { sex, age, heightCm, weightKg } = profile;
    if (!sex || !age || !heightCm || !weightKg) return null;

    const sexAdjust = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
    const resting = 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjust;
    const maintenance = resting * (ACTIVITY[profile.activity] || ACTIVITY.light).factor;
    const goal = GOALS[profile.goal] || GOALS.maintain;
    const floor = sex === 'male' ? 1500 : 1200; // never suggest less than this

    return {
      kcal: Math.max(floor, roundTo(maintenance + goal.kcalChange, 50)),
      protein: roundTo(weightKg * goal.proteinPerKg, 5),
      maintenance: roundTo(maintenance, 50),
      goal,
    };
  }

  // Used for the meal plan until a profile is filled in.
  const EXAMPLE_TARGETS = {
    lose: { kcal: 1800, protein: 130 },
    maintain: { kcal: 2200, protein: 120 },
    gain: { kcal: 2800, protein: 140 },
  };

  return { ACTIVITY, GOALS, EXAMPLE_TARGETS, targets };
})();
