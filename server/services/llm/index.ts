/**
 * Biomarker Extraction Service
 *
 * Two modes controlled by LLM_PROVIDER env var:
 * - "none" (default): Deterministic regex parser. No external APIs needed.
 * - "openai": Uses OpenAI gpt-4o via Vercel AI SDK.
 * - "ollama": Uses local Ollama via OpenAI-compatible API.
 */
import { z } from "zod";

// Schema for extracted biomarker
const ExtractedBiomarkerSchema = z.object({
  code: z.string().describe("The biomarker code from the known list"),
  value: z.string().describe("The numeric value as a string"),
  unit: z.string().describe("The unit of measurement"),
  originalName: z.string().optional().describe("The original name as it appeared in the document"),
});

const ExtractionResultSchema = z.object({
  testDate: z.string().optional().describe("The date of the blood test in YYYY-MM-DD format if found"),
  labName: z.string().optional().describe("The laboratory name if found"),
  biomarkers: z.array(ExtractedBiomarkerSchema).describe("Array of extracted biomarker values"),
});

export type ExtractedBiomarker = z.infer<typeof ExtractedBiomarkerSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ============================================================================
// Router: dispatch to regex or LLM based on LLM_PROVIDER
// ============================================================================

export async function extractBiomarkersFromText(ocrText: string): Promise<ExtractionResult> {
  const provider = (process.env.LLM_PROVIDER || "none").toLowerCase();
  if (provider === "none") {
    return regexExtract(ocrText);
  }
  return llmExtract(ocrText, provider);
}

// ============================================================================
// REGEX / DETERMINISTIC PARSER
// ============================================================================

// Biomarker aliases → canonical code
const BIOMARKER_ALIASES: [string[], string][] = [
  // Hematology
  [["leucocitos", "leukocytes", "white blood cells", "wbc", "recuento leucocitos", "leucocitos recuento"], "WBC"],
  [["eritrocitos", "erythrocytes", "red blood cells", "rbc", "hematies", "recuento eritrocitos", "recuento hematies"], "RBC"],
  [["hemoglobina", "hemoglobin", "haemoglobin", "hgb", "hb"], "HGB"],
  [["hematocrito", "hematocrit", "hct", "pcv"], "HCT"],
  [["v.c.m", "vcm", "mcv", "vol. corpuscular medio", "volumen corpuscular medio"], "MCV"],
  [["h.c.m", "hcm", "mch", "hemoglobina corpuscular media", "hb corpuscular media"], "MCH"],
  [["c.h.c.m", "chcm", "mchc", "conc. hb corpuscular media", "concentracion hb corpuscular media", "conc.hb.corpuscular media"], "MCHC"],
  [["plaquetas", "platelets", "thrombocytes", "plt", "recuento plaquetas"], "PLT"],
  [["rdw", "rdw-cv", "rdw-sd", "amp. distrib. eritrocitaria", "ide", "indice distribucion eritrocitaria", "a.d.e."], "RDW"],
  [["reticulocitos", "reticulocytes", "retic"], "RETIC"],
  [["vpm", "mpv", "volumen plaquetar medio", "vol plaquetar medio", "mean platelet volume"], "MPV"],
  [["vsg", "esr", "velocidad sedimentacion", "velocidad de sedimentacion", "sed rate"], "ESR"],
  [["neutrofilos", "neutrophils", "neutr"], "NEUT"],
  [["linfocitos", "lymphocytes", "linf"], "LYMPH"],
  [["monocitos", "monocytes", "mono"], "MONO"],
  [["eosinofilos", "eosinophils", "eosin"], "EOS"],
  [["basofilos", "basophils", "baso"], "BASO"],

  // Lipids
  [["colesterol total", "total cholesterol", "cholesterol", "colesterol"], "TC"],
  [["colesterol ldl", "ldl colesterol", "ldl-c", "ldl cholesterol", "ldl", "c-ldl", "colesterol-ldl"], "LDL"],
  [["colesterol hdl", "hdl colesterol", "hdl-c", "hdl cholesterol", "hdl", "c-hdl", "colesterol-hdl"], "HDL"],
  [["trigliceridos", "triglycerides", "trigs", "tg"], "TG"],
  [["colesterol vldl", "vldl", "vldl cholesterol"], "VLDL"],
  [["col.total/col.hdl", "indice aterogenico", "riesgo aterogenico", "col total/hdl"], "TC_HDL_RATIO"],

  // Metabolic
  [["glucosa", "glucose", "blood sugar", "fasting glucose", "glucemia", "glucosa basal"], "GLU"],
  [["hemoglobina glicosilada", "hemoglobina glicada", "hba1c", "a1c", "glycated hemoglobin", "hemoglobina a1c"], "HBA1C"],
  [["insulina", "insulin", "fasting insulin", "insulina basal"], "FINS"],
  [["indice homa", "homa-ir", "homa", "homeostasis model"], "HOMA"],

  // Kidney
  [["urea", "blood urea nitrogen", "bun", "nitrogeno ureico"], "BUN"],
  [["creatinina", "creatinine", "creat"], "CREAT"],
  [["filtrado glomerular", "egfr", "estimated gfr", "tasa filtracion glomerular", "fge", "ckd-epi", "mdrd"], "EGFR"],
  [["acido urico", "uric acid", "urato"], "URIC"],

  // Electrolytes
  [["sodio", "sodium", "na+"], "NA"],
  [["potasio", "potassium", "k+"], "K"],
  [["cloro", "chloride", "cl-", "cloruro"], "CL"],
  [["bicarbonato", "co2", "carbon dioxide", "hco3"], "CO2"],
  [["calcio total", "calcio", "calcium", "ca"], "CA"],
  [["fosforo", "phosphorus", "phosphate", "fosfato"], "PHOS"],
  [["magnesio", "magnesium"], "MG"],

  // Liver
  [["proteinas totales", "total protein", "proteinas", "prot. totales"], "TP"],
  [["albumina", "albumin", "alb"], "ALB"],
  [["bilirrubina total", "total bilirubin", "bilirrubina", "bili total"], "BILI"],
  [["bilirrubina directa", "direct bilirubin", "bili directa", "bilirrubina conjugada"], "DBILI"],
  [["bilirrubina indirecta", "indirect bilirubin", "bili indirecta"], "IBILI"],
  [["fosfatasa alcalina", "alkaline phosphatase", "alk phos", "alp", "fa", "fos. alcalina"], "ALP"],
  [["got", "ast", "sgot", "aspartato aminotransferasa", "aspartate aminotransferase", "transaminasa got", "got/ast"], "AST"],
  [["gpt", "alt", "sgpt", "alanina aminotransferasa", "alanine aminotransferase", "transaminasa gpt", "gpt/alt"], "ALT"],
  [["ggt", "gamma gt", "gamma-gt", "gamma glutamil", "gamma glutamil transferasa", "gamma-glutamil transpeptidasa"], "GGT"],
  [["ldh", "lactato deshidrogenasa", "lactate dehydrogenase"], "LDH"],

  // Thyroid
  [["tsh", "thyroid stimulating hormone", "tirotropina"], "TSH"],
  [["t4 libre", "free t4", "ft4", "tiroxina libre", "t4l"], "T4"],
  [["t3 libre", "free t3", "ft3", "triyodotironina libre", "t3l"], "T3"],

  // Iron
  [["hierro", "iron", "serum iron", "fe", "hierro serico", "sideremia"], "FE"],
  [["ferritina", "ferritin"], "FERR"],
  [["transferrina", "tibc", "total iron binding capacity", "capacidad total fijacion hierro", "ctfh"], "TIBC"],
  [["saturacion transferrina", "transferrin saturation", "iron saturation", "tsat", "ist", "indice saturacion transferrina"], "TSAT"],

  // Vitamins
  [["vitamina d", "vitamin d", "25-oh vitamina d", "25-oh vitamin d", "calcifediol", "25-hidroxivitamina d", "25-oh-d3", "vit d"], "VITD"],
  [["vitamina b12", "vitamin b12", "cobalamin", "cobalamina", "vit b12"], "VITB12"],
  [["folato", "folate", "folic acid", "acido folico"], "FOLATE"],

  // Inflammation
  [["proteina c reactiva", "c-reactive protein", "crp", "pcr"], "CRP"],
  [["pcr ultrasensible", "hs-crp", "hscrp", "pcr-us", "proteina c reactiva ultrasensible"], "HSCRP"],

  // Hormones
  [["testosterona total", "testosterone", "total testosterone", "testosterona"], "TESTO"],
  [["cortisol"], "CORT"],
  [["psa total", "psa", "prostate specific antigen", "antigeno prostatico"], "PSA"],

  // Coagulation
  [["fibrinogeno", "fibrinogen"], "FIB"],

  // Pancreas
  [["amilasa", "amylase"], "AMYL"],
  [["lipasa", "lipase"], "LIP"],
];

const LAB_PATTERNS = [
  /quirónsalud|quironsalud/i,
  /sanitas/i,
  /arrixaca/i,
  /synlab/i,
  /reina\s+sofia/i,
  /laboratorio[s]?\s+([^\n]{3,40})/i,
  /hospital[^\n]{3,40}/i,
];

function extractDate(text: string): string | undefined {
  // "fecha" / "date" / "recogida" followed by DD/MM/YYYY
  const dmy = /(?:fecha|date|recogida|extraccion)[:\s]*(\d{2})[/\-.](\d{2})[/\-.](\d{4})/i.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const ymd = /(?:fecha|date|recogida|extraccion)[:\s]*(\d{4})[/\-.](\d{2})[/\-.](\d{2})/i.exec(text);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  // Any DD/MM/YYYY on the page
  const anyDmy = /(\d{2})[/](\d{2})[/](\d{4})/.exec(text);
  if (anyDmy && parseInt(anyDmy[1]) <= 31 && parseInt(anyDmy[2]) <= 12) {
    return `${anyDmy[3]}-${anyDmy[2]}-${anyDmy[1]}`;
  }
  return undefined;
}

function extractLabName(text: string): string | undefined {
  for (const pattern of LAB_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[0].trim();
  }
  return undefined;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

// Matches: optional </> + number (with , or . decimal) + whitespace + unit
const VALUE_UNIT_RE = /[<>]?\s*(\d+[.,]?\d*)\s+([\w^µμ/*%.·×\-³⁹]+(?:\/[\w^µμ/*%.·×\-³⁹]+)?)/;

function regexExtract(ocrText: string): ExtractionResult {
  const lines = ocrText.split(/\n/);
  const biomarkers: ExtractedBiomarker[] = [];
  const found = new Set<string>();

  for (const line of lines) {
    const nLine = normalize(line);

    for (const [aliases, code] of BIOMARKER_ALIASES) {
      if (found.has(code)) continue;

      for (const alias of aliases) {
        const nAlias = normalize(alias);
        const idx = nLine.indexOf(nAlias);
        if (idx === -1) continue;

        // Word boundary check
        const before = nLine[idx - 1];
        if (before && /[a-z0-9]/.test(before)) continue;
        const after = nLine[idx + nAlias.length];
        if (after && /[a-z]/.test(after)) continue;

        // Get the original line portion after the alias
        const aliasEnd = idx + nAlias.length;
        // Map back to original line approximately
        const remainder = line.substring(aliasEnd);
        const valueMatch = VALUE_UNIT_RE.exec(remainder);

        if (valueMatch) {
          const rawValue = valueMatch[1].replace(",", ".");
          biomarkers.push({
            code,
            value: rawValue,
            unit: valueMatch[2],
            originalName: alias,
          });
          found.add(code);
          break;
        }
      }
    }
  }

  return {
    testDate: extractDate(ocrText),
    labName: extractLabName(ocrText),
    biomarkers,
  };
}

// ============================================================================
// LLM-BASED EXTRACTION (optional, enabled via LLM_PROVIDER=openai|ollama)
// ============================================================================

const BIOMARKER_SCHEMA = `
Known biomarker codes and their aliases:
- WBC (White Blood Cells, Leukocytes)
- RBC (Red Blood Cells, Erythrocytes)
- HGB (Hemoglobin, Hgb, Haemoglobin)
- HCT (Hematocrit, PCV, Packed Cell Volume)
- MCV (Mean Corpuscular Volume)
- MCH (Mean Corpuscular Hemoglobin)
- MCHC (Mean Corpuscular Hemoglobin Concentration)
- PLT (Platelets, Thrombocytes)
- RDW (Red Cell Distribution Width)
- TC (Total Cholesterol, Cholesterol)
- LDL (LDL Cholesterol, LDL-C, Bad Cholesterol)
- HDL (HDL Cholesterol, HDL-C, Good Cholesterol)
- TG (Triglycerides, Trigs)
- VLDL (VLDL Cholesterol)
- GLU (Glucose, Blood Sugar, Fasting Glucose)
- BUN (Blood Urea Nitrogen, Urea)
- CREAT (Creatinine)
- EGFR (Estimated GFR, eGFR)
- NA (Sodium, Na+)
- K (Potassium, K+)
- CL (Chloride, Cl-)
- CO2 (Carbon Dioxide, Bicarbonate, HCO3)
- CA (Calcium)
- TP (Total Protein)
- ALB (Albumin)
- BILI (Bilirubin, Total Bilirubin)
- ALP (Alkaline Phosphatase, Alk Phos)
- AST (Aspartate Aminotransferase, SGOT)
- ALT (Alanine Aminotransferase, SGPT)
- TSH (Thyroid Stimulating Hormone)
- T4 (Thyroxine, Free T4, FT4)
- T3 (Triiodothyronine, Free T3, FT3)
- FE (Iron, Serum Iron)
- FERR (Ferritin)
- TIBC (Total Iron Binding Capacity)
- TSAT (Transferrin Saturation, Iron Saturation)
- VITD (Vitamin D, 25-OH Vitamin D, D3)
- VITB12 (Vitamin B12, Cobalamin)
- FOLATE (Folate, Folic Acid)
- MG (Magnesium)
- CRP (C-Reactive Protein)
- HSCRP (High-Sensitivity CRP, hs-CRP)
- ESR (Erythrocyte Sedimentation Rate, Sed Rate)
- HBA1C (Hemoglobin A1c, A1C, Glycated Hemoglobin)
- FINS (Fasting Insulin, Insulin)
- TESTO (Testosterone, Total Testosterone)
- CORT (Cortisol)
`;

async function llmExtract(ocrText: string, provider: string): Promise<ExtractionResult> {
  const { generateObject } = await import("ai");
  const { createOpenAI } = await import("@ai-sdk/openai");

  let model;
  if (provider === "openai") {
    const p = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    model = p("gpt-4o");
  } else {
    // ollama via OpenAI-compatible API
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const modelName = process.env.OLLAMA_MODEL || "llama3.1:8b";
    const p = createOpenAI({ baseURL: `${ollamaUrl}/v1`, apiKey: "ollama" });
    model = p(modelName);
  }

  const { object } = await generateObject({
    model,
    schema: ExtractionResultSchema,
    prompt: `You are a medical document parser specialized in extracting blood test results.

Given the following OCR text from a blood test document, extract all biomarker values.

${BIOMARKER_SCHEMA}

Instructions:
1. Find all biomarker values in the text
2. Match each biomarker to the correct code from the known list above
3. Extract the numeric value (as a string to preserve precision)
4. Extract the unit of measurement exactly as shown
5. If you find the test date, extract it in YYYY-MM-DD format
6. If you find the lab name, extract it

Only extract biomarkers that you are confident about. If a value seems ambiguous or unclear, skip it.
Do not make up values. Only extract what is clearly present in the document.

OCR Text:
${ocrText}`,
  });

  return object;
}

// ============================================================================
// UNIT CONVERSION (deterministic, no LLM)
// ============================================================================

/**
 * Validates extracted biomarkers against known codes
 */
export function validateExtractedBiomarkers(
  extracted: ExtractedBiomarker[],
  knownCodes: string[]
): ExtractedBiomarker[] {
  return extracted.filter((biomarker) => knownCodes.includes(biomarker.code));
}

export type UnitConversionResult = {
  canConvert: boolean;
  isEquivalent: boolean;
  conversionFactor?: number;
};

const UNIT_EQUIVALENCES: Record<string, string[]> = {
  "g/dL": ["g/dl", "gr/dl"],
  "mg/dL": ["mg/dl"],
  "mg/L": ["mg/l"],
  "µg/dL": ["ug/dL", "ug/dl", "μg/dL", "μg/dl", "mcg/dL", "mcg/dl"],
  "ng/mL": ["ng/ml"],
  "ng/dL": ["ng/dl"],
  "pg/mL": ["pg/ml"],
  "µIU/mL": ["uIU/mL", "uIU/ml", "μIU/mL", "mUI/L", "mUI/l", "µUI/mL"],
  "10^3/µL": ["10^3/uL", "10^3/μL", "x10^3/uL", "x10³/µL", "mil/mm3", "10e3/uL", "miles/mm3", "10*3/uL"],
  "10^6/µL": ["10^6/uL", "10^6/μL", "x10^6/uL", "x10⁶/µL", "mill/mm3", "10e6/uL", "10*6/uL"],
  "fL": ["fl"],
  "pg": [],
  "g/L": ["g/l"],
  "%": [],
  "mm/h": ["mm/hr", "mm/1h"],
  "mEq/L": ["mEq/l", "meq/L"],
  "mmol/L": ["mmol/l"],
  "U/L": ["U/l", "UI/L", "UI/l", "IU/L"],
  "mL/min": ["ml/min", "mL/min/1.73m2", "ml/min/1,73m2"],
};

const CONVERSIONS: Record<string, Record<string, number>> = {
  GLU: { "mmol/L_to_mg/dL": 18.0182, "mg/dL_to_mmol/L": 1 / 18.0182 },
  TC: { "mmol/L_to_mg/dL": 38.67, "mg/dL_to_mmol/L": 1 / 38.67 },
  LDL: { "mmol/L_to_mg/dL": 38.67, "mg/dL_to_mmol/L": 1 / 38.67 },
  HDL: { "mmol/L_to_mg/dL": 38.67, "mg/dL_to_mmol/L": 1 / 38.67 },
  TG: { "mmol/L_to_mg/dL": 88.57, "mg/dL_to_mmol/L": 1 / 88.57 },
};

function normalizeUnit(unit: string): string {
  const u = unit.trim();
  for (const [canonical, variants] of Object.entries(UNIT_EQUIVALENCES)) {
    if (canonical.toLowerCase() === u.toLowerCase()) return canonical;
    if (variants.some((v) => v.toLowerCase() === u.toLowerCase())) return canonical;
  }
  return u;
}

/**
 * Deterministic unit conversion. Kept as convertUnitWithLLM for API compat.
 */
export async function convertUnitWithLLM(
  biomarkerCode: string,
  _biomarkerName: string,
  sourceUnit: string,
  canonicalUnit: string,
  value: number
): Promise<{ convertedValue: number; unit: string } | null> {
  const normSource = normalizeUnit(sourceUnit);
  const normCanonical = normalizeUnit(canonicalUnit);

  if (normSource === normCanonical) {
    return { convertedValue: value, unit: canonicalUnit };
  }

  const convKey = `${normSource}_to_${normCanonical}`;
  const factors = CONVERSIONS[biomarkerCode];
  if (factors?.[convKey]) {
    return { convertedValue: value * factors[convKey], unit: canonicalUnit };
  }

  return null;
}
