import { randomUUID } from "crypto";
import type { LevelCode, LevelExamStudentSnapshot, LevelExamSubject } from "@/lib/types/levelExam";

type SeedQuestion = {
  id: string;
  stem: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  options: { id: string; option_key: string; option_text: string; is_correct: boolean }[];
};

type SeedExam = {
  id: string;
  title: string;
  subject_code: string;
  level_code: LevelCode;
  instructions: string;
  duration_minutes: number;
  available_from: string;
  available_until: string;
  questions: Array<SeedQuestion & { marks: number; display_order: number }>;
};

export interface SeedLevelExamState {
  subjects: LevelExamSubject[];
  levels: Array<{ code: LevelCode; name: string }>;
  studentSnapshots: LevelExamStudentSnapshot[];
  exams: SeedExam[];
  assignments: Array<{ id: string; exam_id: string; frappe_student_id: string; assigned_at: string; status: "assigned" | "started" | "submitted" }>;
  attempts: Array<{
    id: string;
    exam_id: string;
    frappe_student_id: string;
    started_at: string;
    submitted_at?: string;
    status: "in_progress" | "submitted" | "auto_submitted";
    answers: Array<{ question_id: string; selected_option_id: string }>;
  }>;
}

function makeQuestionFactory() {
  return (stem: string, difficulty: "easy" | "medium" | "hard", options: string[], correctIndex: number, explanation?: string) => {
    const id = randomUUID();
    return {
      id,
      stem,
      difficulty,
      explanation,
      options: options.map((optionText, index) => ({
        id: randomUUID(),
        option_key: String.fromCharCode(65 + index),
        option_text: optionText,
        is_correct: index === correctIndex,
      })),
    };
  };
}

export function buildSeedLevelExamState(): SeedLevelExamState {
  const now = new Date();
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  const makeQuestion = makeQuestionFactory();

  const subjects: LevelExamSubject[] = [
    { code: "BIO", name: "Biology" },
    { code: "CHEM", name: "Chemistry" },
    { code: "MATH", name: "Mathematics" },
    { code: "PHYS", name: "Physics" },
  ];

  const levels: Array<{ code: LevelCode; name: string }> = [
    { code: "5", name: "5th" },
    { code: "6", name: "6th" },
    { code: "7", name: "7th" },
    { code: "8", name: "8th" },
    { code: "9", name: "9th" },
    { code: "10", name: "10th" },
  ];

  const studentSnapshots: LevelExamStudentSnapshot[] = [
    {
      frappe_student_id: "STU-LEVEL-7-A",
      student_name: "Demo 7th Student",
      branch: "Smart Up Chullickal",
      program: "7th Grade",
      student_group: "CHL-7-LOCAL",
      level_code: "7",
      is_active: true,
    },
    {
      frappe_student_id: "STU-LEVEL-8-A",
      student_name: "Demo 8th Student",
      branch: "Smart Up Chullickal",
      program: "8th Grade",
      student_group: "CHL-8-LOCAL",
      level_code: "8",
      is_active: true,
    },
  ];

  const chemistryByLevel: Record<LevelCode, SeedQuestion[]> = {
    "5": [
      makeQuestion("Which of the following is a correct example of a solvent?", "easy", ["Salt", "Sugar", "Water", "Sand"], 2),
      makeQuestion("When water changes into ice, its state changes from liquid to —", "easy", ["Gas", "Solid", "Energy", "Vapour"], 1),
      makeQuestion("Which energy source is produced using moving air?", "easy", ["Hydropower", "Solar energy", "Wind energy", "Biogas"], 2),
      makeQuestion("In salt water, what is salt called?", "easy", ["Solvent", "Solution", "Energy", "Solute"], 3),
      makeQuestion("Which energy source is most suitable for running an electric vehicle?", "easy", ["Coal", "Petrol", "Electricity", "Firewood"], 2),
    ],
    "6": [
      makeQuestion("Which property of matter explains the spreading of perfume smell in a room?", "easy", ["Shape", "Diffusion", "Sedimentation", "Solubility"], 1),
      makeQuestion("Which of the following changes is irreversible?", "easy", ["Melting ice", "Dissolving sugar in water", "Burning paper", "Freezing water"], 2),
      makeQuestion("A substance that does not dissolve in water is called:", "easy", ["Transparent", "Soluble", "Insoluble", "Saturated"], 2),
      makeQuestion("Which state of matter has maximum intermolecular space?", "medium", ["Solid", "Liquid", "Gas", "Plasma"], 2),
      makeQuestion("Separation of husk from grains by wind is called:", "easy", ["Filtration", "Winnowing", "Sieving", "Decantation"], 1),
    ],
    "7": [
      makeQuestion("Which gas is essential for rusting of iron?", "easy", ["Nitrogen", "Hydrogen", "Oxygen", "Carbon dioxide"], 2, "Rusting requires oxygen and moisture."),
      makeQuestion("China rose indicator turns dark pink in:", "medium", ["Acidic solution", "Basic solution", "Neutral solution", "Salt solution"], 1),
      makeQuestion("Which of the following is a neutral substance?", "easy", ["Lemon juice", "Soap solution", "Distilled water", "Vinegar"], 2),
      makeQuestion("Galvanization prevents rusting by coating iron with:", "medium", ["Copper", "Aluminium", "Zinc", "Tin"], 2),
      makeQuestion("Formation of curd from milk is a:", "easy", ["Physical change", "Reversible change", "Chemical change", "Temporary change"], 2),
    ],
    "8": [
      makeQuestion("Which of the following metals reacts vigorously with water?", "medium", ["Gold", "Sodium", "Copper", "Silver"], 1),
      makeQuestion("A more reactive metal displacing a less reactive metal is called:", "medium", ["Combination reaction", "Decomposition reaction", "Displacement reaction", "Neutralization reaction"], 2),
      makeQuestion("Which fuel produces the least pollution?", "easy", ["Coal", "Wood", "LPG", "Diesel"], 2),
      makeQuestion("Which non-metal is essential for respiration?", "easy", ["Nitrogen", "Oxygen", "Sulphur", "Chlorine"], 1),
      makeQuestion("The major component of biogas is:", "medium", ["Carbon dioxide", "Oxygen", "Methane", "Hydrogen"], 2),
    ],
    "9": [
      makeQuestion("The temperature at which a solid changes into liquid is called:", "easy", ["Boiling point", "Condensation point", "Melting point", "Sublimation point"], 2),
      makeQuestion("Which process causes cooling?", "easy", ["Condensation", "Evaporation", "Freezing", "Deposition"], 1),
      makeQuestion("Brass is an example of:", "medium", ["Element", "Compound", "Mixture", "Pure substance"], 2),
      makeQuestion("The force of attraction between particles is maximum in:", "medium", ["Gases", "Liquids", "Solids", "Plasma"], 2),
      makeQuestion("Conversion of solid directly into gas is called:", "easy", ["Fusion", "Condensation", "Sublimation", "Vaporization"], 2),
    ],
    "10": [
      makeQuestion("Which gas is released when an acid reacts with a metal carbonate?", "medium", ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"], 2),
      makeQuestion("pH values less than 7 indicate a solution is:", "easy", ["Basic", "Neutral", "Acidic", "Saturated"], 2),
      makeQuestion("The common name for calcium oxide is:", "medium", ["Quick lime", "Bleaching powder", "Baking soda", "Plaster of Paris"], 0),
      makeQuestion("Which type of reaction releases heat to the surroundings?", "medium", ["Endothermic", "Exothermic", "Displacement", "Double decomposition"], 1),
      makeQuestion("The chemical formula of washing soda is:", "hard", ["NaHCO3", "Na2CO3.10H2O", "CaCO3", "NaCl"], 1),
    ],
  };

  const biologyByLevel: Record<LevelCode, SeedQuestion[]> = {
    "5": [
      makeQuestion("Which gas is essential for human breathing?", "easy", ["Nitrogen", "Carbon dioxide", "Oxygen", "None of these"], 2),
      makeQuestion("The green pigment present in leaves is ________.", "easy", ["Hemoglobin", "Chlorophyll", "Melanin", "Carotene"], 1),
      makeQuestion("Identify the communicable disease from the following.", "easy", ["Diabetes", "Hypertension", "Hepatitis B", "Cancer"], 2),
      makeQuestion("What is seed dispersal?", "medium", ["Making food in plants", "Transfer of pollen grains", "Seeds reaching different locations", "Growth of a seed into a plant"], 2),
      makeQuestion("Pneumatophores in mangrove plants are adapted for _______.", "medium", ["Storing food", "Climbing support", "Respiration in waterlogged soil", "Absorbing sunlight"], 2),
    ],
    "6": [
      makeQuestion("A balanced diet contains", "easy", ["Only carbohydrates", "Only proteins", "All nutrients in correct proportion", "Only vitamins"], 2),
      makeQuestion("A point where two or more bones meet is called a:", "easy", ["Muscle", "Tendon", "Joint", "Ligament"], 2),
      makeQuestion("Green leafy vegetables are rich in", "easy", ["Vitamins and minerals", "Fats", "Sugar", "Starch"], 0),
      makeQuestion("Self-pollination occurs when pollen grains are transferred from", "medium", ["One plant to another", "Anther to stigma of the same flower", "Root to stem", "Leaf to flower"], 1),
      makeQuestion("Stomata help mainly in", "medium", ["Reproduction", "Photosynthesis only", "Gas exchange and transpiration", "Water absorption"], 2),
    ],
    "7": [
      makeQuestion("Which method of vegetative propagation uses a piece of stem to grow a new plant?", "easy", ["Layering", "Cutting", "Grafting", "Pollination"], 1),
      makeQuestion("Which of the following best explains the term nutrition?", "medium", ["Removal of waste materials", "Obtaining and utilizing food", "Exchange of gases", "Production of energy without food"], 1),
      makeQuestion("The first set of teeth in humans are called:", "easy", ["Permanent teeth", "Canines", "Milk teeth", "Wisdom teeth"], 2),
      makeQuestion("Identify a unicellular organism:", "easy", ["Animals", "Plants", "Paramecium", "None of these"], 2),
      makeQuestion("The red colour of blood is due to the presence of:", "easy", ["Plasma", "Platelets", "Haemoglobin", "White blood cells"], 2),
    ],
    "8": [
      makeQuestion("Tissue culture is a method used to", "medium", ["Grow plants from small pieces of tissue", "Increase soil fertility", "Study animal behaviour", "Prevent photosynthesis"], 0),
      makeQuestion("Hydroponics is a method of growing plants", "medium", ["In dry sand only", "Without soil using nutrient solution", "Only in sunlight", "Inside rocks"], 1),
      makeQuestion("Which is a characteristic feature of a prokaryotic cell?", "hard", ["True nucleus present", "Membrane-bound organelles", "Absence of a true nucleus", "Large vacuole present"], 2),
      makeQuestion("Chloroplast is responsible for", "easy", ["Respiration", "Digestion", "Photosynthesis", "Reproduction"], 2),
      makeQuestion("Which feature distinguishes meristematic tissue from permanent tissue?", "hard", ["Dead thick-walled cells", "Actively dividing cells lacking vacuoles", "Large intercellular spaces", "Storage only"], 1),
    ],
    "9": [
      makeQuestion("Which cell organelle is known as the powerhouse of the cell?", "easy", ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"], 2),
      makeQuestion("Movement of water through a semipermeable membrane is called", "medium", ["Diffusion", "Osmosis", "Respiration", "Transpiration"], 1),
      makeQuestion("Which tissue transports water in plants?", "medium", ["Phloem", "Xylem", "Parenchyma", "Epidermis"], 1),
      makeQuestion("Which structure in the cell controls all activities?", "easy", ["Cell wall", "Nucleus", "Cytoplasm", "Vacuole"], 1),
      makeQuestion("Which tissue connects muscles to bones?", "medium", ["Cartilage", "Ligament", "Tendon", "Nerve"], 2),
    ],
    "10": [
      makeQuestion("The functional unit of the kidney is:", "medium", ["Neuron", "Nephron", "Alveolus", "Villus"], 1),
      makeQuestion("Which plant tissue is responsible for transporting food?", "easy", ["Xylem", "Phloem", "Cortex", "Epidermis"], 1),
      makeQuestion("Genes are located on:", "medium", ["Ribosomes", "Chromosomes", "Vacuoles", "Lysosomes"], 1),
      makeQuestion("The process by which green plants make food is called:", "easy", ["Respiration", "Digestion", "Photosynthesis", "Transpiration"], 2),
      makeQuestion("Which hormone helps regulate blood sugar levels?", "hard", ["Thyroxine", "Insulin", "Adrenaline", "Estrogen"], 1),
    ],
  };

  const buildExam = (subjectCode: "CHEM" | "BIO", subjectName: string, levelCode: LevelCode, questions: SeedQuestion[], variant: "core" | "revision"): SeedExam => ({
    id: `local-level-exam-${subjectCode.toLowerCase()}-${levelCode}-${variant}`,
    title: `${levelCode}th ${subjectName} Level Test - ${variant === "core" ? "Core" : "Revision"}`,
    subject_code: subjectCode,
    level_code: levelCode,
    instructions: `Read each MCQ carefully and choose one answer. This is a local-only ${subjectName.toLowerCase()} level test for ${levelCode}th students.`,
    duration_minutes: variant === "core" ? 20 : 15,
    available_from: daysFromNow(-2),
    available_until: daysFromNow(14),
    questions: questions.map((question, index) => ({ ...question, marks: 2, display_order: index + 1 })),
  });

  const exams: SeedExam[] = (["5", "6", "7", "8", "9", "10"] as LevelCode[]).flatMap((levelCode) => [
    buildExam("CHEM", "Chemistry", levelCode, chemistryByLevel[levelCode], "core"),
    buildExam("BIO", "Biology", levelCode, biologyByLevel[levelCode], "revision"),
  ]);

  const assignments = [
    {
      id: randomUUID(),
      exam_id: "local-level-exam-chem-7-core",
      frappe_student_id: studentSnapshots[0].frappe_student_id,
      assigned_at: hoursAgo(12),
      status: "assigned" as const,
    },
    {
      id: randomUUID(),
      exam_id: "local-level-exam-bio-7-revision",
      frappe_student_id: studentSnapshots[0].frappe_student_id,
      assigned_at: hoursAgo(48),
      status: "submitted" as const,
    },
  ];

  const priorAttempt = {
    id: randomUUID(),
    exam_id: "local-level-exam-bio-7-revision",
    frappe_student_id: studentSnapshots[0].frappe_student_id,
    started_at: hoursAgo(36),
    submitted_at: hoursAgo(35.5),
    status: "submitted" as const,
    answers: exams[1].questions.map((q, index) => ({
      question_id: q.id,
      selected_option_id: q.options[index === 3 ? 0 : 2]?.id || q.options[0].id,
    })),
  };

  return {
    subjects,
    levels,
    studentSnapshots,
    exams,
    assignments,
    attempts: [priorAttempt],
  };
}
