from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 모든 출처 허용

@app.route("/")
def home():
    return "Flask 서버 동작 중!"

@app.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Flask!"})

if __name__ == "__main__":
    app.run(debug=True)
