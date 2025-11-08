import os
from flask import Flask, jsonify, request

app = Flask(__name__)

orders = [
    {"id": 1, "item": "California Roll", "quantity": 2},
    {"id": 2, "item": "Salmon Nigiri", "quantity": 3}
]

@app.route("/")
def index():
    return jsonify({"message": "Hello from sushi_delivery_mvp!"})

@app.route("/orders", methods=["GET"])
def get_orders():
    return jsonify({"orders": orders})

@app.route("/orders", methods=["POST"])
def add_order():
    data = request.get_json()
    new_order = {
        "id": len(orders)+1,
        "item": data.get("item"),
        "quantity": data.get("quantity",1)
    }
    orders.append(new_order)
    return jsonify(new_order), 201

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
import os
from flask import Flask, jsonify, request

app = Flask(__name__)

# Beispiel-Daten für Sushi-Bestellungen
orders = [
    {"id": 1, "item": "California Roll", "quantity": 2},
    {"id": 2, "item": "Salmon Nigiri", "quantity": 3}
]

@app.route("/")
def index():
    return jsonify({"message": "Hello from sushi_delivery_mvp!"})

@app.route("/orders", methods=["GET"])
def get_orders():
    return jsonify({"orders": orders})

@app.route("/orders", methods=["POST"])
def add_order():
    data = request.get_json()
    new_order = {
        "id": len(orders) + 1,
        "item": data.get("item"),
        "quantity": data.get("quantity", 1)
    }
    orders.append(new_order)
    return jsonify(new_order), 201

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
import os
from flask import Flask, jsonify, request

app = Flask(__name__)

# Beispiel-Daten für Sushi-Bestellungen
orders = [
    {"id": 1, "item": "California Roll", "quantity": 2},
    {"id": 2, "item": "Salmon Nigiri", "quantity": 3}
]

@app.route("/")
def index():
    return jsonify({"message": "Hello from sushi_delivery_mvp!"})

@app.route("/orders", methods=["GET"])
def get_orders():
    return jsonify({"orders": orders})

@app.route("/orders", methods=["POST"])
def add_order():
    data = request.get_json()
    new_order = {
        "id": len(orders) + 1,
        "item": data.get("item"),
        "quantity": data.get("quantity", 1)
    }
    orders.append(new_order)
    return jsonify(new_order), 201

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    return jsonify({"message": "Hello from sushi_delivery_mvp!"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

