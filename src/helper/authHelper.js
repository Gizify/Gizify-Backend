function calculateDailyNutritionTarget({ weight, height, birthdate, trimester, medical_history = [] }) {
  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();

  // Hitung BMR (Mifflin-St Jeor untuk wanita)
  let bmr = 10 * weight + 6.25 * height - 5 * age - 161;

  // Faktor aktivitas ringan untuk ibu hamil
  const activityFactor = 1.3;
  let tdee = bmr * activityFactor;

  // Tambahan kalori sesuai trimester
  let extraCalories = trimester === 1 ? 180 : trimester === 2 ? 300 : 450;
  let calories = tdee + extraCalories;

  // Protein needs (base + trimester adjustment)
  let baseProtein = 0.8 * weight;
  let extraProtein = trimester === 1 ? 1 : trimester === 2 ? 10 : 30;
  let protein = baseProtein + extraProtein;

  // Micronutrients dasar (AKG Ibu Hamil)
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
  let vitamin_a = 800;
  let vitamin_e = 15;
  let magnesium = 350; // update sesuai AKG RI
  let selenium = 65; // update sesuai AKG RI

  // Medical condition adjustments
  if (medical_history.includes("diabetes")) {
    sugar = 25;
    fiber += 5;
    calories *= 0.95; // sedikit kurangi kalori total
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
  }

  // Hitung ulang lemak & karbo setelah penyesuaian kalori
  let fat = (calories * 0.25) / 9;
  let carbs = (calories * 0.55) / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    fiber,
    sugar,
    sodium,
    folic_acid,
    calcium,
    vitamin_d,
    vitamin_b6,
    vitamin_b12,
    vitamin_c,
    zinc,
    iodium,
    water,
    iron,
    vitamin_a,
    vitamin_e,
    selenium,
    magnesium,
  };
}

module.exports = { calculateDailyNutritionTarget };
