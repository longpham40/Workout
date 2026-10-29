// Sample days for each goal. Each slot is [meal label, recipe id].
// The app scales every portion up or down so a day lands near your calorie target.

const MEAL_PLANS = {
  lose: [
    [['Breakfast', 'greek-yogurt-bowl'], ['Lunch', 'tuna-wrap'], ['Snack', 'greek-yogurt-honey'], ['Dinner', 'cod-traybake'], ['Evening snack', 'boiled-eggs']],
    [['Breakfast', 'veggie-omelette'], ['Lunch', 'lentil-soup'], ['Snack', 'cottage-cheese-pineapple'], ['Dinner', 'chicken-stir-fry']],
    [['Breakfast', 'smoked-salmon-bagel'], ['Lunch', 'greek-chicken-pitta'], ['Snack', 'protein-shake'], ['Dinner', 'turkey-meatballs']],
  ],
  maintain: [
    [['Breakfast', 'overnight-oats'], ['Lunch', 'chicken-quinoa-bowl'], ['Snack', 'apple-pb'], ['Dinner', 'salmon-potatoes'], ['Evening snack', 'hummus-veg']],
    [['Breakfast', 'protein-pancakes'], ['Lunch', 'turkey-hummus-sandwich'], ['Snack', 'edamame'], ['Dinner', 'beef-chilli'], ['Evening snack', 'boiled-eggs']],
    [['Breakfast', 'breakfast-burrito'], ['Lunch', 'salmon-rice-bowl'], ['Snack', 'apple-pb'], ['Dinner', 'tofu-curry'], ['Evening snack', 'cottage-cheese-pineapple']],
  ],
  gain: [
    [['Breakfast', 'pb-banana-toast'], ['Lunch', 'chicken-quinoa-bowl'], ['After training', 'mass-gainer-smoothie'], ['Dinner', 'steak-rice'], ['Evening snack', 'trail-mix']],
    [['Breakfast', 'overnight-oats'], ['Lunch', 'salmon-rice-bowl'], ['Before training', 'rice-cakes-pb'], ['After training', 'mass-gainer-smoothie'], ['Dinner', 'chicken-fajitas']],
    [['Breakfast', 'breakfast-burrito'], ['Lunch', 'chickpea-salad'], ['After training', 'mass-gainer-smoothie'], ['Dinner', 'beef-chilli'], ['Snack', 'trail-mix'], ['Evening snack', 'greek-yogurt-honey']],
  ],
};

// Tips from a sports nutrition point of view.
const NUTRITION_TIPS = {
  all: [
    'Spread your protein across 3–5 meals, about 20–40 g each. Your muscles use it better than one huge serving.',
    'Eat a meal with carbs and some protein 1–3 hours before training, and another within 2 hours after.',
    'Drink about 2–3 litres of water a day, more on training days and in hot weather.',
    'Aim for at least 5 portions of fruit and vegetables a day for vitamins, fibre and recovery.',
  ],
  lose: [
    'Fill half your plate with vegetables. They add volume, so you feel full for very few calories.',
    'Weigh yourself 2–3 mornings a week and track the weekly average. Daily weights jump around with water.',
    'Aim to lose 0.5–1% of your body weight a week. Faster than that usually means losing muscle too.',
    'Keep lifting weights while you diet. It tells your body to hold onto muscle.',
  ],
  maintain: [
    'If your weekly average weight drifts more than 1 kg (2 lb) either way, adjust by about 200 kcal a day.',
    'The 80/20 rule works: mostly whole foods, with room for the foods you enjoy.',
    'On hard training days, have a little more carbohydrate. On rest days, a little less.',
  ],
  gain: [
    'If your weight hasn’t gone up after 2 weeks, add about 200 kcal a day, such as a glass of milk and a banana.',
    'Eat every 3–4 hours. It’s easier to fit the food in than with three huge meals.',
    'Use calorie-dense extras: olive oil on veg, nuts, nut butter, whole milk, and smoothies.',
    'Aim for 0.25–0.5 kg (½–1 lb) a week. Faster gains are mostly fat.',
  ],
};
