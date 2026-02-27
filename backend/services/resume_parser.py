import re
import json
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

try:
    import pymupdf                       # pymupdf >= 1.23 (fitz renamed)
except ImportError:
    import fitz as pymupdf               # older versions exposed as fitz

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# Load env for GEMINI_API_KEY
load_dotenv()

# ─── Section heading patterns (REGEX Fallback) ────────────────────────────────
SECTION_PATTERNS = {
    "skills": re.compile(
        r"^\s*(technical\s+skills?|skills?\s*(&|and)?\s*(summary)?|"
        r"core\s+competenc(y|ies)|technologies|tools?\s*&?\s*technologies?|"
        r"programming\s+languages?|key\s+skills?)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "experience": re.compile(
        r"^\s*(work\s+experience|professional\s+experience|employment(\s+history)?|"
        r"experience|internship(s)?|work\s+history|career\s+history)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "projects": re.compile(
        r"^\s*(projects?|personal\s+projects?|academic\s+projects?|"
        r"side\s+projects?|notable\s+projects?|selected\s+projects?)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
}

GENERIC_SECTION_HEADING = re.compile(
    r"^\s*(education|certifications?|awards?|achievements?|honours?|"
    r"publications?|references?|languages?|hobbies|interests?|"
    r"volunteer|activities|summary|objective|profile|contact|"
    r"accomplishments?|leadership)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)


# ─── Enhanced Text extraction ──────────────────────────────────────────────────

def extract_raw_text(pdf_path: str = None, pdf_bytes: bytes = None) -> tuple[str, dict]:
    """
    Open a PDF and return:
      - full concatenated text (str)
      - metadata dict
    Uses block analysis to handle multi-column layouts.
    """
    if pdf_bytes:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    else:
        doc = pymupdf.open(pdf_path)

    full_text_parts = []

    for page in doc:
        # Get text blocks: (x0, y0, x1, y1, "text", block_no, block_type)
        blocks = page.get_text("blocks")
        
        # Sort blocks: Primary by top-y (row), Secondary by left-x (column)
        # We allow a 5pt tolerance for "same row" to handle minor misalignments
        blocks.sort(key=lambda b: (b[1] // 5, b[0]))
        
        page_text = "\n".join([b[4].strip() for b in blocks if b[4].strip()])
        full_text_parts.append(page_text)

    full_text = "\n\n".join(full_text_parts)

    metadata = {
        "title":      doc.metadata.get("title", ""),
        "author":     doc.metadata.get("author", ""),
        "page_count": doc.page_count,
        "file_name":  Path(pdf_path).name if pdf_path else "upload.pdf",
    }

    doc.close()
    return full_text, metadata


# ─── Gemini LLM Parser ────────────────────────────────────────────────────────

def parse_with_gemini(raw_text: str) -> dict:
    """Extract structured data using Gemini 2.5 Flash."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key or not HAS_GENAI:
        raise ValueError("Gemini API key not found or google-genai not installed.")

    client = genai.Client(api_key=api_key)
    
    system_prompt = (
        "You are an expert resume parser. Your task is to extract structured information "
        "from resume text. Focus on accuracy and complete extraction of details."
    )

    user_prompt = (
        "Extract structured JSON from the following resume text. "
        "Return ONLY valid JSON in this structure:\n"
        "{\n"
        '  "skills": ["Skill 1", "Skill 2"],\n'
        '  "experience": [\n'
        '    {"title": "Role", "company": "Company", "duration": "Dates", "description": "Details"}\n'
        '  ],\n'
        '  "projects": [\n'
        '    {"name": "Project Name", "technologies": ["Tech 1"], "description": "Details"}\n'
        '  ]\n'
        "}\n\n"
        f"Resume Text:\n{raw_text[:8000]}" # Limit to 8k chars to avoid token issues
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            config=types.GenerateContentConfig(system_instruction=system_prompt),
            contents=user_prompt,
        )
        
        text = response.text.strip()
        # Clean markdown fences
        if text.startswith('```'):
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
        
        return json.loads(text)
    except Exception as e:
        print(f"[Gemini Parser Error] {e}")
        return None


# ─── Regex Fallback Parser ────────────────────────────────────────────────────

def _find_section_spans(text: str) -> dict[str, tuple[int, int]]:
    lines = text.split("\n")
    offset = 0
    heading_positions = []

    for line in lines:
        line_len = len(line) + 1
        for section_name, pattern in SECTION_PATTERNS.items():
            if pattern.match(line):
                heading_positions.append((offset, section_name))
                break
        else:
            if GENERIC_SECTION_HEADING.match(line):
                heading_positions.append((offset, "__other__"))
        offset += line_len

    spans = {}
    for i, (start_pos, name) in enumerate(heading_positions):
        if name == "__other__": continue
        try:
            content_start = start_pos + text[start_pos:].index("\n") + 1
        except ValueError: continue
        
        if i + 1 < len(heading_positions):
            content_end = heading_positions[i + 1][0]
        else:
            content_end = len(text)
        spans[name] = (content_start, content_end)
    return spans

def parse_regex_fallback(raw_text: str) -> dict:
    """Original regex-based parsing logic as a fallback."""
    spans = _find_section_spans(raw_text)
    
    def get_section(name):
        if name not in spans: return ""
        start, end = spans[name]
        return raw_text[start:end].strip()

    skills_raw = get_section("skills")
    exp_raw = get_section("experience")
    proj_raw = get_section("projects")

    # Original Helper Parsers
    def _parse_skills(raw):
        normalised = re.sub(r"[•●▪▸►\-–|/]", ",", raw)
        tokens = [t.strip() for t in re.split(r"[,\n]+", normalised)]
        return [t for t in tokens if 1 < len(t) < 60 and not t.isdigit()]

    def _parse_exp(raw):
        blocks = re.split(r"\n{2,}", raw.strip())
        entries = []
        date_pat = re.compile(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,.-]+(\d{4})\s*[-–to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current)?[a-z]*[\s,.-]*(\d{4})?", re.I)
        for b in blocks:
            lines = [l.strip() for l in b.split("\n") if l.strip()]
            if not lines: continue
            dm = date_pat.search(b)
            header = lines[0]
            split = re.split(r"\s+(?:at|@|\||-)\s+", header, maxsplit=1, flags=re.I)
            entries.append({
                "title": split[0].strip() if split else header,
                "company": split[1].strip() if len(split) > 1 else "",
                "duration": dm.group(0).strip() if dm else "",
                "description": " ".join([l for l in lines[1:] if not date_pat.search(l)]).strip()
            })
        return entries

    def _parse_proj(raw):
        blocks = re.split(r"\n{2,}", raw.strip())
        entries = []
        for b in blocks:
            lines = [l.strip() for l in b.split("\n") if l.strip()]
            if not lines: continue
            tm = re.search(r"(?:Tech(?:nologies)?[:\s]+|Built\s+with[:\s]+|\()([\w\s,./+#-]+)\)?", b, re.I)
            entries.append({
                "name": lines[0],
                "technologies": [t.strip() for t in tm.group(1).split(",") if t.strip()] if tm else [],
                "description": " ".join([l for l in lines[1:] if not (tm and tm.group(0).strip() in l)]).strip()
            })
        return entries

    return {
        "skills": _parse_skills(skills_raw) if skills_raw else [],
        "experience": _parse_exp(exp_raw) if exp_raw else [],
        "projects": _parse_proj(proj_raw) if proj_raw else []
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def parse_resume(pdf_path: str = None, pdf_bytes: bytes = None, filename: str = "upload.pdf") -> dict:
    """Unified entry point for parsing resumes."""
    raw_text, metadata = extract_raw_text(pdf_path, pdf_bytes)
    if pdf_path: metadata["file_name"] = Path(pdf_path).name
    elif filename: metadata["file_name"] = filename

    # Primary: Gemini
    structured = None
    if os.getenv('GEMINI_API_KEY'):
        structured = parse_with_gemini(raw_text)
    
    # Fallback: Regex
    if not structured:
        print("[Resume Parser] Using Regex Fallback")
        structured = parse_regex_fallback(raw_text)

    return {
        "metadata": metadata,
        "raw_text": raw_text,
        "skills": structured.get("skills", []),
        "experience": structured.get("experience", []),
        "projects": structured.get("projects", []),
    }

def parse_resume_from_bytes(pdf_bytes: bytes, filename: str = "upload.pdf") -> dict:
    """Backward compatibility wrapper."""
    return parse_resume(pdf_bytes=pdf_bytes, filename=filename)


# ─── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python resume_parser.py <path_to_resume.pdf>")
        sys.exit(1)

    pdf_file = sys.argv[1]
    print(f"\n📄 Parsing: {pdf_file}\n{'─' * 50}")

    try:
        result = parse_resume(pdf_file)
        # Pretty-print JSON
        output = {k: v for k, v in result.items() if k != "raw_text"}
        print(json.dumps(output, indent=2, ensure_ascii=False))
        print(f"\n{'─' * 50}")
        print(f"✅ Skills: {len(result['skills'])} | Exp: {len(result['experience'])} | Proj: {len(result['projects'])}")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
