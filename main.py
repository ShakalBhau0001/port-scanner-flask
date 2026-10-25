from flask import Flask, jsonify, render_template, request

from core.scanner import run_scan
from core.validators import ValidationError, parse_port_range, resolve_target

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/scan", methods=["POST"])
def scan():
    payload = request.get_json(silent=True) or {}

    try:
        display_name, ip = resolve_target(payload.get("target"))
        start_port, end_port = parse_port_range(
            payload.get("start_port"), payload.get("end_port")
        )
    except ValidationError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    results, stats = run_scan(ip, start_port, end_port)
    return jsonify(
        {
            "success": True,
            "target": display_name,
            "resolved_ip": ip,
            "port_range": f"{start_port}-{end_port}",
            "stats": stats,
            "results": results,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
