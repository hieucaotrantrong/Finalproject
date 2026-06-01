import os
import random
import time
from uuid import uuid4
from locust import HttpUser, task, between, SequentialTaskSet

# Configure via environment or edit defaults below
TEST_USER_EMAIL = os.getenv('LOCUST_TEST_EMAIL', 'user1@example.com')
TEST_USER_PASSWORD = os.getenv('LOCUST_TEST_PASSWORD', '123456')

class UserBehavior(SequentialTaskSet):
    def on_start(self):
        # Try to login first with shared test account
        resp = self.client.post('/api/auth/login', json={
            'email': TEST_USER_EMAIL,
            'password': TEST_USER_PASSWORD
        })

        # If login fails (no shared account), create a unique test account per user to avoid duplicate-email failures
        if resp.status_code != 200:
            base, at, domain = TEST_USER_EMAIL.partition('@')
            unique_email = f"{base}+{uuid4().hex[:8]}@{domain}" if at else f"{base}-{uuid4().hex[:8]}@example.com"
            signup_resp = self.client.post('/api/auth/signup', json={
                'name': unique_email.split('@')[0],
                'lname': 'Locust',
                'email': unique_email,
                'password': TEST_USER_PASSWORD,
                'cpassword': TEST_USER_PASSWORD
            })
            # try login with the newly created unique account
            if signup_resp.status_code in (200, 201):
                resp = self.client.post('/api/auth/login', json={
                    'email': unique_email,
                    'password': TEST_USER_PASSWORD
                })
            else:
                # fallback: attempt login again with shared account
                resp = self.client.post('/api/auth/login', json={
                    'email': TEST_USER_EMAIL,
                    'password': TEST_USER_PASSWORD
                })

        try:
            body = resp.json()
        except Exception:
            body = {}

        self.token = body.get('token')
        self.user_info = body.get('user')

        if self.token:
            # attach Authorization header for subsequent requests
            self.client.headers.update({'Authorization': f'Bearer {self.token}'})

    @task(3)
    def get_products(self):
        with self.client.get('/api/products', name='/api/products', catch_response=True) as r:
            if r.status_code != 200:
                r.failure(f'GET /api/products returned {r.status_code}')
                return
            try:
                data = r.json()
            except Exception:
                r.failure('Invalid JSON')
                return
            if not isinstance(data, list):
                r.failure('Expected list')
                return
            # pick a product id for next step
            if len(data) > 0:
                self._last_product_id = data[0].get('id')
            else:
                self._last_product_id = None

    @task(2)
    def get_product_by_id(self):
        pid = getattr(self, '_last_product_id', None)
        if not pid:
            # try to fetch products first
            resp = self.client.get('/api/products')
            try:
                arr = resp.json()
                pid = arr[0].get('id') if arr and isinstance(arr, list) and len(arr) > 0 else None
            except Exception:
                pid = None

        if not pid:
            return

        with self.client.get(f'/api/products/{pid}', name='/api/products/:id', catch_response=True) as r:
            if r.status_code != 200:
                r.failure(f'GET /api/products/{pid} -> {r.status_code}')

    @task(1)
    def create_order_cod(self):
        # Create a COD order. Requires logged-in user (token)
        pid = getattr(self, '_last_product_id', None)
        if not pid:
            resp = self.client.get('/api/products')
            try:
                arr = resp.json()
                pid = arr[0].get('id') if arr and isinstance(arr, list) and len(arr) > 0 else None
            except Exception:
                pid = None

        if not pid:
            return

        body = {
            'fullName': self.user_info.get('first_name') if getattr(self, 'user_info', None) else 'Locust User',
            'email': self.user_info.get('email') if getattr(self, 'user_info', None) else TEST_USER_EMAIL,
            'phone': '0900000000',
            'address': 'Locust load test address',
            'productId': pid,
            'productTitle': 'load-test-product',
            'productPrice': 1000,
            'quantity': 1,
            'shippingFee': 0,
            'discountCode': None,
            'paymentMethod': 'cod',
            'returnUrl': 'http://localhost:5173/payment-result'
        }

        with self.client.post('/api/orders', json=body, name='/api/orders', catch_response=True) as r:
            if r.status_code not in (200, 201):
                r.failure(f'POST /api/orders -> {r.status_code} {r.text[:200]}')

class WebsiteUser(HttpUser):
    tasks = [UserBehavior]
    wait_time = between(1, 3)

# Notes:
# - Run with: locust -f client/locust/locustfile.py --host=http://localhost:5000
# - Open http://localhost:8089 to start the load test
# - Set environment variables LOCUST_TEST_EMAIL and LOCUST_TEST_PASSWORD if you want different credentials
