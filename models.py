from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Telemetry(BaseModel):
    line_status: str
    wan_light: str
    power_status: str
    router_model: str
    mac_address: str
    signal_dbm: str
    uptime_hours: int
    outage_in_area: bool

class Customer(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    plan: str
    plan_type: str
    monthly_fee: str
    account_status: str
    payment_status: str
    last_payment_date: str
    telemetry: Telemetry
    previous_tickets_count: int
    address: str

class Message(BaseModel):
    sender: str
    text: str
    timestamp: str

class Citation(BaseModel):
    article_id: str
    title: str
    section: str
    relevance_score: float

class MissingInfo(BaseModel):
    required_parameter: str
    prompt_text: str

class HandoverSummary(BaseModel):
    issue: str
    customer_status: str
    what_we_know: List[str]
    what_was_tried: List[str]
    ai_assessment: str
    action: str

class AIResolution(BaseModel):
    grounded_answer: Optional[str] = None
    citations: List[Citation] = []
    missing_info: Optional[MissingInfo] = None
    handover_summary: Optional[HandoverSummary] = None

class Ticket(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    subject: str
    status: str
    decision_type: str  # RESOLVE, ASK_CUSTOMER, ESCALATE
    confidence_score: float
    priority: str
    created_at: str
    updated_at: str
    messages: List[Message]
    ai_resolution: Optional[AIResolution] = None

class ChatRequest(BaseModel):
    customer_id: str
    message: str
    ticket_id: Optional[str] = None

class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

class DecisionRequest(BaseModel):
    customer_id: str
    message: str

class ApproveRequest(BaseModel):
    custom_response: Optional[str] = None

class EscalateRequest(BaseModel):
    reason: Optional[str] = None

class ProblemSubmissionRequest(BaseModel):
    customer_id: str
    category: str
    subject: str
    description: str
    led_status: Optional[str] = None
    urgency: Optional[str] = "Normal"

class NewCustomerRequest(BaseModel):
    name: str
    email: str
    phone: str
    plan: str
    plan_type: Optional[str] = "Broadband"
    monthly_fee: Optional[str] = "$69.99"
    address: Optional[str] = "100 Innovation Way"

class ProvideInfoRequest(BaseModel):
    ticket_id: str
    info_value: str
