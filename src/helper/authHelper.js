function calculateDailyNutritionTarget({ weight, height, birthdate, activity_level, gestational_age, medical_history = [] }) {
  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();
  let bmr = 10 * weight + 6.25 * height - 5 * age - 161;

  const activityFactorMap = {
    ringan: 1.375,
    sedang: 1.55,
    berat: 1.725,
  };
  const activityFactor = activityFactorMap[activity_level?.toLowerCase()] || 1.2;
  let calories = bmr * activityFactor;

  // Hitung trimester
  let trimester = 1;
  if (gestational_age >= 13 && gestational_age <= 27) {
    trimester = 2;
    calories += 300;
  } else if (gestational_age >= 28) {
    trimester = 3;
    calories += 450;
  } else {
    calories += 180;
  }

  // Protein
  let baseProtein = 0.8 * weight;
  let extraProtein = trimester === 1 ? 1 : trimester === 2 ? 10 : 30;
  let protein = baseProtein + extraProtein;

  // Makronutrien
  let fat = (calories * 0.25) / 9;
  let carbs = (calories * 0.55) / 4;

  // Mikronutrien dasar
  let fiber = 30;
  let sugar = 25;
  let sodium = 2300;
  let iron = 27;
  let folic_acid = 600;
  let vitamin_c = 85;
  let vitamin_b6 = 1.9;
  let vitamin_b12 = 2.6;
  let vitamin_d = 15;
  let calcium = 1000;
  let zinc = 11;
  let iodium = 220;
  let water = 3000;

  // Penyesuaian penyakit
  if (medical_history.includes("diabetes")) {
    carbs *= 0.8;
    sugar = 25;
    fiber += 5;
  }
  if (medical_history.includes("hipertensi")) {
    sodium = 1500;
  }
  if (medical_history.includes("anemia")) {
    iron += 10;
    vitamin_c += 20;
    vitamin_b12 += 0.5;
  }
  if (medical_history.includes("obesitas")) {
    calories *= 0.9;
    protein += 5;
    carbs *= 0.9;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    fiber,
    sugar,
    sodium,
    folic_acid,
    kalsium: calcium,
    vitamin_d,
    vitamin_b6,
    vitamin_b12,
    vitamin_c,
    zinc,
    iodium,
    water,
    iron,
  };
}

module.exports = { calculateDailyNutritionTarget };
