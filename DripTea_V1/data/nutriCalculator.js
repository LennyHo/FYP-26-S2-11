// The official Singapore HPB Nutri-Grade thresholds (Sugar per 100ml)
// Grade A: <= 1g
// Grade B: > 1g to <= 5g
// Grade C: > 5g to <= 10g
// Grade D: > 10g

function calculateNutriGrade(baseDrink, sugarLevelStr, toppingStr, menuDatabase) {
    // 1. Get the data from our JSON
    const volume = baseDrink.base_volume_ml; // e.g., 500ml
    const sugarMod = menuDatabase.modifiers.sugar_levels[sugarLevelStr];
    const toppingMod = menuDatabase.modifiers.toppings[toppingStr];

    // 2. Calculate Total Sugar
    const totalSugar = baseDrink.base_sugar_g + sugarMod.added_sugar_g + toppingMod.added_sugar_g;

    // 3. Find Sugar per 100ml (The HPB Formula)
    const sugarPer100ml = (totalSugar / volume) * 100;

    // 4. Determine the Grade
    let grade = "A";
    if (sugarPer100ml > 10) {
        grade = "D";
    } else if (sugarPer100ml > 5) {
        grade = "C";
    } else if (sugarPer100ml > 1) {
        grade = "B";
    }

    return {
        total_sugar: totalSugar,
        sugar_per_100ml: sugarPer100ml,
        nutri_grade: grade
    };
}

// Example: Classic Milk Tea (5g) + 100% Sugar (40g) + Pearls (15g) = 60g total sugar.
// 60g / 500ml = 12g per 100ml. 
// Result: Grade D! (This triggers your chatbot's health intervention)