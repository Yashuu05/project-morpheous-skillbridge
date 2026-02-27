"""
resume_parser.py
────────────────
Resume PDF parser using PyMuPDF (pymupdf).

Extracts three key sections from a resume:
  • Skills
  • Experience
  • Projects

Usage (standalone):
    python resume_parser.py path/to/resume.pdf

Usage (as a module):
    from services.resume_parser import parse_resume
    result = parse_resume("path/to/resume.pdf")
    # result is a dict with keys: raw_text, skills, experience, projects, metadata
"""

import re
import json
import sys
from pathlib import Path

try:
    import pymupdf                       # pymupdf >= 1.23 (fitz renamed)
except ImportError:
    import fitz as pymupdf               # older versions exposed as fitz


# ─── Section heading patterns ─────────────────────────────────────────────────
# These regex patterns match common resume section headings (case-insensitive).
# Order matters: more specific patterns should come before generic ones.

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

# Headings that signal the START of a NEW (untracked) section — used to stop
# collecting content for the current section.
GENERIC_SECTION_HEADING = re.compile(
    r"^\s*(education|certifications?|awards?|achievements?|honours?|"
    r"publications?|references?|languages?|hobbies|interests?|"
    r"volunteer|activities|summary|objective|profile|contact|"
    r"accomplishments?|leadership)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)


# ─── Text extraction ──────────────────────────────────────────────────────────

def extract_raw_text(pdf_path: str) -> tuple[str, dict]:
    """
    Open a PDF with PyMuPDF and return:
      - full concatenated text (str)
      - metadata dict (title, author, page_count)
    """
    doc = pymupdf.open(pdf_path)
    pages_text = []

    for page in doc:
        # Use "text" mode — plain UTF-8, preserves line breaks
        pages_text.append(page.get_text("text"))

    full_text = "\n".join(pages_text)

    metadata = {
        "title":      doc.metadata.get("title", ""),
        "author":     doc.metadata.get("author", ""),
        "page_count": doc.page_count,
        "file_name":  Path(pdf_path).name,
    }

    doc.close()
    return full_text, metadata


# ─── Section splitter ─────────────────────────────────────────────────────────

def _find_section_spans(text: str) -> dict[str, tuple[int, int]]:
    """
    Scan through the text line by line and record (start, end) character
    positions for each tracked section.

    Returns a dict like:
        { "skills": (120, 450), "experience": (451, 900), "projects": (901, 1200) }
    """
    lines = text.split("\n")
    # Build list of (char_offset, heading_name) for every heading found
    offset = 0
    heading_positions: list[tuple[int, str]] = []

    for line in lines:
        line_len = len(line) + 1   # +1 for the '\n'
        for section_name, pattern in SECTION_PATTERNS.items():
            if pattern.match(line):
                heading_positions.append((offset, section_name))
                break
        else:
            # Check generic headings (to act as terminators)
            if GENERIC_SECTION_HEADING.match(line):
                heading_positions.append((offset, "__other__"))
        offset += line_len

    # Now compute spans for tracked sections
    spans: dict[str, tuple[int, int]] = {}
    for i, (start_pos, name) in enumerate(heading_positions):
        if name == "__other__":
            continue
        # Content starts after this heading line
        content_start = start_pos + text[start_pos:].index("\n") + 1
        # Content ends at the next ANY heading (or end of text)
        if i + 1 < len(heading_positions):
            next_heading_pos = heading_positions[i + 1][0]
            content_end = next_heading_pos
        else:
            content_end = len(text)
        spans[name] = (content_start, content_end)

    return spans


# ─── Skills parser ────────────────────────────────────────────────────────────

def parse_skills(raw: str) -> list[str]:
    """
    Convert a raw skills block into a clean list of individual skill tokens.
    Handles comma / bullet / pipe / newline separated lists.
    """
    # Replace common separators with commas
    normalised = re.sub(r"[•●▪▸►\-–|/]", ",", raw)
    tokens = [t.strip() for t in re.split(r"[,\n]+", normalised)]
    # Drop empty strings and very long pseudo-sentences
    skills = [t for t in tokens if 1 < len(t) < 60 and not t.isdigit()]
    return skills


# ─── Experience parser ────────────────────────────────────────────────────────

_DATE_PATTERN = re.compile(
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,.-]+"
    r"(\d{4})\s*[-–to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current)?[a-z]*[\s,.-]*(\d{4})?",
    re.IGNORECASE,
)


def parse_experience(raw: str) -> list[dict]:
    """
    Split experience block into individual job entries.
    Each entry is a dict: { title, company, duration, description }
    """
    # Split on blank lines or lines that look like new job headers
    blocks = re.split(r"\n{2,}", raw.strip())
    entries = []

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue

        date_match = _DATE_PATTERN.search(block)
        duration = date_match.group(0).strip() if date_match else ""

        # Heuristic: first line = job title/company
        header = lines[0]
        # Try to split "Title at/@ Company" or "Title | Company"
        company_split = re.split(r"\s+(?:at|@|\||-)\s+", header, maxsplit=1, flags=re.IGNORECASE)
        title   = company_split[0].strip() if company_split else header
        company = company_split[1].strip() if len(company_split) > 1 else ""

        description_lines = lines[1:]
        # Remove the date line from description if already captured
        if date_match:
            description_lines = [
                l for l in description_lines
                if not _DATE_PATTERN.search(l)
            ]
        description = " ".join(description_lines).strip()

        entries.append({
            "title":       title,
            "company":     company,
            "duration":    duration,
            "description": description,
        })

    return entries


# ─── Projects parser ──────────────────────────────────────────────────────────

def parse_projects(raw: str) -> list[dict]:
    """
    Split projects block into individual project entries.
    Each entry: { name, technologies, description }
    """
    blocks = re.split(r"\n{2,}", raw.strip())
    entries = []

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue

        name = lines[0]

        # Look for a tech stack hint: "Tech: X, Y" or "(Python, Flask)"
        tech_match = re.search(
            r"(?:Tech(?:nologies)?[:\s]+|Built\s+with[:\s]+|\()([\w\s,./+#-]+)\)?",
            block,
            re.IGNORECASE,
        )
        technologies = [t.strip() for t in tech_match.group(1).split(",") if t.strip()] if tech_match else []

        desc_lines = lines[1:]
        if tech_match:
            desc_lines = [l for l in desc_lines if tech_match.group(0).strip() not in l]
        description = " ".join(desc_lines).strip()

        entries.append({
            "name":         name,
            "technologies": technologies,
            "description":  description,
        })

    return entries


# ─── Main public API ──────────────────────────────────────────────────────────

def parse_resume(pdf_path: str) -> dict:
    """
    Parse a resume PDF and return a structured JSON-friendly dict.

    Returns:
    {
        "metadata": { "file_name", "page_count", "title", "author" },
        "raw_text": "...",  # full extracted text
        "skills":     [ "Python", "React", ... ],
        "experience": [ { "title", "company", "duration", "description" }, ... ],
        "projects":   [ { "name", "technologies", "description" }, ... ]
    }
    """
    if not Path(pdf_path).exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    # 1. Extract raw text + metadata
    raw_text, metadata = extract_raw_text(pdf_path)

    # 2. Locate section spans
    spans = _find_section_spans(raw_text)

    # 3. Parse each section
    def get_section(name: str) -> str:
        if name not in spans:
            return ""
        start, end = spans[name]
        return raw_text[start:end].strip()

    skills_raw     = get_section("skills")
    experience_raw = get_section("experience")
    projects_raw   = get_section("projects")

    return {
        "metadata":   metadata,
        "raw_text":   raw_text,
        "skills":     parse_skills(skills_raw)     if skills_raw     else [],
        "experience": parse_experience(experience_raw) if experience_raw else [],
        "projects":   parse_projects(projects_raw) if projects_raw   else [],
    }


# ─── Flask-compatible endpoint helper ─────────────────────────────────────────

def parse_resume_from_bytes(pdf_bytes: bytes, filename: str = "upload.pdf") -> dict:
    """
    Parse a resume directly from raw bytes (e.g. from Flask request.files).
    Avoids writing to disk by using PyMuPDF's stream interface.
    """
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pages_text = [page.get_text("text") for page in doc]
    raw_text   = "\n".join(pages_text)

    metadata = {
        "title":      doc.metadata.get("title", ""),
        "author":     doc.metadata.get("author", ""),
        "page_count": doc.page_count,
        "file_name":  filename,
    }
    doc.close()

    spans = _find_section_spans(raw_text)

    def get_section(name: str) -> str:
        if name not in spans:
            return ""
        start, end = spans[name]
        return raw_text[start:end].strip()

    skills_raw     = get_section("skills")
    experience_raw = get_section("experience")
    projects_raw   = get_section("projects")

    return {
        "metadata":   metadata,
        "raw_text":   raw_text,
        "skills":     parse_skills(skills_raw)         if skills_raw     else [],
        "experience": parse_experience(experience_raw) if experience_raw else [],
        "projects":   parse_projects(projects_raw)     if projects_raw   else [],
    }


# ─── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python resume_parser.py <path_to_resume.pdf>")
        sys.exit(1)

    pdf_file = sys.argv[1]
    print(f"\n📄 Parsing: {pdf_file}\n{'─' * 50}")

    try:
        result = parse_resume(pdf_file)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)

    # Pretty-print JSON output (exclude raw_text for readability)
    output = {k: v for k, v in result.items() if k != "raw_text"}
    print(json.dumps(output, indent=2, ensure_ascii=False))

    print(f"\n{'─' * 50}")
    print(f"✅ Pages parsed : {result['metadata']['page_count']}")
    print(f"✅ Skills found : {len(result['skills'])}")
    print(f"✅ Experience   : {len(result['experience'])} entries")
    print(f"✅ Projects     : {len(result['projects'])} entries")
