// Extract text from PDF / DOCX / TXT entirely in the browser.
const PDFJS_VERSION = "3.11.174";
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
const MAMMOTH_URL = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ".pdf,.docx,.txt,.md";

const loaded = new Map();
function loadScript(src) {
  if (loaded.has(src)) return loaded.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      loaded.delete(src);
      reject(new Error("Could not load the document parser. Check your internet connection."));
    };
    document.head.appendChild(s);
  });
  loaded.set(src, p);
  return p;
}

async function parsePdf(buffer) {
  await loadScript(PDFJS_URL);
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Group text items into lines by their baseline (y), then order by x.
    const rows = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) {
        continue;
      }
      const [, , , , x, y] = item.transform;
      const h = item.height || 10;
      let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, h * 0.45));
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, w: item.width, str: item.str });
    }
    rows.sort((a, b) => b.y - a.y);
    const lines = rows.map((r) => {
      r.items.sort((a, b) => a.x - b.x);
      let line = "";
      let lastEnd = null;
      for (const it of r.items) {
        if (lastEnd !== null) {
          const gap = it.x - lastEnd;
          if (gap > 18) line += "  |  ";
          else if (gap > 1.5 && !line.endsWith(" ") && !it.str.startsWith(" ")) line += " ";
        }
        line += it.str;
        lastEnd = it.x + (it.w || 0);
      }
      return line.replace(/\s+\|\s+\|\s+/g, " | ").trim();
    });
    // Insert blank lines where vertical gaps are large (section breaks).
    const out = [];
    for (let j = 0; j < rows.length; j++) {
      if (j > 0 && rows[j - 1].y - rows[j].y > 22) out.push("");
      out.push(lines[j]);
    }
    pages.push(out.join("\n"));
  }
  return { text: pages.join("\n\n"), pageCount: doc.numPages };
}

async function parseDocx(buffer) {
  await loadScript(MAMMOTH_URL);
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: result.value, pageCount: null };
}

export async function extractText(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error("That file is over 10 MB. Please upload a smaller file.");
  const name = file.name.toLowerCase();
  let result;
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    result = await parsePdf(await file.arrayBuffer());
  } else if (name.endsWith(".docx")) {
    result = await parseDocx(await file.arrayBuffer());
  } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    result = { text: await file.text(), pageCount: null };
  } else if (name.endsWith(".doc")) {
    throw new Error("Old .doc files aren’t supported. Save it as PDF or DOCX and try again.");
  } else {
    throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
  }
  const text = (result.text || "").replace(/\u0000/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.split(/\s+/).length < 30) {
    throw new Error("We couldn’t find readable text. If this is a scanned PDF, export it with selectable text, or paste the text instead.");
  }
  return { text, pageCount: result.pageCount };
}
