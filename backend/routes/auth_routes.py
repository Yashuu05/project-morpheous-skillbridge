from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import re

# Firestore client — initialised via firebase_admin in app.py / main entry point.
# Import it lazily so the module doesn't crash if firebase_admin isn't set up yet.
def _get_db():
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception as e:
        raise RuntimeError(
            "Firestore is not initialised. "
            "Make sure firebase_admin.initialize_app() has been called "
            "with valid credentials before using auth routes. "
            f"Original error: {e}"
        )

auth_bp = Blueprint('auth', __name__)

# ─── Helpers ───────────────────────────────────────────────────────────────────

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password: str):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, "Password is valid"


def _user_doc_to_dict(doc_data: dict) -> dict:
    """Return a safe public representation of a Firestore user document."""
    return {
        'id': doc_data.get('id'),
        'email': doc_data.get('email'),
        'full_name': doc_data.get('full_name'),
        'created_at': doc_data.get('created_at'),
    }

# ─── Routes ────────────────────────────────────────────────────────────────────

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Register a new user and store them in Firestore.
    Body: { "email", "password", "full_name" }
    """
    try:
        data = request.get_json()

        if not data or not all(k in data for k in ['email', 'password', 'full_name']):
            return jsonify({'error': 'Missing required fields'}), 400

        email = data['email'].lower().strip()
        password = data['password']
        full_name = data['full_name'].strip()

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({'error': message}), 400

        if len(full_name) < 2:
            return jsonify({'error': 'Full name must be at least 2 characters'}), 400

        db = _get_db()
        users_ref = db.collection('users')

        # Check duplicate email
        existing = users_ref.where('email', '==', email).limit(1).get()
        if len(existing) > 0:
            return jsonify({'error': 'Email already registered'}), 409

        # Create user document
        user_data = {
            'id': email,          # use email as the document ID
            'email': email,
            'full_name': full_name,
            'password_hash': generate_password_hash(password),
            'created_at': datetime.utcnow().isoformat(),
        }
        users_ref.document(email).set(user_data)

        access_token = create_access_token(identity=email)
        refresh_token = create_refresh_token(identity=email)

        return jsonify({
            'message': 'User registered successfully',
            'user': _user_doc_to_dict(user_data),
            'access_token': access_token,
            'refresh_token': refresh_token,
        }), 201

    except Exception as e:
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user via Firestore lookup.
    Body: { "email", "password" }
    """
    try:
        data = request.get_json()

        if not data or not all(k in data for k in ['email', 'password']):
            return jsonify({'error': 'Missing email or password'}), 400

        email = data['email'].lower().strip()
        password = data['password']

        db = _get_db()
        doc = db.collection('users').document(email).get()

        if not doc.exists:
            return jsonify({'error': 'Invalid email or password'}), 401

        user_data = doc.to_dict()
        if not check_password_hash(user_data.get('password_hash', ''), password):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=email)
        refresh_token = create_refresh_token(identity=email)

        return jsonify({
            'message': 'Login successful',
            'user': _user_doc_to_dict(user_data),
            'access_token': access_token,
            'refresh_token': refresh_token,
        }), 200

    except Exception as e:
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout (stateless — client should discard the token)."""
    try:
        # For a production blacklist, add the JTI to a Firestore 'token_blacklist' collection here.
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        return jsonify({'error': 'Logout failed', 'details': str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    try:
        current_user = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user)
        return jsonify({'message': 'Token refreshed', 'access_token': new_access_token}), 200
    except Exception as e:
        return jsonify({'error': 'Token refresh failed', 'details': str(e)}), 500


@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify the current JWT and return the user's public profile."""
    try:
        email = get_jwt_identity()
        db = _get_db()
        doc = db.collection('users').document(email).get()

        if not doc.exists:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'message': 'Token is valid', 'user': _user_doc_to_dict(doc.to_dict())}), 200

    except Exception as e:
        return jsonify({'error': 'Verification failed', 'details': str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change the authenticated user's password.
    Body: { "current_password", "new_password" }
    """
    try:
        email = get_jwt_identity()
        db = _get_db()
        doc_ref = db.collection('users').document(email)
        doc = doc_ref.get()

        if not doc.exists:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data or not all(k in data for k in ['current_password', 'new_password']):
            return jsonify({'error': 'Missing required fields'}), 400

        user_data = doc.to_dict()
        if not check_password_hash(user_data.get('password_hash', ''), data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 401

        is_valid, message = validate_password(data['new_password'])
        if not is_valid:
            return jsonify({'error': message}), 400

        doc_ref.update({'password_hash': generate_password_hash(data['new_password'])})
        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        return jsonify({'error': 'Password change failed', 'details': str(e)}), 500