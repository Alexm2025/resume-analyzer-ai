import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeResume, quickRewrite, buildHighlights, identifyHeading, isActionVerb } from "../web/js/analyzer.js";
import { SAMPLE_RESUME, SAMPLE_JD } from "../web/js/sample.js";

test("sample resume produces a sane report", () => {
  const a = analyzeResume(SAMPLE_RESUME);
  assert.ok(a.score > 40 && a.score < 95, `score ${a.score}`);
  assert.equal(a.contact.email, "jordan.rivera@example.com");
  assert.equal(a.contact.location, "Austin, TX");
  assert.ok(a.contact.linkedin);
  assert.deepEqual(a.sectionOrder, ["summary", "experience", "projects", "education", "skills"]);
  assert.ok(a.stats.bulletCount >= 10);
  assert.ok(a.issues.some((i) => i.category === "style" && /clich/i.test(i.title)));
  assert.ok(a.skills.found.includes("postgresql"));
  assert.ok(!a.skills.found.includes("postgresqlql"));
});

test("job description matching finds gaps", () => {
  const a = analyzeResume(SAMPLE_RESUME, { jobDescription: SAMPLE_JD });
  assert.ok(a.jobMatch);
  const missing = a.jobMatch.missing.map((k) => k.term);
  const matched = a.jobMatch.matched.map((k) => k.term);
  assert.ok(missing.includes("kubernetes"));
  assert.ok(matched.includes("python"));
  assert.ok(a.categories.some((c) => c.key === "match"));
});

test("empty-ish resume is flagged as critical", () => {
  const a = analyzeResume("John Smith\nI like computers and I want a job.");
  assert.ok(a.score < 40);
  assert.ok(a.issues.filter((i) => i.severity === "critical").length >= 2);
});

test("headings and verbs", () => {
  assert.equal(identifyHeading("WORK EXPERIENCE"), "experience");
  assert.equal(identifyHeading("Skills & Tools"), "skills");
  assert.equal(identifyHeading("Built a thing for customers"), null);
  assert.ok(isActionVerb("Built"));
  assert.ok(isActionVerb("manage"));
  assert.ok(isActionVerb("leads"));
  assert.ok(!isActionVerb("responsible"));
});

test("quick rewrite fixes weak openers", () => {
  assert.equal(quickRewrite("Responsible for managing the release process").rewritten, "Managed the release process");
  assert.equal(quickRewrite("Helped the team with testing").rewritten, "Supported the team with testing");
  assert.equal(quickRewrite("Duties included fixing bugs and writing documentation").rewritten, "Fixed bugs and wrote documentation");
  assert.ok(quickRewrite("Worked on the API").needsMetric);
  assert.equal(quickRewrite("Cut costs by 30%").needsMetric, false);
});

test("highlights never overlap", () => {
  const a = analyzeResume(SAMPLE_RESUME, { jobDescription: SAMPLE_JD });
  const spans = buildHighlights(SAMPLE_RESUME, a);
  assert.ok(spans.length > 10);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i].start >= spans[i - 1].end);
});
