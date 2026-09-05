import json
import os
from typing import List, Optional, Dict
from backend.models import Customer, Ticket

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
CUSTOMERS_FILE = os.path.join(DATA_DIR, "customers.json")
TICKETS_FILE = os.path.join(DATA_DIR, "tickets.json")

class Database:
    def __init__(self):
        self.customers: Dict[str, Customer] = {}
        self.tickets: Dict[str, Ticket] = {}
        self.load_data()

    def load_data(self):
        if os.path.exists(CUSTOMERS_FILE):
            with open(CUSTOMERS_FILE, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    c = Customer(**item)
                    self.customers[c.id] = c

        if os.path.exists(TICKETS_FILE):
            with open(TICKETS_FILE, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    t = Ticket(**item)
                    self.tickets[t.id] = t

    def save_tickets(self):
        with open(TICKETS_FILE, "w", encoding="utf-8") as f:
            json.dump([t.model_dump() for t in self.tickets.values()], f, indent=2)

    def save_customers(self):
        with open(CUSTOMERS_FILE, "w", encoding="utf-8") as f:
            json.dump([c.model_dump() for c in self.customers.values()], f, indent=2)

    def get_customer(self, customer_id: str) -> Optional[Customer]:
        return self.customers.get(customer_id)

    def get_all_customers(self) -> List[Customer]:
        return list(self.customers.values())

    def save_customer(self, customer: Customer):
        self.customers[customer.id] = customer
        self.save_customers()

    def get_all_tickets(self) -> List[Ticket]:
        return list(self.tickets.values())

    def get_customer_tickets(self, customer_id: str) -> List[Ticket]:
        return [t for t in self.tickets.values() if t.customer_id == customer_id]

    def get_ticket(self, ticket_id: str) -> Optional[Ticket]:
        return self.tickets.get(ticket_id)

    def save_ticket(self, ticket: Ticket):
        self.tickets[ticket.id] = ticket
        self.save_tickets()

db = Database()
