import http.server
import socketserver
import json
import os
import sys

PORT = 8000
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend"))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "data"))

class ResolveAIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/tickets":
            self.send_json_file(os.path.join(DATA_DIR, "tickets.json"))
        elif self.path == "/api/customers":
            self.send_json_file(os.path.join(DATA_DIR, "customers.json"))
        else:
            super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8')) if body else {}

        if self.path == "/api/chat":
            # Simple AI Decision Logic
            msg = data.get("message", "").lower()
            response_data = {
                "id": "TCK-8801",
                "customer_id": data.get("customer_id", "CUST-1001"),
                "customer_name": "Arun Kumar",
                "subject": data.get("message", "Broadband Issue")[:30],
                "status": "pending_approval",
                "decision_type": "RESOLVE",
                "confidence_score": 0.94,
                "priority": "High",
                "messages": [
                    {"sender": "customer", "text": data.get("message", ""), "timestamp": "10:15:00"}
                ],
                "ai_resolution": {
                    "grounded_answer": "Hello Arun, I checked your account record and verified that your Fiber 200 Mbps is active with no recorded area outage.\n\nRecommended Steps from Knowledge Base:\n1. Power off router for 30s.\n2. Check yellow optical cable connection to WAN port.\n3. Power back on and wait 3 mins for WAN light to turn solid Green.\n\nSource: KB-102 — Broadband Connection Troubleshooting",
                    "citations": [
                        {"article_id": "KB-102", "title": "Broadband Connection & Disconnection Troubleshooting", "section": "§2 WAN Light Indicators", "relevance_score": 0.96}
                    ]
                }
            }

            if "severed" in msg or "cut" in msg or "tree" in msg:
                response_data["decision_type"] = "ESCALATE"
                response_data["status"] = "escalated"
                response_data["confidence_score"] = 0.41
                response_data["ai_resolution"] = {
                    "handover_summary": {
                        "issue": data.get("message", ""),
                        "customer_status": "John Doe | Fiber 500 Mbps | Active | Paid",
                        "what_we_know": ["Physical cable cut reported outdoor", "Optical signal reads 0 dBm"],
                        "what_was_tried": ["Automated line test"],
                        "ai_assessment": "Low RAG confidence (41%). Physical line damage.",
                        "action": "Dispatch Level-2 Field Splicing Specialist immediately."
                    }
                }
            elif "paid" in msg or "payment" in msg:
                response_data["decision_type"] = "ASK_CUSTOMER"
                response_data["status"] = "needs_info"
                response_data["confidence_score"] = 0.88
                response_data["ai_resolution"] = {
                    "missing_info": {
                        "required_parameter": "Payment Transaction Reference ID / UTR",
                        "prompt_text": "Please provide your Payment Transaction Reference ID (or UTR number) from your bank statement so we can credit your account."
                    }
                }

            self.send_json_response(response_data)

        elif self.path in ["/api/tickets/approve", "/api/tickets/escalate"]:
            self.send_json_response({"status": "success", "ticket_id": data.get("ticket_id")})
        else:
            self.send_error(404, "Endpoint not found")

    def send_json_file(self, filepath):
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        else:
            self.send_error(404, "File not found")

    def send_json_response(self, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ResolveAIHandler) as httpd:
        print(f"ResolveAI Server running at http://127.0.0.1:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
