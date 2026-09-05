from typing import List, Optional
from backend.database import db
from backend.models import Customer, Ticket

class CustomerService:
    @staticmethod
    def get_customer(customer_id: str) -> Optional[Customer]:
        return db.get_customer(customer_id)

    @staticmethod
    def get_all_customers() -> List[Customer]:
        return db.get_all_customers()

customer_service = CustomerService()
