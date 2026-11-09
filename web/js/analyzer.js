// Resume analysis engine. Pure functions, no DOM access, runs in the browser or Node.

export const SECTION_DEFS = {
  summary: {
    label: "Summary",
    tier: "core",
    headings: ["summary", "professional summary", "profile", "professional profile", "objective", "career objective",
      "about", "about me", "career summary", "executive summary", "personal statement", "summary of qualifications"],
  },
  experience: {
    label: "Experience",
    tier: "core",
    headings: ["experience", "work experience", "professional experience", "employment history", "employment",
      "work history", "relevant experience", "career history", "internships", "internship", "internship experience",
      "professional background"],
  },
  education: {
    label: "Education",
    tier: "core",
    headings: ["education", "academic background", "academics", "education and training", "educational background",
      "academic qualifications", "qualifications", "education and certifications"],
  },
  skills: {
    label: "Skills",
    tier: "core",
    headings: ["skills", "technical skills", "core skills", "key skills", "competencies", "core competencies",
      "technology stack", "tech stack", "tools", "tools and technologies", "technologies", "areas of expertise",
      "expertise", "skills and tools", "technical proficiencies", "skills summary"],
  },
  projects: {
    label: "Projects",
    tier: "recommended",
    headings: ["projects", "project experience", "academic projects", "personal projects", "key projects",
      "selected projects", "side projects", "notable projects", "portfolio"],
  },
  certifications: {
    label: "Certifications",
    tier: "optional",
    headings: ["certifications", "certificates", "licenses", "licenses and certifications",
      "certifications and licenses", "courses", "training", "relevant coursework", "coursework"],
  },
  achievements: {
    label: "Achievements",
    tier: "optional",
    headings: ["achievements", "awards", "honors", "honours", "awards and honors", "accomplishments",
      "awards and achievements", "key achievements"],
  },
  leadership: {
    label: "Leadership & Volunteering",
    tier: "optional",
    headings: ["volunteer", "volunteering", "volunteer experience", "community service", "leadership",
      "leadership experience", "extracurricular activities", "extracurriculars", "activities", "positions of responsibility"],
  },
  publications: {
    label: "Publications",
    tier: "optional",
    headings: ["publications", "research", "research experience", "papers", "patents"],
  },
  languages: { label: "Languages", tier: "optional", headings: ["languages", "spoken languages"] },
  interests: { label: "Interests", tier: "optional", headings: ["interests", "hobbies", "hobbies and interests"] },
};

const HEADING_LOOKUP = new Map();
for (const [key, def] of Object.entries(SECTION_DEFS)) {
  for (const h of def.headings) HEADING_LOOKUP.set(h, key);
}

const ACTION_VERBS = new Set(`accelerated accomplished achieved acquired adapted addressed administered advanced advised advocated
aligned allocated analyzed answered anticipated applied appraised approved architected arranged assembled assessed
attained audited authored automated balanced benchmarked boosted briefed budgeted built calculated campaigned
captured catalogued centralized championed clarified closed coached coded collaborated collected combined
commissioned communicated compiled completed composed computed conceived conceptualized conducted configured
consolidated constructed consulted contracted contributed controlled converted convinced coordinated corrected
crafted created cultivated curated customized cut debugged decreased defined delegated delivered demonstrated
deployed designed detected determined developed devised diagnosed directed discovered dispatched distributed
documented doubled drafted drove earned edited educated eliminated enabled encouraged engineered enhanced
established evaluated examined exceeded executed expanded expedited experimented explored facilitated fixed
forecasted formalized formed formulated fostered founded generated grew guided halved handled headed hired
identified illustrated implemented improved increased influenced informed initiated innovated inspected inspired
installed instituted instructed integrated interpreted interviewed introduced invented investigated launched led
leveraged lifted maintained managed mapped marketed maximized measured mediated mentored merged migrated minimized
mobilized modeled moderated modernized monitored motivated navigated negotiated onboarded operated optimized
orchestrated organized originated outperformed overhauled oversaw partnered perfected performed persuaded piloted
pioneered planned prepared presented prioritized processed produced programmed projected promoted proposed
prototyped provided published purchased qualified quantified raised ran rebuilt recommended reconciled recruited
redesigned reduced refactored refined regulated rehabilitated remodeled reorganized repaired replaced reported
represented researched resolved restored restructured retained revamped reviewed revised revitalized saved scaled
scheduled scoped screened secured selected served shaped shipped simplified sold solved spearheaded standardized
steered streamlined strengthened structured supervised supported surpassed sustained synthesized systematized
targeted taught tested tracked trained transformed translated tripled troubleshot tuned unified upgraded validated
verified visualized won wrote`.split(/\s+/));

const IRREGULAR_PRESENT = {
  lead: "led", build: "built", drive: "drove", run: "ran", write: "wrote", oversee: "oversaw", grow: "grew",
  sell: "sold", win: "won", teach: "taught", cut: "cut", make: "made", ship: "shipped", plan: "planned",
};

// Weak openers / filler phrases. `swap` is used by the local rewriter.
export const WEAK_PHRASES = [
  { re: /\bresponsible for\b/gi, label: "responsible for", tip: "Say what you did: “Led”, “Owned”, “Managed”." },
  { re: /\bduties (?:included|include)\b/gi, label: "duties included", tip: "List outcomes, not duties." },
  { re: /\btasked with\b/gi, label: "tasked with", tip: "Lead with the action you took." },
  { re: /\bworked on\b/gi, label: "worked on", tip: "Use a specific verb: built, designed, shipped." },
  { re: /\bhelped(?: to)?\b/gi, label: "helped", tip: "Clarify your part: “Contributed”, “Partnered”, or the exact action." },
  { re: /\bassisted (?:with|in)\b/gi, label: "assisted with", tip: "State what you personally did." },
  { re: /\b(?:was )?involved in\b/gi, label: "involved in", tip: "Name your role and its result." },
  { re: /\bparticipated in\b/gi, label: "participated in", tip: "Describe your contribution." },
  { re: /\bin charge of\b/gi, label: "in charge of", tip: "Use “Led” or “Managed”." },
  { re: /\bwas part of\b/gi, label: "was part of", tip: "Describe your specific contribution." },
  { re: /\butiliz(?:ed|e|ing)\b/gi, label: "utilized", tip: "“Used” is clearer." },
  { re: /\bvarious\b/gi, label: "various", tip: "Be specific: name them or count them." },
  { re: /\betc\.?(?=\s|$|,)/gi, label: "etc.", tip: "Finish the list or cut it." },
  { re: /\b(?:very|really|extremely|successfully)\b/gi, label: "filler adverb", tip: "Cut it; let results show quality." },
];

export const BUZZWORDS = [
  "team player", "hard working", "hard-working", "hardworking", "detail oriented", "detail-oriented",
  "results driven", "results-driven", "go-getter", "go getter", "self-starter", "self starter",
  "think outside the box", "synergy", "dynamic", "passionate", "highly motivated", "self-motivated",
  "fast learner", "quick learner", "proven track record", "rockstar", "ninja", "guru", "value add",
  "strategic thinker", "excellent communication skills", "out of the box", "best of breed", "go-to person",
  "dedicated professional", "seasoned professional", "results-oriented", "results oriented",
];

// Skills taxonomy. Order matters only for display.
export const SKILL_GROUPS = {
  "Languages": ["python", "java", "javascript", "typescript", "c++", "c#", "golang", "rust", "ruby", "php", "swift",
    "kotlin", "scala", "go", "sql", "html", "css", "bash", "matlab", "dart", "solidity", "perl"],
  "Frameworks": ["react", "react native", "angular", "vue", "next.js", "node.js", "express", "django", "flask",
    "fastapi", "spring", "spring boot", ".net", "rails", "laravel", "tailwind", "redux", "graphql", "rest api",
    "restful", "flutter", "jquery", "bootstrap", "svelte", "nestjs"],
  "Data & AI": ["pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras", "machine learning",
    "deep learning", "nlp", "computer vision", "data analysis", "data analytics", "data visualization", "tableau",
    "power bi", "excel", "statistics", "spark", "hadoop", "airflow", "etl", "llm", "llms", "generative ai",
    "openai", "langchain", "data science", "a/b testing", "big data", "snowflake", "dbt", "looker"],
  "Cloud & DevOps": ["aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ci/cd", "jenkins",
    "github actions", "git", "linux", "microservices", "serverless", "lambda", "nginx", "ansible", "devops",
    "observability", "prometheus", "grafana", "kafka", "rabbitmq", "grpc", "event streaming", "websockets"],
  "Databases": ["postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite", "dynamodb", "elasticsearch",
    "firebase", "supabase", "oracle", "cassandra", "nosql"],
  "Practices": ["agile", "scrum", "kanban", "tdd", "unit testing", "integration testing", "system design",
    "api design", "jira", "figma", "ux", "ui design", "user research", "accessibility", "security", "oauth",
    "code review", "performance optimization", "distributed systems"],
  "Business": ["project management", "product management", "stakeholder management", "budgeting", "forecasting",
    "crm", "salesforce", "hubspot", "seo", "sem", "content marketing", "digital marketing", "sales",
    "business development", "customer success", "customer service", "operations", "supply chain", "recruiting",
    "accounting", "financial modeling", "market research", "strategy", "negotiation", "procurement", "compliance"],
  "Soft skills": ["leadership", "communication", "collaboration", "mentoring", "problem solving", "problem-solving",
    "public speaking", "cross-functional", "teamwork", "time management", "critical thinking", "presentation"],
};

const SKILL_SYNONYMS = { postgres: "postgresql", "problem-solving": "problem solving", llms: "llm", restful: "rest api", golang: "go" };

const SKILL_INDEX = [];
for (const [group, list] of Object.entries(SKILL_GROUPS)) {
  for (const term of list) SKILL_INDEX.push({ term, group, re: termRegex(term) });
}

const STOPWORDS = new Set(`a about above after again against all also am an and any are as at be because been before
being below between both but by can could did do does doing down during each etc few for from further had has have
having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once
only or other our ours out over own same she should so some such than that the their theirs them then there these
they this those through to too under until up very was we were what when where which while who whom why will with
would you your yours within across per via using use used new well`.split(/\s+/));

// Words common in job descriptions that carry no matching signal.
const JD_NOISE = new Set(`experience experiences team teams work working ability able strong excellent good great
years year role roles company candidate candidates including include includes required requirements requirement
responsibilities responsibility preferred plus must will join looking help knowledge understanding skills skill
etc opportunity environment position job based minimum equivalent related field degree job ideal successful
apply applicants benefits salary location remote hybrid office day days time full part ensure provide support
across within other others best make makes building build world mission culture values like want need needs
develop developing new highly proven demonstrated familiarity familiar proficiency proficient hands-on hands
bonus nice qualifications qualification what who our we us you your they them about well
senior junior lead engineer engineers engineering developer developers manager platform scalable power powers
maintain design own services service improve`.split(/\s+/));

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,5}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/;
const LINKEDIN_RE = /linkedin\.com\/(?:in|pub)\/[\w%-]+/i;
const GITHUB_RE = /github\.com\/[\w-]+/i;
const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|io|dev|me|net|org|app|co|in|tech|site|xyz|ai)(?:\/[\w./%-]*)?\b/i;
const BULLET_RE = /^\s*(?:[•‣▪●◦⁃∙■□▸►➢✓✔❖◆*\-–—>]|o\s)\s*/;
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_PATTERNS = [
  { key: "Mon YYYY", re: new RegExp(`\\b(?:${MONTHS})\\.?\\s+(?:19|20)\\d{2}\\b`, "gi") },
  { key: "MM/YYYY", re: /\b(?:0?[1-9]|1[0-2])[/.-](?:19|20)\d{2}\b/g },
  { key: "YYYY-MM", re: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])\b/g },
];
const PASSIVE_RE = /\b(?:was|were|been|being|is|are|got)\s+(?:\w+ed|built|led|made|given|done|written|taken|chosen|run|shown|seen|known|held|sent|brought|taught)\b/gi;
const PRONOUN_RE = /(?<![\w'@.])(?:I|I'm|I've|I'd|I'll|[Mm]y|[Mm]yself|[Mm]e)(?![\w'@])/g;
const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|fifty|hundred|hundreds|thousand|thousands|million|millions|billion|dozens?|double|doubled|tripled|halved";
const METRIC_RE = new RegExp(
  `(?:[$€£₹]\\s?\\d[\\d,.]*\\s?(?:[kmb]|million|billion|lakh|crore)?\\b|\\b\\d[\\d,.]*\\s?(?:%|percent|x\\b|\\+|k\\b|m\\b|b\\b|ms\\b|s\\b|hrs?\\b|hours\\b|days\\b|weeks\\b|users\\b|customers\\b|clients\\b|people\\b|members\\b|engineers\\b|requests\\b|transactions\\b)|\\b(?:${NUMBER_WORDS})\\b|\\b\\d{2,}(?![\\d/-])\\b|\\btop\\s?\\d+)`,
  "gi",
);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termRegex(term) {
  return new RegExp(`(?<![a-z0-9+#])${escapeRegex(term.toLowerCase())}(?![a-z0-9+#])`, "i");
}

function termRegexGlobal(term) {
  return new RegExp(`(?<![A-Za-z0-9+#])${escapeRegex(term)}(?![A-Za-z0-9+#])`, "gi");
}

export function normalizeHeading(line) {
  return line
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function identifyHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 48) return null;
  const words = trimmed.split(/\s+/);
  if (words.length > 5) return null;
  const norm = normalizeHeading(trimmed);
  if (HEADING_LOOKUP.has(norm)) return HEADING_LOOKUP.get(norm);
  // "SKILLS & TOOLS", "Experience:" etc.
  const isShouty = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const endsWithColon = /:\s*$/.test(trimmed);
  if (isShouty || endsWithColon) {
    for (const [heading, key] of HEADING_LOOKUP) {
      if (norm.startsWith(heading + " ") || norm.endsWith(" " + heading)) return key;
    }
  }
  return null;
}

function isYearOnly(token) {
  return /^(?:19|20)\d{2}$/.test(token);
}

function hasMetric(text) {
  METRIC_RE.lastIndex = 0;
  let m;
  while ((m = METRIC_RE.exec(text))) {
    const tok = m[0].trim();
    if (isYearOnly(tok)) continue;
    // Skip numbers that are part of version strings or dates like 2021-2023.
    return true;
  }
  return false;
}

function firstWord(text) {
  const m = text.match(/^[^A-Za-z]*([A-Za-z][A-Za-z-]*)/);
  return m ? m[1].toLowerCase() : "";
}

export function isActionVerb(word) {
  if (!word) return false;
  const w = word.toLowerCase();
  if (ACTION_VERBS.has(w)) return true;
  if (IRREGULAR_PRESENT[w]) return true;
  // Present-tense forms for current roles: "build" -> "built" handled above, "manage" -> "managed", "design" -> "designed".
  if (ACTION_VERBS.has(w + "d") || ACTION_VERBS.has(w + "ed")) return true;
  if (w.endsWith("y") && ACTION_VERBS.has(w.slice(0, -1) + "ied")) return true;
  // "leads", "builds", "manages"
  if (w.endsWith("s")) return isActionVerb(w.slice(0, -1));
  // "shipped" style double consonant from "ship"
  if (ACTION_VERBS.has(w + w.slice(-1) + "ed")) return true;
  return false;
}

/** Split text into section blocks keyed by section id. */
export function detectSections(lines) {
  const sections = {};
  const order = [];
  let current = "_header";
  sections[current] = { key: current, heading: null, lines: [], start: 0 };
  lines.forEach((line, idx) => {
    const key = identifyHeading(line);
    if (key) {
      current = key;
      if (!sections[key]) {
        sections[key] = { key, heading: line.trim(), lines: [], start: idx };
        order.push(key);
      }
      return;
    }
    sections[current].lines.push(line);
  });
  return { sections, order };
}

/** Rebuild bullet points, merging wrapped continuation lines. */
export function extractBullets(blockLines) {
  const bullets = [];
  let current = null;
  for (const raw of blockLines) {
    const line = raw.trim();
    if (!line) {
      current = null;
      continue;
    }
    if (BULLET_RE.test(line)) {
      current = { text: line.replace(BULLET_RE, "").trim(), marked: true };
      bullets.push(current);
      continue;
    }
    const startsLower = /^[a-z(,&]/.test(line);
    if (current && (startsLower || !/[.!?:]$/.test(current.text)) && current.text.length < 220 && !looksLikeTitleLine(line)) {
      current.text += " " + line;
      continue;
    }
    current = null;
    const words = line.split(/\s+/).length;
    if (words >= 6 && !looksLikeTitleLine(line)) {
      current = { text: line, marked: false };
      bullets.push(current);
    }
  }
  return bullets.map((b) => b.text).filter((t) => t.split(/\s+/).length >= 3);
}

function looksLikeTitleLine(line) {
  // Role / company / date lines rather than achievement statements.
  if (DATE_PATTERNS.some((p) => new RegExp(p.re.source, "i").test(line))) return true;
  if (/\b(?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present|current|now)\b/i.test(line)) return true;
  if (/\|/.test(line) && line.split(/\s+/).length <= 12) return true;
  return false;
}

function extractContact(lines, fullText) {
  const head = lines.slice(0, 12).join("\n");
  const email = (fullText.match(EMAIL_RE) || [])[0] || null;
  let phone = null;
  for (const m of head.matchAll(new RegExp(PHONE_RE.source, "g"))) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && !/^(?:19|20)\d{2}(?:19|20)\d{2}$/.test(digits)) {
      phone = m[0].trim();
      break;
    }
  }
  const linkedin = (fullText.match(LINKEDIN_RE) || [])[0] || null;
  const github = (fullText.match(GITHUB_RE) || [])[0] || null;
  let website = null;
  for (const m of head.matchAll(new RegExp(URL_RE.source, "gi"))) {
    const v = m[0];
    if (email && email.includes(v.replace(/^https?:\/\//, ""))) continue;
    if (/linkedin|github/i.test(v)) continue;
    website = v;
    break;
  }
  const location = (head.match(/\b[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?, ?(?:[A-Z]{2}\b|[A-Z][a-z]+)/) || [])[0] || null;
  const nameLine = lines.find((l) => l.trim()) || "";
  const name = nameLine.split(/\s+/).length <= 5 && !EMAIL_RE.test(nameLine) && /[A-Za-z]/.test(nameLine)
    ? nameLine.trim()
    : null;
  return { name, email, phone, linkedin, github, website, location };
}

function findSkills(text) {
  const found = [];
  for (const s of SKILL_INDEX) {
    if (s.re.test(text)) found.push(s);
  }
  // Collapse synonyms.
  const dedupe = new Map();
  for (const s of found) {
    const canon = SKILL_SYNONYMS[s.term] || s.term;
    if (!dedupe.has(canon)) dedupe.set(canon, { ...s, term: canon });
  }
  return [...dedupe.values()];
}

function tokenizeWords(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#./-]*[a-z0-9+#]|[a-z]/g) || [])
    .map((t) => t.replace(/[./-]+$/, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !JD_NOISE.has(t));
}

export function extractJobKeywords(jd) {
  if (!jd || !jd.trim()) return [];
  const skills = findSkills(jd).map((s) => ({ term: s.term, weight: 3, kind: "skill" }));
  const skillTerms = new Set(skills.map((s) => s.term));
  const counts = new Map();
  for (const t of tokenizeWords(jd)) {
    if (isYearOnly(t) || /^\d/.test(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const extra = [...counts.entries()]
    .filter(([t, c]) => c >= 2 && ![...skillTerms].some((s) => s.includes(t)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([term, c]) => ({ term, weight: Math.min(2, 1 + (c >= 3 ? 1 : 0)), kind: "term" }));
  return [...skills, ...extra];
}

function analyzeJobMatch(resumeText, jd) {
  const keywords = extractJobKeywords(jd);
  if (!keywords.length) return null;
  const lowerResume = resumeText.toLowerCase();
  const matched = [];
  const missing = [];
  let earned = 0;
  let possible = 0;
  for (const k of keywords) {
    possible += k.weight;
    const re = termRegex(k.term);
    // Allow simple plural/stem matching for plain terms.
    const hit = re.test(lowerResume) || (k.kind === "term" && (termRegex(k.term.replace(/s$/, "")).test(lowerResume) || termRegex(k.term + "s").test(lowerResume)));
    if (hit) {
      matched.push(k);
      earned += k.weight;
    } else {
      missing.push(k);
    }
  }
  const yearsReq = (jd.match(/(\d{1,2})\+?\s*(?:\+\s*)?years?/i) || [])[1];
  const degreeReq = /\b(bachelor|master|phd|ph\.d|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech|mba|degree)\b/i.test(jd);
  const hasDegree = /\b(bachelor|master|phd|ph\.d|b\.?s\b|m\.?s\b|b\.?sc|m\.?sc|b\.?tech|m\.?tech|b\.?e\b|mba|associate|diploma|university|college)\b/i.test(resumeText);
  const score = Math.round((earned / Math.max(possible, 1)) * 100);
  return {
    score,
    matched,
    missing,
    yearsRequired: yearsReq ? Number(yearsReq) : null,
    degreeRequired: degreeReq,
    degreeFound: hasDegree,
  };
}

function detectDateFormats(text) {
  const formats = {};
  for (const p of DATE_PATTERNS) {
    const n = (text.match(p.re) || []).length;
    if (n) formats[p.key] = n;
  }
  return formats;
}

function countMatches(text, re) {
  re.lastIndex = 0;
  return (text.match(re) || []).length;
}

function collectMatches(text, re, limit = 6) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) && out.length < limit) out.push(m[0]);
  re.lastIndex = 0;
  return out;
}

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function gradeFor(score) {
  if (score >= 90) return { letter: "A+", label: "Outstanding", tone: "great" };
  if (score >= 80) return { letter: "A", label: "Strong", tone: "great" };
  if (score >= 70) return { letter: "B", label: "Good, with gaps", tone: "good" };
  if (score >= 60) return { letter: "C", label: "Needs work", tone: "warn" };
  if (score >= 45) return { letter: "D", label: "Needs major work", tone: "bad" };
  return { letter: "E", label: "Critical issues", tone: "bad" };
}

/**
 * Analyze a resume.
 * @param {string} rawText
 * @param {{ jobDescription?: string, pageCount?: number }} opts
 */
export function analyzeResume(rawText, opts = {}) {
  const jobDescription = (opts.jobDescription || "").trim();
  const text = (rawText || "").replace(/\r\n?/g, "\n").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
  const lines = text.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const estPages = opts.pageCount || Math.max(1, Math.round((wordCount / 500) * 10) / 10);

  const { sections, order } = detectSections(lines);
  const present = (key) => Boolean(sections[key] && sections[key].lines.some((l) => l.trim()));
  const contact = extractContact(nonEmpty, text);

  const bulletSourceKeys = ["experience", "projects", "leadership", "achievements"];
  let bullets = [];
  for (const k of bulletSourceKeys) if (sections[k]) bullets.push(...extractBullets(sections[k].lines));
  if (bullets.length < 3) bullets = extractBullets(lines);
  bullets = [...new Set(bullets)];

  const bulletStats = bullets.map((b) => {
    const fw = firstWord(b);
    const weak = WEAK_PHRASES.filter((w) => new RegExp(w.re.source, "i").test(b)).map((w) => w.label);
    return {
      text: b,
      words: b.split(/\s+/).length,
      firstWord: fw,
      actionVerb: isActionVerb(fw),
      quantified: hasMetric(b),
      weak,
    };
  });
  const nb = bulletStats.length;
  const quantifiedCount = bulletStats.filter((b) => b.quantified).length;
  const actionCount = bulletStats.filter((b) => b.actionVerb).length;
  const longBullets = bulletStats.filter((b) => b.words > 32);
  const shortBullets = bulletStats.filter((b) => b.words < 6);
  const quantRatio = nb ? quantifiedCount / nb : 0;
  const actionRatio = nb ? actionCount / nb : 0;

  // Verb repetition among bullet openers.
  const verbCounts = {};
  for (const b of bulletStats) if (b.actionVerb) verbCounts[b.firstWord] = (verbCounts[b.firstWord] || 0) + 1;
  const repeatedVerbs = Object.entries(verbCounts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);

  const weakHits = [];
  for (const w of WEAK_PHRASES) {
    const n = countMatches(text, w.re);
    if (n) weakHits.push({ ...w, count: n });
  }
  const weakTotal = weakHits.reduce((s, w) => s + w.count, 0);

  const buzzHits = [];
  for (const term of BUZZWORDS) {
    const n = countMatches(text, termRegexGlobal(term));
    if (n) buzzHits.push({ term, count: n });
  }
  const buzzTotal = buzzHits.reduce((s, b) => s + b.count, 0);

  const pronounCount = countMatches(text, PRONOUN_RE);
  const pronounSamples = collectMatches(text, PRONOUN_RE);
  const passiveCount = countMatches(text, PASSIVE_RE);
  const passiveSamples = collectMatches(text, PASSIVE_RE);

  const skillsFound = findSkills(text);
  const skillsByGroup = {};
  for (const s of skillsFound) (skillsByGroup[s.group] ||= []).push(s.term);

  const dateFormats = detectDateFormats(text);
  const dateFormatKinds = Object.keys(dateFormats);

  const weirdChars = (text.match(/[^\x00-\x7FÀ-ɏ–—‘’“”•€£₹…●▪◦➢✓✔]/g) || []).length;
  const weirdRatio = text.length ? weirdChars / text.length : 0;
  const longLines = nonEmpty.filter((l) => l.length > 180).length;
  const avgBulletWords = nb ? bulletStats.reduce((s, b) => s + b.words, 0) / nb : 0;

  const jobMatch = jobDescription ? analyzeJobMatch(text, jobDescription) : null;

  // ---------- Category scores ----------
  const impact = nb
    ? clamp(Math.round(
      48 * Math.min(1, quantRatio / 0.5) +
      34 * Math.min(1, actionRatio / 0.8) +
      18 * Math.max(0, 1 - weakTotal / 6),
    ))
    : 15;

  let structurePts = 0;
  structurePts += present("summary") ? 14 : 0;
  structurePts += present("experience") ? 30 : (present("projects") || present("leadership") ? 14 : 0);
  structurePts += present("education") ? 20 : 0;
  structurePts += present("skills") ? 20 : 0;
  structurePts += present("projects") ? 10 : 0;
  structurePts += order.some((k) => SECTION_DEFS[k]?.tier === "optional") ? 6 : 0;
  const structure = clamp(structurePts);

  let lengthScore;
  if (wordCount >= 350 && wordCount <= 850) lengthScore = 1;
  else if ((wordCount >= 250 && wordCount < 350) || (wordCount > 850 && wordCount <= 1100)) lengthScore = 0.7;
  else if ((wordCount >= 150 && wordCount < 250) || (wordCount > 1100 && wordCount <= 1400)) lengthScore = 0.4;
  else lengthScore = 0.1;

  const atsPts =
    (contact.email ? 22 : 0) +
    (contact.phone ? 16 : 0) +
    (contact.linkedin || contact.github || contact.website ? 12 : 0) +
    Math.min(order.length, 4) * 4 +
    lengthScore * 18 +
    (weirdRatio < 0.01 ? 8 : weirdRatio < 0.03 ? 4 : 0) +
    (longLines === 0 ? 4 : longLines < 3 ? 2 : 0) +
    (dateFormatKinds.length <= 1 ? 4 : 0);
  const ats = clamp(Math.round(atsPts));

  const style = clamp(Math.round(
    100 -
    Math.min(30, pronounCount * 5) -
    Math.min(24, passiveCount * 6) -
    Math.min(24, buzzTotal * 6) -
    Math.min(15, repeatedVerbs.length * 5) -
    Math.min(15, longBullets.length * 4) -
    (dateFormatKinds.length > 1 ? 6 : 0),
  ));

  const skillsScore = clamp(Math.round(
    (present("skills") ? 40 : 0) + 60 * Math.min(1, skillsFound.length / 12),
  ));

  const categories = [
    { key: "impact", label: "Impact", weight: 30, score: impact, blurb: "Quantified results, action verbs, no filler." },
    { key: "structure", label: "Structure", weight: 20, score: structure, blurb: "The sections recruiters look for." },
    { key: "ats", label: "ATS readiness", weight: 20, score: ats, blurb: "Contact info, length, parseable formatting." },
    { key: "style", label: "Writing style", weight: 15, score: style, blurb: "Concise, active, no clichés or pronouns." },
    { key: "skills", label: "Skills", weight: 15, score: skillsScore, blurb: "Breadth and visibility of your skills." },
  ];
  if (jobMatch) {
    for (const c of categories) c.weight = Math.round(c.weight * 0.75 * 100) / 100;
    categories.push({ key: "match", label: "Job match", weight: 25, score: jobMatch.score, blurb: "Keyword overlap with the target role." });
  }
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const overall = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);

  // ---------- Issues & strengths ----------
  const issues = [];
  const add = (severity, category, title, detail, fix, evidence = []) =>
    issues.push({ id: `${category}-${issues.length}`, severity, category, title, detail, fix, evidence });

  if (!contact.email) add("critical", "ats", "No email address found", "Recruiters and ATS systems need a way to reach you.", "Add a professional email at the top of the resume.");
  if (!contact.phone) add("warning", "ats", "No phone number found", "Many recruiters call before they email.", "Add a phone number with country code next to your email.");
  if (!contact.linkedin && !contact.github && !contact.website) add("warning", "ats", "No LinkedIn, GitHub, or portfolio link", "Profiles let recruiters verify your work quickly.", "Add your LinkedIn URL, plus GitHub or a portfolio if relevant.");

  if (!present("experience")) {
    add(present("projects") ? "warning" : "critical", "structure", "No Experience section detected",
      "ATS systems map your history from a heading like “Experience”.",
      "Add an “Experience” section (internships, freelance, and part-time work count).");
  }
  if (!present("skills")) add("critical", "structure", "No Skills section detected", "ATS keyword matching relies heavily on a dedicated skills list.", "Add a “Skills” section grouped by category (Languages, Tools, etc.).");
  if (!present("education")) add("warning", "structure", "No Education section detected", "Most job filters check for education.", "Add an “Education” section with degree, school, and dates.");
  if (!present("summary")) add("tip", "structure", "No summary at the top", "A 2–3 line summary frames who you are and what you want.", "Add a short Summary tailored to the role you are targeting.");
  if (!present("projects") && (!present("experience") || wordCount < 400)) add("tip", "structure", "No Projects section", "Projects are strong proof of skills, especially early in a career.", "Add 2–3 projects with the tech used and the outcome.");

  if (nb === 0) {
    add("critical", "impact", "No achievement bullet points found", "Dense paragraphs are hard to scan and parse.", "Break your experience into 3–6 bullets per role, each starting with an action verb.");
  } else {
    const unq = bulletStats.filter((b) => !b.quantified);
    if (quantRatio < 0.35) {
      add("critical", "impact", `Only ${quantifiedCount} of ${nb} bullets include a number`,
        "Numbers (%, $, time saved, users, team size) are the single strongest signal of impact.",
        "Add a metric to at least half of your bullets: how much, how many, how fast?",
        unq.slice(0, 4).map((b) => b.text));
    } else if (quantRatio < 0.5) {
      add("warning", "impact", `${Math.round(quantRatio * 100)}% of bullets are quantified`, "Strong resumes quantify roughly half their bullets or more.", "Add numbers to a few more bullets.", unq.slice(0, 3).map((b) => b.text));
    }
    const noVerb = bulletStats.filter((b) => !b.actionVerb);
    if (actionRatio < 0.7) {
      add(actionRatio < 0.4 ? "critical" : "warning", "impact", `${noVerb.length} bullets don’t start with an action verb`,
        "Opening with a strong verb makes ownership obvious at a glance.",
        "Start each bullet with a verb like Built, Led, Reduced, Launched.",
        noVerb.slice(0, 4).map((b) => b.text));
    }
  }
  if (weakHits.length) {
    add(weakTotal >= 4 ? "warning" : "tip", "impact", `Weak phrasing used ${weakTotal}×`,
      weakHits.map((w) => `“${w.label}”`).join(", ") + " dilute your impact.",
      weakHits[0].tip, bulletStats.filter((b) => b.weak.length).slice(0, 4).map((b) => b.text));
  }
  if (buzzHits.length) {
    add("warning", "style", `${buzzTotal} cliché${buzzTotal > 1 ? "s" : ""} found`,
      buzzHits.map((b) => `“${b.term}”`).join(", ") + " are claims without proof; recruiters skip them.",
      "Replace each with a concrete example that shows the trait.");
  }
  if (pronounCount >= 2) add("warning", "style", `First-person pronouns used ${pronounCount}×`, "Resumes are written in implied first person (no “I”, “my”).", "Drop the pronoun: “I built…” → “Built…”.", pronounSamples);
  if (passiveCount >= 2) add("tip", "style", `Passive voice used ${passiveCount}×`, "Passive phrasing hides who did the work.", "Rewrite in active voice: “was improved by me” → “Improved”.", passiveSamples);
  if (repeatedVerbs.length) add("tip", "style", "Repetitive bullet openers", repeatedVerbs.map(([v, c]) => `“${v}” ×${c}`).join(", ") + ".", "Vary your verbs to show range (e.g. Developed → Engineered, Shipped, Architected).");
  if (longBullets.length) add("tip", "style", `${longBullets.length} bullet${longBullets.length > 1 ? "s are" : " is"} too long`, "Bullets over ~30 words get skimmed past.", "Keep bullets to 1–2 lines: action, what, result.", longBullets.slice(0, 3).map((b) => b.text));
  if (dateFormatKinds.length > 1) add("tip", "ats", "Inconsistent date formats", `Mixed formats: ${dateFormatKinds.join(", ")}.`, "Pick one format (e.g. “Jan 2024”) and use it everywhere.");
  if (wordCount < 250) add("warning", "ats", `Resume is short (${wordCount} words)`, "Thin resumes under-sell you and give ATS little to match.", "Expand with achievements, projects, and skills: aim for 400–800 words.");
  else if (wordCount > 1100) add("warning", "ats", `Resume is long (${wordCount} words)`, "Recruiters spend seconds on the first pass.", "Trim older or low-impact content: aim for 1 page (2 if very senior).");
  if (weirdRatio >= 0.01) add("warning", "ats", "Unusual characters detected", "Icons, special fonts, or symbols may not parse in ATS software.", "Use standard fonts and plain text for contact details and headings.");
  if (skillsFound.length < 6) add("warning", "skills", `Only ${skillsFound.length} recognizable skills`, "ATS ranks resumes by keyword coverage.", "List the tools, technologies, and methods you actually use.");

  if (jobMatch) {
    const topMissing = jobMatch.missing.sort((a, b) => b.weight - a.weight).slice(0, 10);
    if (jobMatch.score < 50) add("critical", "match", `Low job match (${jobMatch.score}%)`, "Your resume is missing many of the terms in the job description.", "Mirror the posting’s exact wording for skills you genuinely have.", topMissing.map((k) => k.term));
    else if (jobMatch.score < 75) add("warning", "match", `Moderate job match (${jobMatch.score}%)`, "Some key terms from the posting are missing.", "Work the missing keywords into your skills and bullets where truthful.", topMissing.map((k) => k.term));
    if (jobMatch.degreeRequired && !jobMatch.degreeFound) add("warning", "match", "The job mentions a degree", "We couldn’t find a degree in your resume.", "Make your education explicit, or highlight equivalent experience.");
  }

  const severityRank = { critical: 0, warning: 1, tip: 2 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const strengths = [];
  if (contact.email && contact.phone && (contact.linkedin || contact.github || contact.website)) strengths.push("Complete contact details with a professional profile link.");
  if (quantRatio >= 0.5 && nb) strengths.push(`${Math.round(quantRatio * 100)}% of bullets are quantified: great evidence of impact.`);
  if (actionRatio >= 0.8 && nb) strengths.push("Bullets consistently open with strong action verbs.");
  if (["summary", "experience", "education", "skills"].every(present)) strengths.push("All core sections are present and clearly labelled.");
  if (skillsFound.length >= 12) strengths.push(`${skillsFound.length} recognizable skills: strong keyword coverage.`);
  if (!buzzTotal && pronounCount < 2) strengths.push("Clean, cliché-free writing in implied first person.");
  if (lengthScore === 1) strengths.push(`Well-sized at ${wordCount} words.`);
  if (jobMatch && jobMatch.score >= 75) strengths.push(`Strong alignment with the job description (${jobMatch.score}%).`);

  const sectionList = Object.entries(SECTION_DEFS).map(([key, def]) => ({
    key,
    label: def.label,
    tier: def.tier,
    present: present(key),
    heading: sections[key]?.heading || null,
    wordCount: sections[key] ? sections[key].lines.join(" ").split(/\s+/).filter(Boolean).length : 0,
    text: sections[key] ? sections[key].lines.join("\n").trim() : "",
  }));

  return {
    version: 2,
    score: overall,
    grade: gradeFor(overall),
    categories,
    issues,
    strengths,
    contact,
    sections: sectionList,
    sectionOrder: order,
    stats: {
      wordCount,
      estPages,
      bulletCount: nb,
      quantifiedCount,
      quantRatio,
      actionCount,
      actionRatio,
      avgBulletWords: Math.round(avgBulletWords * 10) / 10,
      pronounCount,
      passiveCount,
      buzzTotal,
      weakTotal,
      skillsCount: skillsFound.length,
      readingTimeSec: Math.round((wordCount / 238) * 60),
    },
    bullets: bulletStats,
    skills: { found: skillsFound.map((s) => s.term), byGroup: skillsByGroup },
    jobMatch,
    weakHits: weakHits.map(({ label, count, tip }) => ({ label, count, tip })),
    buzzHits,
    repeatedVerbs,
    dateFormats,
  };
}

/** Character ranges to highlight in the resume preview. */
export function buildHighlights(text, analysis) {
  const spans = [];
  const lineAt = (idx) => {
    const s = text.lastIndexOf("\n", idx - 1) + 1;
    const e = text.indexOf("\n", idx);
    return text.slice(s, e === -1 ? text.length : e);
  };
  // Contact and date lines are full of digits that aren't achievements.
  const isMetaLine = (line) => EMAIL_RE.test(line) || /\(\d{3}\)|\+\d/.test(line) || looksLikeTitleLine(line);
  const push = (re, type, title) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (type === "metric" && (isYearOnly(m[0].trim()) || isMetaLine(lineAt(m.index)))) continue;
      spans.push({ start: m.index, end: m.index + m[0].length, type, title });
    }
  };
  for (const w of WEAK_PHRASES) push(new RegExp(w.re.source, "gi"), "weak", w.tip);
  for (const b of BUZZWORDS) push(termRegexGlobal(b), "buzz", "Cliché: replace with evidence");
  push(new RegExp(PRONOUN_RE.source, "g"), "pronoun", "Drop first-person pronouns");
  push(new RegExp(PASSIVE_RE.source, "gi"), "passive", "Passive voice: rewrite actively");
  push(new RegExp(METRIC_RE.source, "gi"), "metric", "Quantified result: nice");
  // Action verbs at line/bullet starts.
  const lineStart = /(^|\n)[^\S\n]*(?:[•●▪◦*\-–—>]\s*)?([A-Za-z]+)/g;
  let m;
  while ((m = lineStart.exec(text))) {
    const word = m[2];
    if (isActionVerb(word) && !identifyHeading(lineAt(m.index + m[0].length - 1))) {
      const start = m.index + m[0].length - word.length;
      spans.push({ start, end: start + word.length, type: "verb", title: "Strong action verb" });
    }
  }
  if (analysis?.jobMatch) {
    for (const k of analysis.jobMatch.matched) push(termRegexGlobal(k.term), "keyword", "Matches the job description");
  }
  // Resolve overlaps: priority order, earliest wins.
  const priority = { weak: 0, buzz: 1, pronoun: 2, passive: 3, keyword: 4, verb: 5, metric: 6 };
  spans.sort((a, b) => a.start - b.start || priority[a.type] - priority[b.type] || b.end - a.end);
  const out = [];
  let cursor = -1;
  for (const s of spans) {
    if (s.start >= cursor) {
      out.push(s);
      cursor = s.end;
    }
  }
  return out;
}

const REWRITE_RULES = [
  [/^responsible for (managing|leading|overseeing)\s+/i, "Managed "],
  [/^responsible for (developing|building|creating)\s+/i, "Built "],
  [/^responsible for (designing)\s+/i, "Designed "],
  [/^responsible for (\w+ing)\s+/i, (_, g) => cap(gerundToPast(g)) + " "],
  [/^responsible for\s+/i, "Owned "],
  [/^(?:was )?in charge of\s+/i, "Led "],
  [/^duties included\s+/i, ""],
  [/^tasked with (\w+ing)\s+/i, (_, g) => cap(gerundToPast(g)) + " "],
  [/^worked on (building|developing|creating)\s+/i, "Built "],
  [/^worked on\s+/i, "Contributed to "],
  [/^helped (?:to )?(?=(?:the|a|an|with|in|on|our|my)\b)/i, "Supported "],
  [/^helped (?:to )?/i, "Collaborated to "],
  [/^assisted (?:with|in)\s+/i, "Supported "],
  [/^(?:was )?involved in\s+/i, "Contributed to "],
  [/^participated in\s+/i, "Contributed to "],
  [/^was part of\s+/i, "Collaborated on "],
  [/^(?:i |we )/i, ""],
];

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function gerundToPast(g) {
  const base = g.toLowerCase().replace(/ing$/, "");
  const irregular = {
    build: "built", lead: "led", runn: "ran", writ: "wrote", driv: "drove", mak: "made", grow: "grew",
    teach: "taught", do: "did", sell: "sold", oversee: "oversaw", tak: "took", giv: "gave", hold: "held",
  };
  if (irregular[base]) return irregular[base];
  // managing -> managed, planning -> planned, creating -> created
  return base + "ed";
}

/** Rule-based rewrite for a single bullet. No AI required. */
export function quickRewrite(bullet) {
  let text = bullet.trim().replace(BULLET_RE, "");
  const changes = [];
  for (const [re, rep] of REWRITE_RULES) {
    if (re.test(text)) {
      const before = text;
      text = text.replace(re, rep);
      text = cap(text.replace(/^\s+/, ""));
      if (text !== before) changes.push("Replaced a weak opener with an action verb");
      break;
    }
  }
  // "Fixing bugs and writing docs" -> "Fixed bugs and wrote docs"
  if (/^[A-Za-z]+ing\b/.test(text)) {
    text = text.replace(/^([A-Za-z]+ing)\b/, (g) => cap(gerundToPast(g)));
    text = text.replace(/\b(and|,)\s+([a-z]+ing)\b/g, (_, j, g) => `${j} ${gerundToPast(g)}`);
    changes.push("Converted to past-tense action verbs");
  }
  text = text.replace(/\butiliz(ed|e|ing)\b/gi, (_, s) => ({ ed: "used", e: "use", ing: "using" })[s.toLowerCase()]);
  const beforeFiller = text;
  text = text.replace(/\b(?:very|really|extremely|successfully)\s+/gi, "");
  if (beforeFiller !== text) changes.push("Removed filler words");
  text = text.replace(/\s*,?\s*etc\.?$/i, "").replace(/\s{2,}/g, " ").trim();
  const fw = firstWord(text);
  if (fw && !isActionVerb(fw) && /^[a-z]/i.test(fw)) changes.push("Consider opening with an action verb");
  let needsMetric = false;
  if (!hasMetric(text)) {
    needsMetric = true;
    changes.push("Add a metric: how many, how much, or how fast?");
  }
  text = cap(text.replace(/[.;]+$/, ""));
  return { original: bullet, rewritten: text, changes, needsMetric };
}
