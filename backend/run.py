from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from datetime import timedelta

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
        "origins": ["http://localhost:3000", "http://localhost:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Error handlers
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

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'SkillBridge API',
        'version': '1.0.0'
    }), 200

# Register blueprints
@app.before_request
def before_request():
    """Log incoming requests"""
    app.logger.info(f'{request.method} {request.path}')

# Import and register blueprints after db initialization
try:
    from routes.auth import auth_bp
    from routes.user import user_bp
    from routes.assessment import assessment_bp
    from routes.gap_analysis import gap_analysis_bp
    from routes.roadmap import roadmap_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(assessment_bp, url_prefix='/api/assessment')
    app.register_blueprint(gap_analysis_bp, url_prefix='/api/gap-analysis')
    app.register_blueprint(roadmap_bp, url_prefix='/api/roadmap')
    
    print("✓ All blueprints registered successfully")
except ImportError as e:
    print(f"⚠ Warning: Could not import blueprints - {e}")
    print("  Make sure route files are in the 'routes' directory")

# Database initialization
@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()
    print('✓ Database initialized')

@app.cli.command()
def drop_db():
    """Drop all database tables."""
    if input('Are you sure? (y/n) ') == 'y':
        db.drop_all()
        print('✓ Database dropped')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    print("\n" + "="*50)
    print("🚀 SkillBridge API Server")
    print("="*50)
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Database: {os.getenv('DATABASE_URL', 'SQLite (local)')}")
    print(f"Server: http://localhost:5000")
    print(f"API Docs: http://localhost:5000/api/docs")
    print("="*50 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=os.getenv('FLASK_ENV') == 'development'
    )
