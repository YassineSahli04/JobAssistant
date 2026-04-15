import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow frontend from any origin (configure as needed)

# Supabase configuration from environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Optional: bucket name (configurable via env)
BUCKET_NAME = os.environ.get("SUPABASE_BUCKET", "resumes")
TABLE_NAME = os.environ.get("SUPABASE_TABLE", "resumes")

@app.route('/upload-resume', methods=['POST'])
def upload_resume():
    # 1. Validate file
    if 'resume' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    # 2. Get or create temporary user ID from cookie
    temp_user_id = request.cookies.get('temp_user_id')
    if not temp_user_id:
        temp_user_id = str(uuid.uuid4())

    # 3. Upload file to Supabase Storage
    file_path = f"{temp_user_id}/{file.filename}"
    try:
        file_content = file.read()
        supabase.storage.from_(BUCKET_NAME).upload(file_path, file_content)
    except Exception as e:
        return jsonify({'error': f'Storage upload failed: {str(e)}'}), 500

    # 4. Get public URL (assumes bucket is public or you have a policy)
    file_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)

    # 5. Save metadata to Supabase table
    try:
        data = {
            "user_id": temp_user_id,
            "file_name": file.filename,
            "file_url": file_url,
            "resume_text": ""  # You can later add PDF text extraction
        }
        supabase.table(TABLE_NAME).insert(data).execute()
    except Exception as e:
        # Optionally delete the uploaded file if DB insert fails
        # supabase.storage.from_(BUCKET_NAME).remove([file_path])
        return jsonify({'error': f'Database insert failed: {str(e)}'}), 500

    # 6. Return success with cookie to persist temp_user_id
    response = jsonify({
        'message': 'Resume uploaded successfully',
        'user_id': temp_user_id,
        'file_url': file_url
    })
    response.set_cookie('temp_user_id', temp_user_id, max_age=30*24*3600, httponly=True, samesite='Lax')
    return response

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
