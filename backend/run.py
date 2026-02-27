from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from datetime import timedelta
import random

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