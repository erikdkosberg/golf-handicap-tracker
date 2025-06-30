from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({'message': 'Registered successfully!'})

if __name__ == '__main__':
    app.run(debug=True)
