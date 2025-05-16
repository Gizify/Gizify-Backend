function calculateDailyNutritionTarget({ weight, height, birthdate, activity_level, gestational_age }) {
  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();

  let bmr = 10 * weight + 6.25 * height - 5 * age - 161;

  const activityFactorMap = {
    ringan: 1.375,
    sedang: 1.55,
    berat: 1.725,
  };
  const activityFactor = activityFactorMap[activity_level?.toLowerCase()] || 1.2;
  let calories = bmr * activityFactor;

  if (gestational_age >= 13 && gestational_age <= 27) {
    calories += 300; // Trimester 2
  } else if (gestational_age >= 28) {
    calories += 450; // Trimester 3
  } else {
    calories += 180; // Trimester 1
  }

  const protein = (calories * 0.2) / 4;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories * 0.55) / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein + 10),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    fiber: 30,
    sugar: 36,
    sodium: 2300,
    folic_acid: 600, // µg
    kalsium: 1000, // mg
    vitamin_d: 15, // µg
    vitamin_b16: 1.9, // mg
    vitamin_b12: 2.6, // µg
    vitamin_c: 85, // mg
    zinc: 11, // mg
    iodium: 220, // µg
    water: 3000, // mL
    iron: 27, // mg
  };
}

module.exports = { calculateDailyNutritionTarget };
