from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from datetime import timedelta
import random
import json
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///skillbridge.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:5000",
            "http://localhost:5173",   # Vite dev server
            "http://127.0.0.1:5173",
            "https://localhost:5174",
            "https://localhost:5174"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# ----------------------------------------
# Sample MCQ Data (You can later move this to DB)
# ----------------------------------------
MCQ_DATA = [
    {
        "id": 1,
        "question": "What is React?",
        "options": ["Library", "Framework", "Language", "Database"],
        "correct_answer": "Library"
    },
    {
        "id": 2,
        "question": "Which hook is used for state management in React?",
        "options": ["useState", "useEffect", "useContext", "useRef"],
        "correct_answer": "useState"
    },
    {
        "id": 3,
        "question": "What does SQL stand for?",
        "options": [
            "Structured Query Language",
            "Simple Query Language",
            "Sequential Query Logic",
            "System Query List"
        ],
        "correct_answer": "Structured Query Language"
    },
    {
        "id": 4,
        "question": "Which HTTP method is used to create data?",
        "options": ["POST", "GET", "DELETE", "PATCH"],
        "correct_answer": "POST"
    },
]

# ----------------------------------------
# MCQ API Route
# ----------------------------------------
@app.route('/api/mcq', methods=['GET'])
def get_mcq_questions():
    """
    Returns MCQ questions with shuffled options
    """
    shuffled_questions = []

    for question in MCQ_DATA:
        options = question["options"].copy()
        random.shuffle(options)

        shuffled_questions.append({
            "id": question["id"],
            "question": question["question"],
            "options": options,
            "correct_answer": question["correct_answer"]
        })

    return jsonify(shuffled_questions), 200


# ----------------------------------------
# Skill Gap Calculation Route
# ----------------------------------------
@app.route('/api/skill-gap/calculate', methods=['POST', 'OPTIONS'])
def calculate_skill_gap():
    """
    POST /api/skill-gap/calculate
    Body: { "domain": "data science", "scores": { "python": 0.67, "sql": 0.8 } }
    Returns per-skill gaps, step-by-step audit trail, and readiness score.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    body         = request.get_json(force=True) or {}
    domain       = body.get('domain', '').lower().strip()
    user_scores  = {k.lower(): float(v) for k, v in body.get('scores', {}).items()}

    # ── Load benchmark ────────────────────────────────────────────────────────
    benchmark_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'skill_gap_benchmark.json'
    )
    try:
        with open(benchmark_file, 'r', encoding='utf-8') as f:
            benchmarks = json.load(f)
    except FileNotFoundError:
        return jsonify({'error': 'Benchmark file not found.'}), 404

    # ── Match domain to role (exact then fuzzy) ───────────────────────────────
    matched = next((b for b in benchmarks if b['domain'].lower() == domain), None)
    if not matched:
        matched = next((b for b in benchmarks
                        if domain in b['domain'].lower() or b['domain'].lower() in domain), None)
    if not matched:
        matched = benchmarks[0]  # safe fallback

    role             = matched['role']
    benchmark_skills = {k.lower(): float(v) for k, v in matched['skills'].items()}

    # ── Step-by-step gap calculation ──────────────────────────────────────────
    steps        = []
    skill_results = {}

    for skill, required in benchmark_skills.items():
        user_score   = user_scores.get(skill, 0.0)
        gap          = round(max(0.0, required - user_score), 4)
        weighted_gap = round(gap * required, 4)
        pct_gap      = round(gap * 100, 1)

        if gap == 0:
            status = 'met'
        elif gap > 0.5:
            status = 'critical'
        elif gap > 0.25:
            status = 'moderate'
        else:
            status = 'minor'

        skill_results[skill] = {
            'required':     required,
            'user_score':   round(user_score, 4),
            'gap':          gap,
            'weighted_gap': weighted_gap,
            'pct_gap':      pct_gap,
            'status':       status,
        }
        steps.append({
            'step':         f"Skill: {skill.title()}",
            'required':     required,
            'user_score':   round(user_score, 4),
            'gap':          gap,
            'weighted_gap': weighted_gap,
            'formula':      f"gap = max(0, {required} − {round(user_score, 2)}) = {gap}",
            'wt_formula':   f"weighted_gap = {gap} × {required} = {weighted_gap}",
            'status':       status,
        })

    # ── Aggregate ─────────────────────────────────────────────────────────────
    sum_w_gaps   = round(sum(r['weighted_gap'] for r in skill_results.values()), 4)
    sum_weights  = round(sum(benchmark_skills.values()), 4)
    total_gap    = round(sum_w_gaps / sum_weights, 4) if sum_weights else 0.0
    readiness    = round((1 - total_gap) * 100, 1)

    return jsonify({
        'role':    role,
        'domain':  domain,
        'skill_results': skill_results,
        'steps':   steps,
        'totals': {
            'sum_weighted_gaps': sum_w_gaps,
            'sum_weights':       sum_weights,
            'total_gap':         total_gap,
            'readiness':         readiness,
        },
        'formula_legend': {
            'per_skill_gap':  'gap[skill]  = max(0,  benchmark − user_score)',
            'weighted_gap':   'w_gap[skill]= gap × benchmark_weight',
            'total_gap':      f'total_gap   = Σ w_gaps / Σ weights  =  {sum_w_gaps} / {sum_weights}  =  {total_gap}',
            'readiness':      f'readiness   = (1 − {total_gap}) × 100  =  {readiness}%',
        },
    }), 200


# ----------------------------------------
# Personalized MCQ Test Route
# ----------------------------------------
@app.route('/api/mcq/user-test', methods=['GET', 'OPTIONS'])
def get_user_test():
    """
    GET /api/mcq/user-test?domain=data+science&skills=python,pandas,sql
    Returns 3 questions per matched skill from the domain JSON file.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    domain  = request.args.get('domain', '').lower().strip()
    skills_param = request.args.get('skills', '')
    skills  = [s.strip().lower() for s in skills_param.split(',') if s.strip()]

    # Map domain/interest name → JSON filename
    DOMAIN_FILES = {
        'web development':    'WebDevelopment.json',
        'web developer':      'WebDevelopment.json',
        'frontend':           'WebDevelopment.json',
        'full-stack':         'WebDevelopment.json',
        'full stack':         'WebDevelopment.json',
        'data science':       'DataScience.json',
        'data scientist':     'DataScience.json',
        'machine learning':   'DataScience.json',
        'ai engineer':        'AIEngineer.json',
        'ai engineering':     'AIEngineer.json',
        'artificial intelligence': 'AIEngineer.json',
        'software engineer':  'SoftwareEngineering.json',
        'software engineering': 'SoftwareEngineering.json',
        'data analyst':       'DataAnalyst.json',
        'business analyst':   'DataAnalyst.json',
    }

    filename = DOMAIN_FILES.get(domain)
    if not filename:
        for key, val in DOMAIN_FILES.items():
            if key in domain or domain in key:
                filename = val
                break
    if not filename:
        filename = 'WebDevelopment.json'  # sensible default

    data_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', filename
    )

    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            all_questions = json.load(f)
    except FileNotFoundError:
        return jsonify({'error': f'Question bank not found: {filename}'}), 404
    except json.JSONDecodeError as e:
        return jsonify({'error': f'Malformed JSON in {filename}: {str(e)}'}), 500

    # Group questions by skill (handle both 'language' and 'skill' field)
    by_skill = {}
    for q in all_questions:
        skill_key = q.get('language', q.get('skill', 'general')).lower()
        by_skill.setdefault(skill_key, []).append(q)

    # Match user skills to available skill groups (substring matching)
    if skills:
        matched = []
        for user_skill in skills:
            for bank_skill in by_skill:
                if user_skill in bank_skill or bank_skill in user_skill:
                    if bank_skill not in matched:
                        matched.append(bank_skill)
        if not matched:
            matched = list(by_skill.keys())[:5]
    else:
        matched = list(by_skill.keys())

    # Pick 3 questions per matched skill (easy → medium → advanced preference)
    result = []
    for skill in matched:
        pool = by_skill[skill].copy()
        random.shuffle(pool)
        for q in pool[:3]:
            result.append({
                'skill':      q.get('language', q.get('skill', skill)),
                'difficulty': q.get('difficulty', 'medium'),
                'question':   q['question'],
                'options':    q['options'],
                'answer':     q.get('answer', q.get('correct_answer', '')),
            })

    return jsonify(result), 200


# ----------------------------------------
# Resume Parse Route
# ----------------------------------------
@app.route('/api/resume/parse', methods=['POST', 'OPTIONS'])
def parse_resume_route():
    """
    POST /api/resume/parse
    Accepts: multipart/form-data with key 'resume' (PDF only)
    Returns: JSON with extracted skills, experience, projects, metadata
    Firestore saving is handled client-side via Firebase SDK.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Validate file presence
    if 'resume' not in request.files:
        return jsonify({'error': "No file uploaded. Use key 'resume'."}), 400

    file = request.files['resume']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    # Validate PDF — extension + MIME type
    import os as _os
    ext = _os.path.splitext(file.filename.lower())[1]
    mime = file.content_type or ''
    if ext != '.pdf' or 'pdf' not in mime:
        rejected = ext.lstrip('.').upper() or mime
        return jsonify({
            'error': f'Invalid file type ({rejected}). Only PDF resumes are accepted.',
            'allowed': ['PDF'],
        }), 415

    # Parse PDF with PyMuPDF
    try:
        from services.resume_parser import parse_resume_from_bytes
        pdf_bytes = file.read()
        parsed = parse_resume_from_bytes(pdf_bytes, filename=file.filename)
    except ImportError:
        return jsonify({'error': 'Resume parser not available. Install pymupdf: pip install pymupdf'}), 500
    except Exception as exc:
        return jsonify({'error': f'PDF parsing failed: {str(exc)}'}), 500

    return jsonify({
        'skills':     parsed.get('skills',     []),
        'experience': parsed.get('experience', []),
        'projects':   parsed.get('projects',   []),
        'metadata':   parsed.get('metadata',   {}),
    }), 200


# ----------------------------------------
# Error handlers
# ----------------------------------------
@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request', 'message': str(error)}), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error', 'message': str(error)}), 500

# ----------------------------------------
# Health check
# ----------------------------------------
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'SkillBridge API',
        'version': '1.0.0'
    }), 200

# ----------------------------------------
# Request Logging
# ----------------------------------------
@app.before_request
def before_request():
    app.logger.info(f'{request.method} {request.path}')

# ----------------------------------------
# Register blueprints
# ----------------------------------------
try:
    from routes.auth import auth_bp
    from routes.user import user_bp
    from routes.assessment import assessment_bp
    from routes.gap_analysis import gap_analysis_bp
    from routes.roadmap import roadmap_bp
    from routes.resume_routes import resume_bp

    app.register_blueprint(auth_bp,         url_prefix='/api/auth')
    app.register_blueprint(user_bp,         url_prefix='/api/users')
    app.register_blueprint(assessment_bp,   url_prefix='/api/assessment')
    app.register_blueprint(gap_analysis_bp, url_prefix='/api/gap-analysis')
    app.register_blueprint(roadmap_bp,      url_prefix='/api/roadmap')
    app.register_blueprint(resume_bp,       url_prefix='/api/resume')

    print("\u2713 All blueprints registered successfully")
except Exception as e:
    import traceback
    print(f"\u26a0 Blueprint registration error: {e}")
    traceback.print_exc()

# ----------------------------------------
# Database CLI Commands
# ----------------------------------------
@app.cli.command()
def init_db():
    db.create_all()
    print('✓ Database initialized')

@app.cli.command()
def drop_db():
    if input('Are you sure? (y/n) ') == 'y':
        db.drop_all()
        print('✓ Database dropped')

# ----------------------------------------
# Run Server
# ----------------------------------------

# ----------------------------------------
# Roadmap Generation Route (Gemini)
# ----------------------------------------
@app.route('/api/roadmap/generate', methods=['POST', 'OPTIONS'])
def roadmap_generate():
    """
    POST /api/roadmap/generate
    Body: {
      "role":        "data scientist",
      "match_pct":   82.3,
      "profile":     { name, domain, skills, interests, education, university, year },
      "test_scores": { "python": 0.67, ... },
      "skill_results": { "python": { gap:0.23, status:"moderate", user_score:0.67, required:0.9 } },
      "totals":      { readiness:69, total_gap:0.31 },
      "swot":        { strengths:[...], weaknesses:[...], opportunities:[...], threats:[...] }
    }
    Returns structured roadmap JSON.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key or api_key == 'your-gemini-api-key-here':
        return jsonify({'error': 'GEMINI_API_KEY not configured in backend/.env'}), 503

    body         = request.get_json(force=True) or {}
    role         = body.get('role', 'unknown')
    match_pct    = body.get('match_pct', 0)
    profile      = body.get('profile', {})
    test_scores  = body.get('test_scores', {})
    skill_results= body.get('skill_results', {})
    totals       = body.get('totals', {})
    swot         = body.get('swot', {})

    # Build skill gap lines
    skill_lines = []
    for skill, info in skill_results.items():
        u = round(info.get('user_score', 0) * 100)
        r = round(info.get('required', 0) * 100)
        g = round(info.get('gap', 0) * 100)
        st = info.get('status', '')
        skill_lines.append(f"  - {skill.title()}: scored {u}% | required {r}% | gap {g}% | {st}")

    # Build test score lines (fallback)
    test_lines = []
    for skill, sc in test_scores.items():
        test_lines.append(f"  - {skill.title()}: {round(float(sc)*100)}%")

    # Build SWOT summary
    swot_str = ''
    for key in ['strengths', 'weaknesses', 'opportunities', 'threats']:
        items = swot.get(key, [])
        if items:
            titles = [i.get('title', i) if isinstance(i, dict) else str(i) for i in items]
            swot_str += f"\n{key.upper()}: {', '.join(titles)}"

    # Load JobInfo
    job_info_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'JobInfo.json'
    )
    job_context = ''
    try:
        with open(job_info_file, 'r', encoding='utf-8') as f:
            job_data = json.load(f)
        matched_job = next(
            (r for r in job_data.get('roles', [])
             if r['title'].lower().replace(' ', '') == role.lower().replace(' ', '')),
            None
        )
        if matched_job:
            job_context = (
                f"\nRole Description: {matched_job['description']}\n"
                f"Core Industry Skills: {', '.join(matched_job['core_skills'])}\n"
            )
    except Exception:
        pass

    context = f"""
Student Profile:
- Name:            {profile.get('name', 'Student')}
- Target Role:     {role}
- Career Match:    {match_pct}%
- Domain:          {profile.get('domain', '')}
- Skills Listed:   {', '.join(profile.get('skills', [])) or 'not specified'}
- Interests:       {', '.join(profile.get('interests', [])) or 'not specified'}
- Education:       {profile.get('education', 'not specified')}
- University:      {profile.get('university', 'not specified')}
- Year of Study:   {profile.get('currentYear', 'not specified')}
- Career Readiness:{totals.get('readiness', 'N/A')}%

Skill Gap Analysis:
{chr(10).join(skill_lines) or chr(10).join(test_lines) or '  (No assessment taken yet)'}

SWOT Summary:{swot_str or ' Not available'}

{job_context}
"""

    SYSTEM_PROMPT = (
        "You are a career guide and counsellor whose aim is to guide and show direction to computer and IT college students. "
        "You are given student information, test scores, skill gap scores, and career matching percentage. "
        "On the basis of given inputs, provide the student a clear and structured roadmap to overcome weaknesses and become "
        "a professional in the desired career. Include industry-recognized projects and resources used in the recommended role. "
        "Note: Never generate fake or incorrect roadmaps."
    )

    prompt = (
        f"Generate a detailed career roadmap for a student targeting the role of '{role}'.\n\n"
        "Return ONLY valid JSON in EXACTLY this structure, no markdown, no extra text:\n"
        "{\n"
        '  "role": "...",\n'
        '  "summary": "2-3 sentence personalised roadmap overview",\n'
        '  "total_duration": "e.g. 6–12 months",\n'
        '  "phases": [\n'
        '    {\n'
        '      "phase_number": 1,\n'
        '      "title": "Phase title (e.g. Foundation — Month 1-2)",\n'
        '      "duration": "e.g. 1-2 months",\n'
        '      "goals": ["goal1", "goal2"],\n'
        '      "skills_to_learn": ["skill1", "skill2"],\n'
        '      "projects": [{"name": "Project name", "description": "1-2 sentences", "tech_stack": ["tech1"]}],\n'
        '      "resources": [{"title": "Resource name", "type": "book|course|docs|youtube|tool", "url_or_platform": "e.g. Coursera, YouTube, docs.python.org"}]\n'
        '    }\n'
        '  ],\n'
        '  "final_milestones": ["milestone1", "milestone2"],\n'
        '  "job_ready_checklist": ["item1", "item2"]\n'
        "}\n\n"
        "Include 4 phases. Each phase should have 2-3 projects and 3-4 resources. Be specific and actionable."
    )

    try:
        client   = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
            contents=context + '\n\n' + prompt,
        )
        raw = response.text.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
            raw = raw.strip()
        roadmap = json.loads(raw)
        return jsonify(roadmap), 200

    except json.JSONDecodeError:
        return jsonify({'error': 'Gemini returned non-JSON response.', 'raw': raw[:500]}), 502
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e), 'type': type(e).__name__}), 500


# ----------------------------------------
# Career Matching Route
# ----------------------------------------
@app.route('/api/career/match', methods=['POST', 'OPTIONS'])
def career_match():
    """
    POST /api/career/match
    Body: {
      "skills": ["python", "sql"],
      "interests": ["data science", "machine learning"],
      "test_scores": { "python": 0.67, "sql": 0.80 }
    }
    Returns top-3 matched roles with step-by-step calculation.
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    body        = request.get_json(force=True) or {}
    user_skills = [s.lower().strip() for s in body.get('skills', [])]
    interests   = [i.lower().strip() for i in body.get('interests', [])]
    test_scores = {k.lower(): float(v) for k, v in body.get('test_scores', {}).items()}

    # Load benchmark
    benchmark_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'skill_gap_benchmark.json'
    )
    try:
        with open(benchmark_file, 'r', encoding='utf-8') as f:
            benchmarks = json.load(f)
    except FileNotFoundError:
        return jsonify({'error': 'Benchmark file not found.'}), 404

    # Load JobInfo for descriptions and salaries
    job_info_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'JobInfo.json'
    )
    job_info_map = {}
    try:
        with open(job_info_file, 'r', encoding='utf-8') as f:
            job_data = json.load(f)
        for r in job_data.get('roles', []):
            job_info_map[r['title'].lower().replace(' ', '')] = r
    except Exception:
        pass

    # ── Weights (must sum to 1.0) ─────────────────────────────────────────────
    W_TEST     = 0.45
    W_SKILL    = 0.35
    W_INTEREST = 0.20

    results = []

    for bench in benchmarks:
        role_name   = bench['role']
        role_domain = bench['domain'].lower()
        bench_skills= {k.lower(): float(v) for k, v in bench['skills'].items()}

        # ── STEP 1: Test Alignment ─────────────────────────────────────────────
        # contribution = min(user_score, benchmark_weight) for each matched skill
        # test_alignment = Σ contributions / Σ benchmark_weights
        test_steps = []
        sum_contributions = 0.0
        sum_bench_weights = sum(bench_skills.values())
        for skill, bw in bench_skills.items():
            us = test_scores.get(skill, 0.0)
            contribution = round(min(us, bw), 4)
            sum_contributions += contribution
            test_steps.append({
                'skill': skill,
                'user_score': round(us, 4),
                'benchmark':  round(bw, 4),
                'contribution': contribution,
                'formula': f"min({round(us,2)}, {bw}) = {contribution}",
            })
        test_alignment = round(sum_contributions / sum_bench_weights, 4) if sum_bench_weights else 0.0

        # ── STEP 2: Skill Overlap ──────────────────────────────────────────────
        # overlap = |user_skills ∩ role_required_skills| / |role_required_skills|
        role_skill_set = set(bench_skills.keys())
        user_skill_set = set(user_skills)
        # also partial-match (e.g. "machine learning" in "scikit-learn")
        matched_skills = set()
        for us in user_skill_set:
            for rs in role_skill_set:
                if us in rs or rs in us or us == rs:
                    matched_skills.add(rs)
        unmatched_skills = role_skill_set - matched_skills
        skill_overlap = round(len(matched_skills) / len(role_skill_set), 4) if role_skill_set else 0.0

        # ── STEP 3: Interest Match ─────────────────────────────────────────────
        interest_score = 0.2   # default: no match
        interest_detail = 'No interest match'
        for interest in interests:
            if interest == role_domain:
                interest_score = 1.0
                interest_detail = f"Exact match: '{interest}' == '{role_domain}'"
                break
            elif interest in role_domain or role_domain in interest:
                if interest_score < 0.6:
                    interest_score = 0.6
                    interest_detail = f"Partial match: '{interest}' ↔ '{role_domain}'"
        interest_score = round(interest_score, 4)

        # ── STEP 4: Weighted Career Score ─────────────────────────────────────
        weighted_test     = round(W_TEST     * test_alignment,  4)
        weighted_skill    = round(W_SKILL    * skill_overlap,   4)
        weighted_interest = round(W_INTEREST * interest_score,  4)
        career_score      = round(weighted_test + weighted_skill + weighted_interest, 4)
        match_pct         = round(career_score * 100, 1)

        # Job info lookup
        role_key = role_name.lower().replace(' ', '')
        job      = job_info_map.get(role_key, {})

        results.append({
            'role':   role_name,
            'domain': role_domain,
            'match_pct': match_pct,
            'career_score': career_score,
            'breakdown': {
                'test_alignment':  { 'score': test_alignment,  'weighted': weighted_test,     'weight': W_TEST,     'formula': f"Σ min(user,bench) / Σ bench_weights = {round(sum_contributions,4)} / {round(sum_bench_weights,4)} = {test_alignment}" },
                'skill_overlap':   { 'score': skill_overlap,   'weighted': weighted_skill,    'weight': W_SKILL,    'formula': f"|matched| / |role_skills| = {len(matched_skills)} / {len(role_skill_set)} = {skill_overlap}" },
                'interest_score':  { 'score': interest_score,  'weighted': weighted_interest, 'weight': W_INTEREST, 'formula': interest_detail },
                'final':           { 'formula': f"({W_TEST}×{test_alignment}) + ({W_SKILL}×{skill_overlap}) + ({W_INTEREST}×{interest_score}) = {career_score}" },
            },
            'test_steps':      test_steps,
            'matched_skills':  sorted(matched_skills),
            'missing_skills':  sorted(unmatched_skills),
            'description':     job.get('description', ''),
            'core_skills':     job.get('core_skills', list(bench_skills.keys())[:5]),
            'salary_india':    job.get('approx_salary', {}).get('India', {}),
        })

    # Sort and return top 3
    results.sort(key=lambda x: x['career_score'], reverse=True)
    top3 = results[:3]

    return jsonify({
        'top_matches': top3,
        'all_scores':  [{'role': r['role'], 'match_pct': r['match_pct']} for r in results],
        'weights_used': { 'test_alignment': W_TEST, 'skill_overlap': W_SKILL, 'interest_match': W_INTEREST },
        'formula_legend': {
            'test_alignment':  f"test_alignment  = Σ min(user_score, benchmark) / Σ benchmark   (weight: {int(W_TEST*100)}%)",
            'skill_overlap':   f"skill_overlap   = |your skills ∩ role skills| / |role skills|  (weight: {int(W_SKILL*100)}%)",
            'interest_score':  f"interest_score  = 1.0 exact | 0.6 partial | 0.2 none           (weight: {int(W_INTEREST*100)}%)",
            'career_score':    "career_score    = 0.45×test + 0.35×skill + 0.20×interest",
            'match_pct':       "match_pct       = career_score × 100",
        },
    }), 200


# ----------------------------------------
# SWOT Analysis Route (Gemini)
# ----------------------------------------
@app.route('/api/swot/analyze', methods=['POST', 'OPTIONS'])
def swot_analyze():
    """
    POST /api/swot/analyze
    Body: {
      "domain": "data science",
      "role": "data scientist",
      "skills": ["python", "sql"],
      "skill_results": { "python": { "required": 0.9, "user_score": 0.67, "gap": 0.23, "status": "moderate" } },
      "totals": { "total_gap": 0.31, "readiness": 69.0 }
    }
    Returns: { "strengths": [...], "weaknesses": [...], "opportunities": [...], "threats": [...] }
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key or api_key == 'your-gemini-api-key-here':
        return jsonify({'error': 'GEMINI_API_KEY not configured in backend/.env'}), 503

    body         = request.get_json(force=True) or {}
    profile      = body.get('profile', {})
    skill_results= body.get('skill_results', {})
    totals       = body.get('totals', {})
    test_scores  = body.get('test_scores', {})   # raw MCQ scores as fallback

    # Pull fields from profile
    domain       = profile.get('domain', 'unknown')
    role         = profile.get('role', '') or domain
    skills       = profile.get('skills', [])
    name         = profile.get('name', 'Student')
    education    = profile.get('education', '')
    university   = profile.get('university', '')
    year         = profile.get('currentYear', '')
    interests    = profile.get('interests', [])

    # Load JobInfo for role context
    job_info_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'JobInfo.json'
    )
    job_context = ''
    try:
        with open(job_info_file, 'r', encoding='utf-8') as f:
            job_data = json.load(f)
        matched_job = next(
            (r for r in job_data.get('roles', [])
             if r['title'].lower().replace(' ', '') == role.lower().replace(' ', '')),
            None
        )
        if not matched_job:
            matched_job = next(
                (r for r in job_data.get('roles', [])
                 if domain.lower() in r['title'].lower() or r['title'].lower() in domain.lower()),
                None
            )
        if matched_job:
            job_context = (
                f"\nJob Role Info — {matched_job['title']}:\n"
                f"Description: {matched_job['description']}\n"
                f"Core Skills Required: {', '.join(matched_job['core_skills'])}\n"
                f"India Salary Range: {matched_job['approx_salary'].get('India', {})}\n"
            )
    except Exception:
        pass

    # Build skill gap summary (from full skill_results if available)
    skill_lines = []
    for skill, info in skill_results.items():
        status = info.get('status', '')
        u = round(info.get('user_score', 0) * 100)
        r = round(info.get('required', 0) * 100)
        g = round(info.get('gap', 0) * 100)
        skill_lines.append(f"  - {skill.title()}: scored={u}% | required={r}% | gap={g}% | status={status}")

    # Fallback: use raw test_scores if skill_gap wasn't run
    if not skill_lines and test_scores:
        for skill, score in test_scores.items():
            skill_lines.append(f"  - {skill.title()}: MCQ score={round(float(score)*100)}%")

    skill_summary = '\n'.join(skill_lines) if skill_lines else '  (Assessment not yet taken — analysis will be based on profile only)'

    readiness = totals.get('readiness', 'N/A')
    total_gap = totals.get('total_gap', 'N/A')
    user_skills = ', '.join(skills) if skills else 'not specified'
    user_interests = ', '.join(interests) if interests else 'not specified'

    context = f"""
Student Profile:
- Name: {name}
- Domain of Interest: {domain}
- Target Role: {role}
- Listed Skills: {user_skills}
- Interests: {user_interests}
- Education Level: {education or 'not specified'}
- University / College: {university or 'not specified'}
- Current Year of Study: {year or 'not specified'}
- Career Readiness Score: {readiness}{'%' if isinstance(readiness, (int,float)) else ''}
- Total Weighted Skill Gap: {total_gap}

Skill-by-Skill Assessment:
{skill_summary}
{job_context}
"""

    prompt = (
        "Based on the student profile above, generate a detailed SWOT analysis.\n\n"
        "Respond ONLY with valid JSON in this exact format, no markdown, no extra text:\n"
        "{\n"
        '  "strengths":     [{"title": "...", "explanation": "..."}],\n'
        '  "weaknesses":    [{"title": "...", "explanation": "..."}],\n'
        '  "opportunities": [{"title": "...", "explanation": "..."}],\n'
        '  "threats":       [{"title": "...", "explanation": "..."}]\n'
        "}\n\n"
        "Each array must have 3–5 items. Be specific, actionable, and concise."
    )

    SYSTEM_PROMPT = (
        "You are a career mentor and guide whose primary task is to provide SWOT analysis to students. "
        "Given the skill gap of students, provide Strengths, Weaknesses, Opportunities, and Threats "
        "with reasonable, actionable explanations. "
        "Provide your explanation in a structured way. "
        "If the information given is incomplete, respond with: "
        '{"error": "Incomplete data to analyse"}.'
    )

    try:
        client   = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
            contents=context + '\n\n' + prompt,
        )
        raw = response.text.strip()
        # Strip markdown fences if present
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        swot = json.loads(raw)
        return jsonify(swot), 200

    except json.JSONDecodeError:
        return jsonify({'error': 'Gemini returned non-JSON response.', 'raw': raw[:500]}), 502
    except Exception as e:
        import traceback
        traceback.print_exc()          # prints full trace to Flask console
        return jsonify({'error': str(e), 'type': type(e).__name__}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    print("\n" + "="*50)
    print("🚀 SkillBridge API Server")
    print("="*50)
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Database: {os.getenv('DATABASE_URL', 'SQLite (local)')}")
    print(f"Server: http://localhost:5000")
    print("="*50 + "\n")

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=os.getenv('FLASK_ENV') == 'development'
    )