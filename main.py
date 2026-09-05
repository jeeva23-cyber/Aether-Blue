import os
import sys
import datetime
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.models import (
    Customer, Ticket, Message, ChatRequest, RAGSearchRequest, 
    DecisionRequest, ApproveRequest, EscalateRequest,
    ProblemSubmissionRequest, NewCustomerRequest, ProvideInfoRequest,
    Telemetry
)
from backend.database import db
from backend.rag import rag_system
from backend.decision_engine import decision_engine

app = FastAPI(
    title="ResolveAI — Customer Support Resolution Assistant API",
    description="Intelligent AI decision engine & RAG assistant for broadband and mobile providers.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Customers APIs
@app.get("/api/customers", response_model=List[Customer], tags=["Customers"])
def get_customers():
    return db.get_all_customers()

@app.get("/api/customers/{customer_id}", response_model=Customer, tags=["Customers"])
def get_customer(customer_id: str):
    c = db.get_customer(customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c

@app.post("/api/customers", response_model=Customer, tags=["Customers"])
def create_customer(req: NewCustomerRequest):
    new_id = f"CUST-{1000 + len(db.get_all_customers()) + 1}"
    cust = Customer(
        id=new_id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        plan=req.plan,
        plan_type=req.plan_type or "Broadband",
        monthly_fee=req.monthly_fee or "$69.99",
        account_status="Active",
        payment_status="Paid",
        last_payment_date=datetime.date.today().isoformat(),
        telemetry=Telemetry(
            line_status="Online",
            wan_light="Solid Green",
            power_status="On",
            router_model="NexFiber Wi-Fi 6 Gateway",
            mac_address=f"88:{uuid.uuid4().hex[:2].upper()}:{uuid.uuid4().hex[:2].upper()}:{uuid.uuid4().hex[:2].upper()}",
            signal_dbm="-18 dBm (Good)",
            uptime_hours=12,
            outage_in_area=False
        ),
        previous_tickets_count=0,
        address=req.address or "100 Innovation Way"
    )
    db.save_customer(cust)
    return cust

@app.get("/api/customers/{customer_id}/tickets", response_model=List[Ticket], tags=["Customers"])
def get_customer_tickets(customer_id: str):
    return db.get_customer_tickets(customer_id)

# 2. Tickets APIs
@app.get("/api/tickets", response_model=List[Ticket], tags=["Tickets"])
def get_tickets():
    return db.get_all_tickets()

@app.get("/api/tickets/{ticket_id}", response_model=Ticket, tags=["Tickets"])
def get_ticket(ticket_id: str):
    t = db.get_ticket(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

# 3. Customer Problem Submission API
@app.post("/api/problems/submit", response_model=Ticket, tags=["Customer Portal"])
def submit_problem(req: ProblemSubmissionRequest):
    customer = db.get_customer(req.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    ticket_id = f"TCK-{uuid.uuid4().hex[:4].upper()}"
    now_str = datetime.datetime.now().strftime("%H:%M:%S")

    # Combine subject & description for full AI evaluation
    full_text = f"{req.subject}. {req.description}"
    if req.led_status:
        full_text += f" (Reported router light: {req.led_status})"

    eval_res = decision_engine.evaluate(full_text, customer)

    status_val = "pending_approval"
    if eval_res["decision_type"] == "ASK_CUSTOMER":
        status_val = "needs_info"
    elif eval_res["decision_type"] == "ESCALATE":
        status_val = "escalated"

    ticket = Ticket(
        id=ticket_id,
        customer_id=customer.id,
        customer_name=customer.name,
        subject=req.subject,
        status=status_val,
        decision_type=eval_res["decision_type"],
        confidence_score=eval_res["confidence_score"],
        priority="Critical" if eval_res["decision_type"] == "ESCALATE" else ("High" if req.urgency == "High" else "Medium"),
        created_at=datetime.datetime.now().isoformat(),
        updated_at=datetime.datetime.now().isoformat(),
        messages=[
            Message(sender="customer", text=f"[{req.category}] {req.description}", timestamp=now_str)
        ],
        ai_resolution=eval_res["ai_resolution"]
    )

    db.save_ticket(ticket)
    return ticket

# 4. Provide Missing Info API
@app.post("/api/tickets/{ticket_id}/provide-info", response_model=Ticket, tags=["Customer Portal"])
def provide_missing_info(ticket_id: str, req: ProvideInfoRequest):
    ticket = db.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    customer = db.get_customer(ticket.customer_id)
    now_str = datetime.datetime.now().strftime("%H:%M:%S")

    # Add customer info message
    ticket.messages.append(Message(
        sender="customer",
        text=f"Provided parameter: {req.info_value}",
        timestamp=now_str
    ))

    # Re-evaluate with new info
    combined_query = f"{ticket.subject} - Provided reference: {req.info_value}"
    eval_res = decision_engine.evaluate(combined_query, customer)

    ticket.decision_type = eval_res["decision_type"]
    ticket.confidence_score = eval_res["confidence_score"]
    ticket.ai_resolution = eval_res["ai_resolution"]
    ticket.status = "pending_approval" if eval_res["decision_type"] == "RESOLVE" else ticket.status
    ticket.updated_at = datetime.datetime.now().isoformat()

    db.save_ticket(ticket)
    return ticket

# 5. RAG Search API
@app.post("/api/rag/search", tags=["RAG Search"])
def search_rag(req: RAGSearchRequest):
    results = rag_system.search(req.query, top_k=req.top_k or 3)
    out = []
    for chunk, score in results:
        out.append({
            "article_id": chunk.article_id,
            "title": chunk.title,
            "section": chunk.section,
            "similarity_score": score,
            "content": chunk.content
        })
    return {"query": req.query, "results": out}

# 6. AI Decision API
@app.post("/api/decision", tags=["Decision Engine"])
def evaluate_decision(req: DecisionRequest):
    customer = db.get_customer(req.customer_id)
    eval_result = decision_engine.evaluate(req.message, customer)
    return eval_result

# 7. Chat Conversation API
@app.post("/api/chat", response_model=Ticket, tags=["Chat"])
def process_chat(req: ChatRequest):
    customer = db.get_customer(req.customer_id)
    cust_name = customer.name if customer else "Customer"

    ticket = None
    if req.ticket_id:
        ticket = db.get_ticket(req.ticket_id)

    if not ticket:
        for t in db.get_all_tickets():
            if t.customer_id == req.customer_id and t.status in ["pending_approval", "needs_info", "escalated"]:
                ticket = t
                break

    new_msg = Message(
        sender="customer",
        text=req.message,
        timestamp=datetime.datetime.now().strftime("%H:%M:%S")
    )

    if ticket:
        ticket.messages.append(new_msg)
    else:
        ticket_id = f"TCK-{uuid.uuid4().hex[:4].upper()}"
        ticket = Ticket(
            id=ticket_id,
            customer_id=req.customer_id,
            customer_name=cust_name,
            subject=req.message[:35] + ("..." if len(req.message) > 35 else ""),
            status="pending_approval",
            decision_type="RESOLVE",
            confidence_score=0.90,
            priority="Medium",
            created_at=datetime.datetime.now().isoformat(),
            updated_at=datetime.datetime.now().isoformat(),
            messages=[new_msg]
        )

    # Run Decision Engine
    eval_res = decision_engine.evaluate(req.message, customer)
    ticket.decision_type = eval_res["decision_type"]
    ticket.confidence_score = eval_res["confidence_score"]
    ticket.ai_resolution = eval_res["ai_resolution"]
    ticket.updated_at = datetime.datetime.now().isoformat()

    if ticket.decision_type == "RESOLVE":
        ticket.status = "pending_approval"
    elif ticket.decision_type == "ASK_CUSTOMER":
        ticket.status = "needs_info"
    else:
        ticket.status = "escalated"
        ticket.priority = "Critical"

    db.save_ticket(ticket)
    return ticket

# 8. Approve Ticket API
@app.post("/api/tickets/{ticket_id}/approve", response_model=Ticket, tags=["Agent Actions"])
def approve_ticket(ticket_id: str, req: ApproveRequest):
    ticket = db.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    resp_text = req.custom_response or (ticket.ai_resolution.grounded_answer if ticket.ai_resolution else "Approved by agent.")
    ticket.messages.append(Message(
        sender="agent",
        text=resp_text,
        timestamp=datetime.datetime.now().strftime("%H:%M:%S")
    ))
    ticket.status = "resolved"
    ticket.updated_at = datetime.datetime.now().isoformat()
    db.save_ticket(ticket)
    return ticket

# 9. Escalate Ticket API
@app.post("/api/tickets/{ticket_id}/escalate", response_model=Ticket, tags=["Agent Actions"])
def escalate_ticket(ticket_id: str, req: EscalateRequest):
    ticket = db.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = "escalated"
    ticket.decision_type = "ESCALATE"
    ticket.priority = "Critical"
    ticket.updated_at = datetime.datetime.now().isoformat()
    db.save_ticket(ticket)
    return ticket

# Mount frontend static files
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
