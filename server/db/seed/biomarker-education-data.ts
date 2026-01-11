/**
 * Biomarker Education Content
 *
 * Comprehensive educational content for all biomarkers to help users understand
 * their blood test results. This content is AI-generated based on medical literature.
 */

export const biomarkerEducationData = [
  // Complete Blood Count (CBC)
  {
    code: "WBC",
    description:
      "White blood cells (leukocytes) are the cells of your immune system that help fight infections and diseases. They circulate in your blood and tissues, protecting your body from foreign invaders like bacteria, viruses, and parasites.",
    whyItMatters:
      "WBC count is a crucial indicator of immune function and overall health. Abnormal levels can signal infections, immune disorders, bone marrow problems, or certain cancers. Monitoring WBC helps track your body's ability to defend itself.",
    ifLow:
      "Low WBC (leukopenia) may indicate bone marrow problems, autoimmune disorders, viral infections, or effects of certain medications. Symptoms can include frequent infections, fever, fatigue, and slow wound healing.",
    ifHigh:
      "High WBC (leukocytosis) often indicates infection, inflammation, stress, or allergic reactions. Persistent elevation may suggest leukemia or other blood disorders. Symptoms vary depending on the cause.",
    howToImprove:
      "Support immune health with adequate sleep (7-9 hours), stress management, regular moderate exercise, and a diet rich in zinc (oysters, beef, pumpkin seeds), vitamin C (citrus, bell peppers), and vitamin D. Avoid smoking and excessive alcohol.",
    relatedBiomarkerCodes: ["RBC", "PLT", "LYMPH"],
  },
  {
    code: "RBC",
    description:
      "Red blood cells (erythrocytes) are the most abundant cells in your blood. They contain hemoglobin, which carries oxygen from your lungs to all parts of your body and returns carbon dioxide to be exhaled.",
    whyItMatters:
      "RBC count reflects your blood's oxygen-carrying capacity. Low levels can lead to fatigue and weakness, while high levels may increase blood thickness and cardiovascular risk. It's essential for assessing overall health and diagnosing blood disorders.",
    ifLow:
      "Low RBC count (anemia) can cause fatigue, weakness, shortness of breath, pale skin, and dizziness. Common causes include iron deficiency, vitamin B12/folate deficiency, chronic disease, or blood loss.",
    ifHigh:
      "High RBC count (polycythemia) can make blood thicker, increasing risk of clots, stroke, and heart attack. Causes include dehydration, chronic hypoxia, bone marrow disorders, or living at high altitude.",
    howToImprove:
      "For low RBC: eat iron-rich foods (red meat, spinach, legumes), vitamin B12 (meat, fish, eggs), and folate (leafy greens). Stay hydrated. For high RBC: address underlying causes, stay hydrated, and consider blood donation if recommended by your doctor.",
    relatedBiomarkerCodes: ["HGB", "HCT", "MCV", "FE", "FERR", "VITB12"],
  },
  {
    code: "HGB",
    description:
      "Hemoglobin is an iron-containing protein in red blood cells responsible for binding oxygen in the lungs and releasing it to tissues throughout the body. It also gives blood its red color.",
    whyItMatters:
      "Hemoglobin levels directly determine your blood's oxygen-carrying capacity. Low hemoglobin leads to oxygen deprivation in tissues, causing fatigue and other symptoms. It's a key marker for anemia and overall health.",
    ifLow:
      "Low hemoglobin (anemia) causes fatigue, weakness, shortness of breath, pale skin, cold hands and feet, brittle nails, and headaches. Severe anemia can strain the heart.",
    ifHigh:
      "High hemoglobin can indicate dehydration, lung disease, heart disease, or polycythemia vera. It increases blood viscosity and clotting risk, potentially leading to stroke or heart problems.",
    howToImprove:
      "Optimize iron intake with heme iron sources (red meat, organ meats, seafood) and non-heme sources (beans, fortified cereals) paired with vitamin C. Ensure adequate B12 and folate. Avoid coffee/tea with iron-rich meals as they inhibit absorption.",
    relatedBiomarkerCodes: ["RBC", "HCT", "FE", "FERR", "VITB12", "FOLATE"],
  },
  {
    code: "HCT",
    description:
      "Hematocrit measures the percentage of your blood volume occupied by red blood cells. It indicates how thick or thin your blood is and reflects overall red blood cell status.",
    whyItMatters:
      "Hematocrit helps assess blood's oxygen-carrying ability and detect conditions like anemia or polycythemia. Abnormal levels affect blood flow and tissue oxygenation, impacting energy levels and organ function.",
    ifLow:
      "Low hematocrit suggests anemia, blood loss, bone marrow failure, or overhydration. Symptoms include fatigue, weakness, shortness of breath, and paleness.",
    ifHigh:
      "High hematocrit may indicate dehydration, lung disease, polycythemia vera, or doping with EPO. It increases blood viscosity and clotting risk.",
    howToImprove:
      "For low levels: address iron, B12, or folate deficiencies; treat underlying conditions. For high levels: stay well-hydrated, address underlying causes, and avoid smoking. Blood donation may help if levels are consistently high.",
    relatedBiomarkerCodes: ["RBC", "HGB", "MCV"],
  },
  {
    code: "MCV",
    description:
      "Mean Corpuscular Volume measures the average size of your red blood cells. Red blood cells that are too small or too large often indicate specific nutritional deficiencies or blood disorders.",
    whyItMatters:
      "MCV helps classify different types of anemia and guides diagnosis. Small cells (microcytic) suggest iron deficiency, while large cells (macrocytic) indicate B12 or folate deficiency. Normal-sized cells with anemia point to other causes.",
    ifLow:
      "Low MCV (microcytosis) typically indicates iron deficiency anemia or thalassemia trait. It may also occur with chronic disease or lead poisoning.",
    ifHigh:
      "High MCV (macrocytosis) usually suggests B12 or folate deficiency, liver disease, alcoholism, or certain medications. It can also indicate bone marrow disorders.",
    howToImprove:
      "For low MCV: increase iron intake through red meat, legumes, and fortified foods. For high MCV: ensure adequate B12 (animal products, supplements) and folate (leafy greens, fortified foods). Limit alcohol consumption.",
    relatedBiomarkerCodes: ["RBC", "HGB", "MCH", "FE", "VITB12", "FOLATE"],
  },
  {
    code: "MCH",
    description:
      "Mean Corpuscular Hemoglobin measures the average amount of hemoglobin inside each red blood cell. It reflects how much oxygen-carrying capacity each cell has.",
    whyItMatters:
      "MCH helps identify different types of anemia and guides treatment decisions. Low MCH often accompanies iron deficiency, while high MCH may indicate B12 or folate deficiency.",
    ifLow:
      "Low MCH (hypochromia) indicates less hemoglobin per cell, usually due to iron deficiency. Cells appear paler under microscope and carry less oxygen.",
    ifHigh:
      "High MCH typically accompanies macrocytic anemia from B12 or folate deficiency. The larger cells contain more hemoglobin but may function abnormally.",
    howToImprove:
      "Focus on the underlying cause: iron supplementation for low MCH, B12/folate for high MCH. A balanced diet with adequate micronutrients supports healthy red blood cell production.",
    relatedBiomarkerCodes: ["MCV", "MCHC", "HGB", "FE", "VITB12"],
  },
  {
    code: "MCHC",
    description:
      "Mean Corpuscular Hemoglobin Concentration measures the average concentration of hemoglobin in a given volume of red blood cells. It indicates how saturated red blood cells are with hemoglobin.",
    whyItMatters:
      "MCHC helps identify specific types of anemia. Low MCHC indicates cells with reduced hemoglobin concentration, while high MCHC can signal certain inherited conditions or lab error.",
    ifLow:
      "Low MCHC occurs in iron deficiency anemia and thalassemia. Red blood cells appear pale (hypochromic) and carry less oxygen efficiently.",
    ifHigh:
      "High MCHC is less common and may indicate hereditary spherocytosis, sickle cell disease, or sometimes lab artifacts from certain conditions.",
    howToImprove:
      "Address iron deficiency with dietary changes and supplements. Work with your healthcare provider to identify and treat underlying causes of abnormal hemoglobin concentration.",
    relatedBiomarkerCodes: ["MCH", "MCV", "HGB", "FE"],
  },
  {
    code: "PLT",
    description:
      "Platelets (thrombocytes) are small cell fragments that play a crucial role in blood clotting. They clump together at wound sites to stop bleeding and help repair damaged blood vessels.",
    whyItMatters:
      "Platelet count affects your blood's ability to clot. Too few platelets increase bleeding risk, while too many can cause dangerous clots. This marker is important for surgical planning and diagnosing blood disorders.",
    ifLow:
      "Low platelets (thrombocytopenia) increase bleeding and bruising risk. Causes include viral infections, autoimmune disorders, medications, liver disease, or bone marrow problems.",
    ifHigh:
      "High platelets (thrombocytosis) can increase clotting risk, potentially leading to stroke or heart attack. Causes include infection, inflammation, iron deficiency, or bone marrow disorders.",
    howToImprove:
      "Eat foods rich in vitamin K (leafy greens), vitamin B12, folate, and iron for healthy platelet production. Omega-3 fatty acids may help reduce excessive platelet aggregation. Avoid alcohol excess and consult your doctor about medication effects.",
    relatedBiomarkerCodes: ["WBC", "RBC", "FE"],
  },
  {
    code: "RDW",
    description:
      "Red Cell Distribution Width measures the variation in size among your red blood cells. Higher variation can indicate certain nutritional deficiencies or blood disorders.",
    whyItMatters:
      "RDW helps distinguish between different types of anemia. High RDW with normal MCV often suggests early nutritional deficiency. It's also an independent predictor of cardiovascular mortality and overall health.",
    ifLow:
      "Low RDW is generally normal and indicates uniform red blood cell size. Very low values are rare and typically not clinically significant.",
    ifHigh:
      "High RDW indicates variable cell sizes, often seen in iron, B12, or folate deficiency, mixed deficiencies, hemoglobinopathies, or after blood transfusions.",
    howToImprove:
      "Address nutritional deficiencies (iron, B12, folate) to allow bone marrow to produce uniform cells. Consistent nutrient intake helps maintain stable RDW over time.",
    relatedBiomarkerCodes: ["MCV", "FE", "VITB12", "FOLATE"],
  },
  {
    code: "LYMPH",
    description:
      "Lymphocyte percentage represents the proportion of white blood cells that are lymphocytes. Lymphocytes include T cells, B cells, and natural killer cells - key players in adaptive immunity.",
    whyItMatters:
      "Lymphocyte levels indicate immune system function and can help diagnose viral infections, immune deficiencies, and blood cancers. They're also used in calculating biological age through the PhenoAge algorithm.",
    ifLow:
      "Low lymphocytes (lymphopenia) may indicate HIV/AIDS, autoimmune disorders, bone marrow disorders, severe infections, or effects of immunosuppressive medications.",
    ifHigh:
      "High lymphocytes (lymphocytosis) often indicate viral infections, chronic bacterial infections, lymphoma, or chronic lymphocytic leukemia. Temporary elevation is common with acute infections.",
    howToImprove:
      "Support lymphocyte health with adequate sleep, stress management, zinc (oysters, beef), vitamin D (sunlight, supplements), and regular moderate exercise. Avoid chronic stress and ensure adequate protein intake.",
    relatedBiomarkerCodes: ["WBC"],
  },

  // Lipid Panel
  {
    code: "TC",
    description:
      "Total cholesterol measures the total amount of cholesterol in your blood, including LDL, HDL, and VLDL. Cholesterol is essential for cell membranes, hormone production, and vitamin D synthesis.",
    whyItMatters:
      "While cholesterol is necessary for health, elevated levels - especially LDL - increase cardiovascular disease risk. Total cholesterol provides a quick overview, but LDL and HDL ratios are more informative.",
    ifLow:
      "Very low cholesterol may indicate malnutrition, liver disease, hyperthyroidism, or certain genetic conditions. Extremely low levels are associated with increased mortality risk.",
    ifHigh:
      "High total cholesterol increases atherosclerosis risk, potentially leading to heart attack or stroke. However, context matters - high HDL is protective.",
    howToImprove:
      "Reduce saturated fats (red meat, full-fat dairy), eliminate trans fats, increase fiber (oats, beans), eat fatty fish, exercise regularly, maintain healthy weight, and don't smoke. Statins may be needed for genetic or severe elevation.",
    relatedBiomarkerCodes: ["LDL", "HDL", "TG", "VLDL"],
  },
  {
    code: "LDL",
    description:
      "LDL (Low-Density Lipoprotein) cholesterol carries cholesterol to cells throughout your body. When elevated, it can deposit in artery walls, forming plaques that narrow blood vessels.",
    whyItMatters:
      "LDL is the primary driver of atherosclerosis and cardiovascular disease. Lowering elevated LDL significantly reduces heart attack and stroke risk. It's often called 'bad cholesterol' though it has essential functions.",
    ifLow:
      "Very low LDL is generally not problematic and may be protective. However, extremely low levels (from genetic conditions) may affect hormone production.",
    ifHigh:
      "High LDL accelerates plaque buildup in arteries, increasing heart attack, stroke, and peripheral artery disease risk. Risk is cumulative over time.",
    howToImprove:
      "Reduce saturated fat intake (limit red meat, full-fat dairy), increase soluble fiber (oats, beans, apples), eat plant sterols (fortified foods), exercise 150+ minutes weekly, lose excess weight. Mediterranean diet is particularly effective.",
    relatedBiomarkerCodes: ["TC", "HDL", "TG", "HSCRP"],
  },
  {
    code: "HDL",
    description:
      "HDL (High-Density Lipoprotein) cholesterol removes excess cholesterol from arteries and transports it back to the liver for processing. This 'reverse cholesterol transport' is protective.",
    whyItMatters:
      "HDL is protective against cardiovascular disease - higher levels are associated with lower heart disease risk. However, extremely high HDL (above 100 mg/dL) may not provide additional benefit.",
    ifLow:
      "Low HDL increases cardiovascular risk even if LDL is normal. It's associated with metabolic syndrome, diabetes, smoking, sedentary lifestyle, and genetic factors.",
    ifHigh:
      "High HDL is generally protective. However, very high levels (genetic causes) may paradoxically not be protective and could indicate other conditions.",
    howToImprove:
      "Exercise aerobically (most effective way to raise HDL), quit smoking, lose excess weight, limit refined carbohydrates, eat healthy fats (olive oil, nuts, fatty fish), moderate alcohol consumption may help but isn't recommended to start.",
    relatedBiomarkerCodes: ["TC", "LDL", "TG"],
  },
  {
    code: "TG",
    description:
      "Triglycerides are fats stored in fat cells and circulating in blood. They come from food and are also made by your liver. After eating, excess calories are converted to triglycerides.",
    whyItMatters:
      "High triglycerides contribute to atherosclerosis and increase cardiovascular risk, especially when combined with high LDL or low HDL. Very high levels risk pancreatitis.",
    ifLow:
      "Low triglycerides generally indicate healthy metabolism and are not concerning. Very low levels may occur with malnutrition or hyperthyroidism.",
    ifHigh:
      "High triglycerides increase cardiovascular disease risk and, above 500 mg/dL, risk of pancreatitis. Often associated with metabolic syndrome, diabetes, obesity, and excess alcohol/sugar.",
    howToImprove:
      "Limit sugar and refined carbohydrates (strongest effect), reduce alcohol, eat fatty fish (omega-3s), exercise regularly, lose excess weight, avoid trans fats, manage diabetes. Fasting levels are most accurate.",
    relatedBiomarkerCodes: ["TC", "LDL", "HDL", "VLDL", "GLU", "HBA1C"],
  },
  {
    code: "VLDL",
    description:
      "VLDL (Very Low-Density Lipoprotein) is produced by the liver and carries triglycerides to tissues. As it delivers triglycerides, VLDL transforms into LDL.",
    whyItMatters:
      "VLDL contributes to atherosclerosis similar to LDL. High levels often indicate metabolic issues and correlate with elevated triglycerides and cardiovascular risk.",
    ifLow:
      "Low VLDL is generally favorable and indicates efficient lipid metabolism. Not typically a concern.",
    ifHigh:
      "High VLDL suggests elevated triglycerides and increased cardiovascular risk. Often associated with obesity, diabetes, and metabolic syndrome.",
    howToImprove:
      "Lower triglycerides through diet (reduce sugar, refined carbs, alcohol), exercise, weight loss, and omega-3 fatty acids. Addressing insulin resistance helps reduce VLDL production.",
    relatedBiomarkerCodes: ["TG", "LDL", "TC"],
  },

  // Metabolic Panel
  {
    code: "GLU",
    description:
      "Glucose is your body's primary energy source. Blood glucose levels reflect how well your body regulates sugar through insulin and other hormones. Fasting glucose is measured after 8+ hours without food.",
    whyItMatters:
      "Glucose levels screen for diabetes and prediabetes - major risk factors for heart disease, kidney disease, neuropathy, and vision loss. Early detection allows lifestyle intervention.",
    ifLow:
      "Low glucose (hypoglycemia) causes shakiness, sweating, confusion, irritability, and in severe cases, loss of consciousness. Common causes include diabetes medication, excessive alcohol, or rarely, tumors.",
    ifHigh:
      "High glucose (hyperglycemia) indicates diabetes or prediabetes. Chronic elevation damages blood vessels, nerves, kidneys, and eyes. Symptoms include increased thirst, urination, and fatigue.",
    howToImprove:
      "Exercise regularly (improves insulin sensitivity), maintain healthy weight, choose low glycemic index foods, eat fiber with meals, limit refined carbohydrates and sugar, manage stress, ensure adequate sleep.",
    relatedBiomarkerCodes: ["HBA1C", "FINS", "TG"],
  },
  {
    code: "BUN",
    description:
      "Blood Urea Nitrogen measures the amount of nitrogen in blood from urea, a waste product of protein metabolism. The liver produces urea, and kidneys filter it out.",
    whyItMatters:
      "BUN is a key indicator of kidney function and hydration status. Elevated levels may indicate kidney disease, dehydration, or high protein intake. Very low levels may suggest liver problems.",
    ifLow:
      "Low BUN may indicate liver disease (reduced urea production), malnutrition, overhydration, or low-protein diet. Not typically a concern by itself.",
    ifHigh:
      "High BUN suggests kidney dysfunction, dehydration, high protein diet, GI bleeding, heart failure, or certain medications. The BUN/creatinine ratio helps distinguish causes.",
    howToImprove:
      "Stay well hydrated, maintain appropriate protein intake, manage blood pressure and diabetes (kidney disease risk factors), avoid nephrotoxic medications when possible, regular exercise.",
    relatedBiomarkerCodes: ["CREAT", "EGFR", "NA", "K"],
  },
  {
    code: "CREAT",
    description:
      "Creatinine is a waste product from normal muscle metabolism. Your kidneys filter creatinine from blood into urine at a fairly constant rate, making it useful for assessing kidney function.",
    whyItMatters:
      "Creatinine is the gold standard for estimating kidney function. Rising levels indicate declining kidney function. It's used to calculate eGFR and dose medications appropriately.",
    ifLow:
      "Low creatinine may occur with reduced muscle mass, malnutrition, or liver disease. Athletes and those with higher muscle mass naturally have higher creatinine.",
    ifHigh:
      "High creatinine indicates reduced kidney function, dehydration, or increased muscle breakdown. Acute elevation may signal kidney injury requiring immediate attention.",
    howToImprove:
      "Protect kidneys by controlling blood pressure and blood sugar, staying hydrated, avoiding excessive NSAIDs, limiting protein if kidney function is compromised, not smoking, and maintaining healthy weight.",
    relatedBiomarkerCodes: ["BUN", "EGFR", "K", "NA"],
  },
  {
    code: "EGFR",
    description:
      "Estimated Glomerular Filtration Rate calculates how well your kidneys filter blood based on creatinine, age, sex, and race. It's the best overall measure of kidney function.",
    whyItMatters:
      "eGFR stages chronic kidney disease and guides treatment decisions. Early detection of kidney decline allows intervention to slow progression and prevent complications.",
    ifLow:
      "Low eGFR indicates reduced kidney function. Below 60 for 3+ months defines chronic kidney disease. Below 15 indicates kidney failure potentially requiring dialysis.",
    ifHigh:
      "High eGFR is generally normal, though very high values may occur early in diabetes (hyperfiltration phase) before eventual decline.",
    howToImprove:
      "Control blood pressure (target <130/80 for CKD), manage diabetes tightly, limit salt intake, maintain healthy weight, avoid nephrotoxic medications, don't smoke, stay well hydrated but avoid overhydration.",
    relatedBiomarkerCodes: ["CREAT", "BUN", "K", "NA"],
  },
  {
    code: "NA",
    description:
      "Sodium is the primary electrolyte outside cells, essential for fluid balance, nerve function, and muscle contraction. It's tightly regulated by kidneys and hormones.",
    whyItMatters:
      "Sodium levels reflect fluid balance and kidney/hormonal function. Abnormal levels cause significant symptoms and can be life-threatening if severe.",
    ifLow:
      "Low sodium (hyponatremia) causes confusion, nausea, headache, and in severe cases, seizures or coma. Causes include heart failure, kidney disease, SIADH, excessive water intake, or certain medications.",
    ifHigh:
      "High sodium (hypernatremia) indicates dehydration or excess salt. Causes thirst, confusion, muscle twitching, and in severe cases, seizures. Often occurs in elderly who don't sense thirst.",
    howToImprove:
      "Maintain adequate but not excessive hydration. Limit processed foods high in sodium. Work with healthcare provider if levels are abnormal - treatment depends on cause. Don't restrict sodium without medical guidance.",
    relatedBiomarkerCodes: ["K", "CL", "CO2", "CREAT"],
  },
  {
    code: "K",
    description:
      "Potassium is the main electrolyte inside cells, crucial for heart rhythm, muscle function, and nerve signaling. Kidneys regulate potassium balance.",
    whyItMatters:
      "Potassium is critical for heart function. Both high and low levels can cause dangerous heart arrhythmias. Many medications affect potassium levels.",
    ifLow:
      "Low potassium (hypokalemia) causes weakness, muscle cramps, constipation, and heart arrhythmias. Common causes include diuretics, vomiting, diarrhea, and low dietary intake.",
    ifHigh:
      "High potassium (hyperkalemia) can cause life-threatening heart arrhythmias. Causes include kidney disease, certain medications (ACE inhibitors, potassium-sparing diuretics), and cell damage.",
    howToImprove:
      "Eat potassium-rich foods (bananas, potatoes, spinach, beans) if levels are low. If high, limit high-potassium foods and work with your doctor on medications. Never take potassium supplements without medical supervision.",
    relatedBiomarkerCodes: ["NA", "CREAT", "EGFR", "MG"],
  },
  {
    code: "CL",
    description:
      "Chloride is an electrolyte that works with sodium and bicarbonate to maintain fluid balance and acid-base status. It's found mainly in fluid outside cells.",
    whyItMatters:
      "Chloride helps maintain proper blood volume, blood pressure, and pH. Abnormalities often parallel sodium changes and indicate fluid or acid-base disorders.",
    ifLow:
      "Low chloride (hypochloremia) often accompanies metabolic alkalosis, prolonged vomiting, or SIADH. Usually correlates with sodium levels.",
    ifHigh:
      "High chloride (hyperchloremia) may indicate dehydration, kidney disease, or metabolic acidosis. Often seen with hypernatremia.",
    howToImprove:
      "Treatment focuses on underlying cause - hydration for dehydration, managing kidney or acid-base disorders. Salt intake affects chloride levels since table salt is sodium chloride.",
    relatedBiomarkerCodes: ["NA", "CO2", "K"],
  },
  {
    code: "CO2",
    description:
      "Blood CO2 (carbon dioxide/bicarbonate) reflects acid-base balance in your body. It's regulated by lungs (CO2 excretion) and kidneys (bicarbonate retention).",
    whyItMatters:
      "CO2 levels indicate metabolic and respiratory acid-base status. Abnormalities can signal lung disease, kidney problems, diabetes, or other metabolic conditions.",
    ifLow:
      "Low CO2 (metabolic acidosis) may indicate kidney disease, uncontrolled diabetes, diarrhea, or aspirin toxicity. Also occurs with hyperventilation (respiratory compensation).",
    ifHigh:
      "High CO2 (metabolic alkalosis) may result from prolonged vomiting, diuretic use, or antacid overuse. Also seen in lung disease with CO2 retention.",
    howToImprove:
      "Treatment depends on cause. Manage underlying conditions (diabetes, kidney disease). Proper breathing techniques help if hyperventilation is a factor. Work with healthcare provider for specific interventions.",
    relatedBiomarkerCodes: ["NA", "K", "CL", "CREAT"],
  },
  {
    code: "CA",
    description:
      "Calcium is essential for bone health, muscle contraction, nerve function, and blood clotting. About 99% is in bones, with the remainder in blood carefully regulated by parathyroid hormone and vitamin D.",
    whyItMatters:
      "Calcium abnormalities affect heart rhythm, muscle function, and bones. Chronic imbalance leads to osteoporosis (low calcium) or kidney stones (high calcium).",
    ifLow:
      "Low calcium (hypocalcemia) causes muscle cramps, numbness, tingling, and in severe cases, seizures. Causes include vitamin D deficiency, parathyroid problems, kidney disease, or malabsorption.",
    ifHigh:
      "High calcium (hypercalcemia) causes fatigue, confusion, constipation, kidney stones, and bone pain. Common causes include hyperparathyroidism and cancer.",
    howToImprove:
      "Get adequate vitamin D (sunlight, supplements), consume calcium-rich foods (dairy, fortified foods, leafy greens), ensure adequate magnesium. For high calcium, hydration and treating underlying cause is key.",
    relatedBiomarkerCodes: ["VITD", "ALP", "MG"],
  },
  {
    code: "TP",
    description:
      "Total protein measures all protein in blood, primarily albumin and globulins. Proteins transport substances, fight infection, and maintain fluid balance.",
    whyItMatters:
      "Total protein reflects nutritional status, liver function (protein production), and immune function. Abnormalities help diagnose liver disease, kidney disease, and immune disorders.",
    ifLow:
      "Low total protein may indicate malnutrition, liver disease (decreased production), kidney disease (protein loss), or malabsorption conditions.",
    ifHigh:
      "High total protein may suggest dehydration, chronic inflammation, infections, or multiple myeloma. Further testing identifies which protein type is elevated.",
    howToImprove:
      "Ensure adequate protein intake (0.8-1g/kg body weight for most adults, more for athletes), treat underlying conditions affecting protein levels, stay hydrated, and address liver or kidney disease.",
    relatedBiomarkerCodes: ["ALB", "CREAT", "AST", "ALT"],
  },
  {
    code: "ALB",
    description:
      "Albumin is the most abundant protein in blood, made by the liver. It maintains fluid balance, transports hormones and medications, and reflects nutritional status.",
    whyItMatters:
      "Albumin is a key indicator of liver function, nutritional status, and overall health. Low levels are associated with poor outcomes in many conditions and increased mortality risk.",
    ifLow:
      "Low albumin indicates liver disease, malnutrition, inflammation, kidney disease (nephrotic syndrome), or protein-losing conditions. It causes edema and impairs wound healing.",
    ifHigh:
      "High albumin usually indicates dehydration rather than true excess. Corrects with proper hydration.",
    howToImprove:
      "Ensure adequate protein intake, treat liver and kidney disease, manage inflammation, and stay well-nourished. In critical illness, treating the underlying condition is most important.",
    relatedBiomarkerCodes: ["TP", "CREAT", "AST", "ALT", "CRP"],
  },
  {
    code: "BILI",
    description:
      "Bilirubin is a yellow compound produced when red blood cells break down. The liver processes bilirubin for excretion in bile. High levels cause jaundice (yellow skin/eyes).",
    whyItMatters:
      "Bilirubin elevation indicates liver disease, bile duct obstruction, or excessive red blood cell breakdown. It helps diagnose hepatitis, gallstones, and hemolytic conditions.",
    ifLow:
      "Low bilirubin is generally not clinically significant. Some research suggests mild elevation may be protective due to antioxidant properties.",
    ifHigh:
      "High bilirubin causes jaundice. Causes include liver disease (hepatitis, cirrhosis), bile duct obstruction (gallstones, cancer), or hemolysis (sickle cell, autoimmune).",
    howToImprove:
      "Avoid excessive alcohol, maintain healthy weight to prevent fatty liver, get vaccinated against hepatitis, treat underlying liver conditions, ensure adequate hydration.",
    relatedBiomarkerCodes: ["AST", "ALT", "ALP", "ALB"],
  },
  {
    code: "ALP",
    description:
      "Alkaline Phosphatase is an enzyme found in liver, bone, intestine, and placenta. Elevated levels can indicate liver or bone disease.",
    whyItMatters:
      "ALP helps distinguish between liver and bone problems when elevated. It's also used to monitor bone disorders and detect bile duct obstruction.",
    ifLow:
      "Low ALP is rare and may indicate malnutrition, zinc deficiency, hypothyroidism, or certain rare genetic conditions (hypophosphatasia).",
    ifHigh:
      "High ALP indicates liver disease (especially bile duct obstruction), bone disease (fractures, Paget's disease), or growth (normal in children). Pregnancy also raises ALP.",
    howToImprove:
      "Treatment depends on cause. For bone health: adequate vitamin D, calcium, and weight-bearing exercise. For liver health: limit alcohol, maintain healthy weight, avoid hepatotoxins.",
    relatedBiomarkerCodes: ["AST", "ALT", "BILI", "CA", "VITD"],
  },
  {
    code: "AST",
    description:
      "Aspartate Aminotransferase (AST) is an enzyme found in liver, heart, muscle, and other tissues. It's released into blood when these tissues are damaged.",
    whyItMatters:
      "AST helps detect liver damage but is less specific than ALT since it's found in multiple tissues. The AST/ALT ratio helps distinguish alcoholic from non-alcoholic liver disease.",
    ifLow:
      "Low AST is generally normal and not clinically significant.",
    ifHigh:
      "High AST indicates tissue damage, commonly from liver disease, heart attack, muscle injury, or certain medications. Very high levels suggest acute hepatitis or ischemia.",
    howToImprove:
      "Protect liver with limited alcohol, healthy weight (prevent fatty liver), avoid unnecessary medications, hepatitis vaccination, and don't share needles. For heart: exercise, healthy diet, don't smoke.",
    relatedBiomarkerCodes: ["ALT", "ALP", "BILI", "ALB"],
  },
  {
    code: "ALT",
    description:
      "Alanine Aminotransferase (ALT) is an enzyme primarily found in the liver. It's the most specific marker for liver cell damage.",
    whyItMatters:
      "ALT elevation specifically indicates liver cell damage. It's used to screen for hepatitis, monitor liver disease, and detect medication-induced liver injury.",
    ifLow:
      "Low ALT is generally normal, though very low levels may be associated with frailty in elderly populations.",
    ifHigh:
      "High ALT indicates liver cell damage from hepatitis (viral, alcoholic, or fatty liver disease), medications, autoimmune conditions, or other liver diseases.",
    howToImprove:
      "Limit alcohol to 1-2 drinks/day maximum, maintain healthy weight (fatty liver is common cause), exercise regularly, avoid unnecessary acetaminophen and hepatotoxic medications, get hepatitis screening/vaccination.",
    relatedBiomarkerCodes: ["AST", "ALP", "BILI", "ALB", "TG"],
  },

  // Thyroid Panel
  {
    code: "TSH",
    description:
      "Thyroid Stimulating Hormone (TSH) is produced by the pituitary gland to regulate thyroid hormone production. It's the most sensitive marker of thyroid function.",
    whyItMatters:
      "TSH is the best screening test for thyroid disorders. Hypothyroidism (high TSH) affects metabolism, energy, and mood. Hyperthyroidism (low TSH) causes anxiety, weight loss, and heart problems.",
    ifLow:
      "Low TSH suggests hyperthyroidism (overactive thyroid) or excessive thyroid medication. The pituitary reduces TSH when thyroid hormone levels are high.",
    ifHigh:
      "High TSH indicates hypothyroidism (underactive thyroid). The pituitary increases TSH trying to stimulate an underperforming thyroid.",
    howToImprove:
      "Ensure adequate iodine (iodized salt, seaweed, dairy) and selenium (Brazil nuts, fish). Limit goitrogens if iodine-deficient (raw cruciferous vegetables). Medication is needed for significant dysfunction.",
    relatedBiomarkerCodes: ["T4", "T3"],
  },
  {
    code: "T4",
    description:
      "Thyroxine (T4) is the main hormone produced by the thyroid gland. It circulates in blood and converts to T3, the more active form, in tissues.",
    whyItMatters:
      "T4 levels confirm and clarify thyroid status suggested by TSH. Low T4 with high TSH confirms hypothyroidism; high T4 with low TSH confirms hyperthyroidism.",
    ifLow:
      "Low T4 indicates hypothyroidism - metabolism slows causing fatigue, weight gain, cold intolerance, dry skin, constipation, and depression.",
    ifHigh:
      "High T4 indicates hyperthyroidism - metabolism increases causing weight loss, rapid heart rate, anxiety, tremors, heat intolerance, and diarrhea.",
    howToImprove:
      "Thyroid conditions typically require medication. Support thyroid with adequate iodine, selenium, and zinc. Limit soy in excess if hypothyroid. Regular monitoring and medication adjustment as needed.",
    relatedBiomarkerCodes: ["TSH", "T3"],
  },
  {
    code: "T3",
    description:
      "Triiodothyronine (T3) is the active thyroid hormone that affects metabolism in every cell. Most T3 is produced by converting T4 in peripheral tissues.",
    whyItMatters:
      "T3 is the metabolically active thyroid hormone. Measuring T3 helps evaluate hyperthyroidism and T4-to-T3 conversion issues that may occur despite normal T4.",
    ifLow:
      "Low T3 occurs in hypothyroidism, during illness (sick euthyroid syndrome), or with poor T4-to-T3 conversion. Selenium deficiency impairs conversion.",
    ifHigh:
      "High T3 indicates hyperthyroidism, sometimes even before T4 rises (T3 toxicosis). Causes symptoms of excess metabolism.",
    howToImprove:
      "Support conversion with adequate selenium, zinc, and iron. Manage stress (cortisol impairs conversion). Treat underlying thyroid conditions with appropriate medication.",
    relatedBiomarkerCodes: ["TSH", "T4"],
  },

  // Iron Studies
  {
    code: "FE",
    description:
      "Serum iron measures the amount of iron circulating in your blood, bound to transferrin protein. Iron is essential for hemoglobin production and oxygen transport.",
    whyItMatters:
      "Iron levels help diagnose iron deficiency and overload. However, serum iron fluctuates daily and with meals, so ferritin and TIBC provide more complete pictures.",
    ifLow:
      "Low serum iron indicates iron deficiency from inadequate intake, poor absorption, or blood loss. It contributes to anemia, fatigue, and impaired immunity.",
    ifHigh:
      "High serum iron may indicate hemochromatosis (iron overload), excessive supplementation, or recent iron transfusion. Can damage liver, heart, and pancreas.",
    howToImprove:
      "For deficiency: eat iron-rich foods (red meat, organ meats, legumes, fortified cereals), pair with vitamin C, avoid tea/coffee with meals. For overload: avoid iron supplements, donate blood, limit vitamin C with meals.",
    relatedBiomarkerCodes: ["FERR", "TIBC", "TSAT", "HGB", "RBC"],
  },
  {
    code: "FERR",
    description:
      "Ferritin is the primary iron storage protein. Blood ferritin reflects total body iron stores and is the most sensitive and specific test for iron deficiency.",
    whyItMatters:
      "Ferritin detects iron deficiency before anemia develops and identifies iron overload. It's also an inflammatory marker and can be elevated in infection or chronic disease.",
    ifLow:
      "Low ferritin indicates depleted iron stores, even before anemia appears. Common causes include inadequate intake, malabsorption, menstruation, and chronic blood loss.",
    ifHigh:
      "High ferritin may indicate hemochromatosis, liver disease, chronic inflammation, infection, or certain cancers. Context with other iron markers is important.",
    howToImprove:
      "For low ferritin: iron supplementation (ferrous sulfate most common), iron-rich foods, enhance absorption with vitamin C. For high ferritin: investigate cause - may need phlebotomy for hemochromatosis.",
    relatedBiomarkerCodes: ["FE", "TIBC", "TSAT", "CRP", "HGB"],
  },
  {
    code: "TIBC",
    description:
      "Total Iron Binding Capacity measures how much transferrin is available to bind iron. It indirectly measures transferrin, the main iron transport protein.",
    whyItMatters:
      "TIBC helps distinguish between types of anemia. High TIBC with low iron suggests iron deficiency, while low TIBC may indicate chronic disease or iron overload.",
    ifLow:
      "Low TIBC suggests iron overload (hemochromatosis), chronic disease, liver disease, or malnutrition. Less transferrin is made when iron is abundant.",
    ifHigh:
      "High TIBC indicates iron deficiency - the body makes more transferrin trying to capture more iron. Common in iron deficiency anemia.",
    howToImprove:
      "For high TIBC (iron deficiency): iron supplementation and dietary changes. For low TIBC: treat underlying condition (infection, inflammation, liver disease).",
    relatedBiomarkerCodes: ["FE", "FERR", "TSAT"],
  },
  {
    code: "TSAT",
    description:
      "Transferrin Saturation indicates what percentage of iron-binding sites on transferrin are occupied by iron. It's calculated from serum iron and TIBC.",
    whyItMatters:
      "TSAT helps diagnose iron deficiency and overload. Low TSAT confirms iron deficiency, while high TSAT suggests iron overload requiring further evaluation.",
    ifLow:
      "Low TSAT (<20%) indicates iron deficiency - transferrin has empty binding sites. This typically precedes anemia development.",
    ifHigh:
      "High TSAT (>45%) suggests iron overload, potentially hemochromatosis. Excess iron not bound to transferrin can damage organs.",
    howToImprove:
      "For low TSAT: iron supplementation, dietary iron, optimize absorption. For high TSAT: genetic testing for hemochromatosis, therapeutic phlebotomy if confirmed, limit iron intake.",
    relatedBiomarkerCodes: ["FE", "FERR", "TIBC"],
  },

  // Vitamins
  {
    code: "VITD",
    description:
      "Vitamin D is actually a hormone produced by skin when exposed to sunlight and obtained from diet. It's essential for calcium absorption, bone health, immune function, and mood.",
    whyItMatters:
      "Vitamin D deficiency is extremely common and linked to bone disease, muscle weakness, immune dysfunction, depression, and increased disease risk. Testing guides supplementation.",
    ifLow:
      "Low vitamin D causes fatigue, bone pain, muscle weakness, depression, and impaired immunity. Severe deficiency causes rickets in children and osteomalacia in adults.",
    ifHigh:
      "High vitamin D (usually from excessive supplementation) causes hypercalcemia with nausea, weakness, and kidney stones. Toxicity is rare from sun or food.",
    howToImprove:
      "Get 15-30 minutes of midday sun exposure when possible, eat fatty fish (salmon, mackerel), fortified foods, and consider supplementation (D3 preferred). Most adults need 1000-4000 IU daily depending on levels.",
    relatedBiomarkerCodes: ["CA", "ALP"],
  },
  {
    code: "VITB12",
    description:
      "Vitamin B12 (cobalamin) is essential for nerve function, red blood cell formation, and DNA synthesis. It's found only in animal products and requires intrinsic factor for absorption.",
    whyItMatters:
      "B12 deficiency causes irreversible nerve damage if untreated. It's common in vegans, elderly, and those with absorption issues. Early detection prevents serious complications.",
    ifLow:
      "Low B12 causes fatigue, weakness, numbness/tingling, difficulty walking, confusion, and depression. Severe deficiency causes anemia and dementia-like symptoms.",
    ifHigh:
      "High B12 is usually not harmful since excess is excreted. Very high levels may indicate liver disease, certain cancers, or excessive supplementation.",
    howToImprove:
      "Eat B12-rich foods (meat, fish, eggs, dairy) or take supplements if vegan/vegetarian. Those with absorption issues (pernicious anemia, gastric surgery) need injections. Sublingual forms improve absorption.",
    relatedBiomarkerCodes: ["MCV", "RBC", "HGB", "FOLATE"],
  },
  {
    code: "FOLATE",
    description:
      "Folate (vitamin B9) is crucial for DNA synthesis, cell division, and preventing neural tube defects in pregnancy. It works closely with vitamin B12.",
    whyItMatters:
      "Folate deficiency causes anemia and birth defects. It's especially important for women of childbearing age. Deficiency also elevates homocysteine, a cardiovascular risk factor.",
    ifLow:
      "Low folate causes fatigue, weakness, mouth sores, and anemia (large red blood cells). In pregnancy, it causes neural tube defects like spina bifida.",
    ifHigh:
      "High folate from food is not harmful. High-dose supplements may mask B12 deficiency symptoms, allowing nerve damage to progress undetected.",
    howToImprove:
      "Eat folate-rich foods: leafy greens, legumes, fortified grains, citrus fruits, and liver. Women planning pregnancy should take 400-800 mcg folic acid supplement starting before conception.",
    relatedBiomarkerCodes: ["VITB12", "MCV", "HGB"],
  },
  {
    code: "MG",
    description:
      "Magnesium is involved in over 300 enzymatic reactions including energy production, protein synthesis, muscle and nerve function, blood pressure regulation, and blood sugar control.",
    whyItMatters:
      "Magnesium deficiency is common but underdiagnosed (blood levels don't fully reflect body stores). It affects muscle function, heart rhythm, blood pressure, and mood.",
    ifLow:
      "Low magnesium causes muscle cramps, tremors, weakness, fatigue, irregular heartbeat, and worsens diabetes control. Associated with increased cardiovascular risk.",
    ifHigh:
      "High magnesium (usually from supplements or kidney disease) causes nausea, weakness, low blood pressure, and in severe cases, heart rhythm abnormalities.",
    howToImprove:
      "Eat magnesium-rich foods: dark chocolate, avocados, nuts, seeds, legumes, and leafy greens. Consider supplementation if levels are low - glycinate and citrate forms absorb well. Limit alcohol which depletes magnesium.",
    relatedBiomarkerCodes: ["CA", "K", "GLU"],
  },

  // Inflammatory Markers
  {
    code: "CRP",
    description:
      "C-Reactive Protein is produced by the liver in response to inflammation. It rises rapidly during infection, autoimmune flares, or tissue injury and falls quickly when inflammation resolves.",
    whyItMatters:
      "CRP detects inflammation that may not cause symptoms. Chronic low-grade elevation increases cardiovascular and all-cause mortality risk. It helps monitor inflammatory conditions.",
    ifLow:
      "Low CRP is optimal and indicates minimal inflammation. Very low levels suggest well-controlled inflammation and lower disease risk.",
    ifHigh:
      "High CRP indicates acute infection, autoimmune disease flare, or tissue injury. Chronic mild elevation suggests metabolic inflammation from obesity, diabetes, or smoking.",
    howToImprove:
      "Reduce inflammation through weight loss, anti-inflammatory diet (Mediterranean style), regular exercise, adequate sleep, stress management, quit smoking, and treat infections. Omega-3s may help.",
    relatedBiomarkerCodes: ["HSCRP", "ESR", "WBC"],
  },
  {
    code: "HSCRP",
    description:
      "High-Sensitivity CRP measures very low levels of C-reactive protein, detecting subtle chronic inflammation. It's specifically used for cardiovascular risk assessment.",
    whyItMatters:
      "hs-CRP predicts cardiovascular events beyond traditional risk factors. Low-grade inflammation contributes to atherosclerosis, making this test valuable for prevention planning.",
    ifLow:
      "hs-CRP below 1 mg/L indicates low cardiovascular risk from inflammation. This is the optimal range.",
    ifHigh:
      "hs-CRP above 3 mg/L indicates high cardiovascular risk. Values above 10 mg/L suggest acute inflammation (infection) rather than chronic elevation.",
    howToImprove:
      "Statins lower hs-CRP independently of cholesterol effects. Lifestyle factors: Mediterranean diet, regular exercise, weight loss, smoking cessation, stress reduction, adequate sleep, and omega-3 fatty acids.",
    relatedBiomarkerCodes: ["CRP", "LDL", "TC"],
  },
  {
    code: "ESR",
    description:
      "Erythrocyte Sedimentation Rate measures how quickly red blood cells settle in a tube over one hour. Inflammation causes proteins to make red cells clump and settle faster.",
    whyItMatters:
      "ESR is a non-specific inflammation marker useful for diagnosing and monitoring inflammatory conditions like temporal arteritis, polymyalgia rheumatica, and autoimmune diseases.",
    ifLow:
      "Low ESR is generally normal. Very low values may occur with polycythemia, sickle cell disease, or heart failure.",
    ifHigh:
      "High ESR indicates inflammation but doesn't identify the source. Causes include infection, autoimmune disease, cancer, and chronic kidney disease. Age and anemia also elevate ESR.",
    howToImprove:
      "Treat underlying inflammatory conditions. General anti-inflammatory lifestyle: healthy diet, exercise, weight management, stress reduction. ESR normalizes as inflammation resolves.",
    relatedBiomarkerCodes: ["CRP", "HSCRP", "WBC"],
  },

  // Diabetes Markers
  {
    code: "HBA1C",
    description:
      "Hemoglobin A1c measures the percentage of hemoglobin with attached glucose, reflecting average blood sugar over 2-3 months. It's the gold standard for diabetes monitoring.",
    whyItMatters:
      "HbA1c diagnoses diabetes and monitors long-term glucose control. Each 1% reduction decreases diabetes complications by about 30%. It's not affected by short-term glucose fluctuations.",
    ifLow:
      "Low HbA1c (<4%) may indicate hemolytic anemia, chronic blood loss, or certain hemoglobin variants. In diabetics, very low levels may suggest overtreatment with hypoglycemia risk.",
    ifHigh:
      "HbA1c 5.7-6.4% indicates prediabetes; 6.5% or higher indicates diabetes. Higher levels correlate with more complications - cardiovascular disease, neuropathy, nephropathy, retinopathy.",
    howToImprove:
      "Reduce carbohydrate intake especially refined carbs, exercise regularly (both aerobic and resistance), maintain healthy weight, manage stress, get adequate sleep, consider intermittent fasting. Medication if lifestyle insufficient.",
    relatedBiomarkerCodes: ["GLU", "FINS", "TG"],
  },
  {
    code: "FINS",
    description:
      "Fasting insulin measures insulin levels after 8+ hours without food. It indicates how much insulin your pancreas must produce to maintain normal blood sugar.",
    whyItMatters:
      "Elevated fasting insulin indicates insulin resistance - the precursor to type 2 diabetes. It often rises years before blood sugar abnormalities appear, allowing early intervention.",
    ifLow:
      "Low fasting insulin is generally healthy and indicates good insulin sensitivity. Very low levels may indicate type 1 diabetes where the pancreas cannot produce sufficient insulin.",
    ifHigh:
      "High fasting insulin indicates insulin resistance - cells don't respond well, requiring more insulin to control blood sugar. Associated with obesity, PCOS, and metabolic syndrome.",
    howToImprove:
      "Lose excess weight (especially visceral fat), exercise regularly (improves insulin sensitivity dramatically), reduce refined carbohydrates and sugar, increase fiber, consider intermittent fasting, manage stress and sleep.",
    relatedBiomarkerCodes: ["GLU", "HBA1C", "TG"],
  },

  // Hormones
  {
    code: "TESTO",
    description:
      "Testosterone is the primary male sex hormone, though females also produce smaller amounts. It's essential for muscle mass, bone density, red blood cell production, and libido.",
    whyItMatters:
      "Testosterone affects energy, mood, body composition, and sexual function. Low levels in men cause significant symptoms. In women, high levels may indicate PCOS.",
    ifLow:
      "Low testosterone in men causes fatigue, decreased libido, erectile dysfunction, loss of muscle mass, increased body fat, depression, and osteoporosis. In women, low levels may cause fatigue and low libido.",
    ifHigh:
      "High testosterone in women causes acne, excess hair growth, hair loss, irregular periods, and infertility (often PCOS). In men, high levels are less common naturally but occur with steroid use.",
    howToImprove:
      "Optimize through weight loss (excess fat converts testosterone to estrogen), strength training, adequate sleep, stress management, zinc and vitamin D sufficiency, limited alcohol. Testosterone replacement therapy if truly deficient.",
    relatedBiomarkerCodes: ["CORT"],
  },
  {
    code: "CORT",
    description:
      "Cortisol is the primary stress hormone, produced by adrenal glands. It regulates metabolism, immune response, blood pressure, and follows a circadian rhythm (highest in morning).",
    whyItMatters:
      "Cortisol abnormalities indicate adrenal problems or chronic stress. Chronic elevation (Cushing's) or deficiency (Addison's) cause serious health problems.",
    ifLow:
      "Low cortisol (adrenal insufficiency) causes fatigue, weight loss, low blood pressure, salt cravings, and darkened skin. Addison's disease is a serious condition requiring treatment.",
    ifHigh:
      "High cortisol causes weight gain (especially abdominal), muscle weakness, high blood sugar, high blood pressure, bone loss, and mood changes. Cushing's syndrome requires evaluation.",
    howToImprove:
      "Manage chronic stress through meditation, exercise, adequate sleep, social connection. Limit caffeine, especially later in day. Adaptogens like ashwagandha may help normalize cortisol. Medical conditions require specific treatment.",
    relatedBiomarkerCodes: ["GLU", "TESTO"],
  },
];
