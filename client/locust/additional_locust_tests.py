import os
import time
import random
from uuid import uuid4
from locust import HttpUser, task, between, SequentialTaskSet

# Configure via environment or edit defaults below
TEST_USER_EMAIL = os.getenv('LOCUST_TEST_EMAIL', 'user1@example.com')
TEST_USER_PASSWORD = os.getenv('LOCUST_TEST_PASSWORD', '123456')
ADMIN_EMAIL = os.getenv('LOCUST_ADMIN_EMAIL', 'admin@example.com')
ADMIN_PASSWORD = os.getenv('LOCUST_ADMIN_PASSWORD', 'admin123')


class ExtendedUserBehavior(SequentialTaskSet):
    def on_start(self):
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
            self.client.headers.update({'Authorization': f'Bearer {self.token}'})

    @task(4)
    def get_products(self):
        with self.client.get('/api/products', name='/api/products', catch_response=True) as r:
            if r.status_code != 200:
                r.failure(f'GET /api/products -> {r.status_code}')
                return
            try:
                arr = r.json()
            except Exception:
                r.failure('Invalid JSON')
                return
            if isinstance(arr, list) and len(arr) > 0:
                self._last_product_id = arr[0].get('id')

    @task(3)
    def get_product_by_id(self):
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
        with self.client.get(f'/api/products/{pid}', name='/api/products/:id', catch_response=True) as r:
            if r.status_code != 200:
                r.failure(f'GET /api/products/{pid} -> {r.status_code}')

    @task(2)
    def create_order(self):
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
            'fullName': (self.user_info.get('first_name') if getattr(self, 'user_info', None) else 'Locust User'),
            'email': (self.user_info.get('email') if getattr(self, 'user_info', None) else TEST_USER_EMAIL),
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

    @task(1)
    def view_orders(self):
        # Try to view orders for logged-in user
        email = (self.user_info.get('email') if getattr(self, 'user_info', None) else TEST_USER_EMAIL)
        with self.client.get(f'/api/orders/user/{email}', name='/api/orders (user)', catch_response=True) as r:
            if r.status_code not in (200, 201):
                r.failure(f'GET /api/orders -> {r.status_code}')


class AdminBehavior(SequentialTaskSet):
    def on_start(self):
        resp = self.client.post('/api/auth/login', json={
            'email': ADMIN_EMAIL,
            'password': ADMIN_PASSWORD
        })
        try:
            body = resp.json()
        except Exception:
            body = {}
        self.token = body.get('token')
        if self.token:
            self.client.headers.update({'Authorization': f'Bearer {self.token}'})

    @task(3)
    def create_product(self):
        title = f"locust-product-{uuid4().hex[:8]}"
        # send a fuller payload to satisfy DB/controller expectations
        body = {
            'title': title,
            'description': 'Load test product',
            'originalprice': random.randint(1200, 15000),
            'price': random.randint(1000, 10000),
            'discount': 0,
            'tag': 'locust',
            'image': 'https://example.com/i.jpg',
            'images': ['https://example.com/i1.jpg'],
            'specs': [{'group_name': 'General', 'spec_key': 'Color', 'spec_value': 'Black'}],
            'specs_image': None,
            'category': 'locust',
            'is_out_of_stock': False
        }
        # small sleep to avoid hammering DB with identical rapid create requests
        time.sleep(random.uniform(0.05, 0.2))
        with self.client.post('/api/products', json=body, name='/api/products (create)', catch_response=True) as r:
            if r.status_code not in (200, 201):
                # log and back off on server errors
                r.failure(f'POST /api/products -> {r.status_code} {r.text[:200]}')
                if r.status_code >= 500:
                    time.sleep(random.uniform(1.0, 3.0))
            else:
                try:
                    obj = r.json()
                    self._last_created_product_id = obj.get('id')
                except Exception:
                    pass

    @task(2)
    def update_product(self):
        pid = getattr(self, '_last_created_product_id', None)
        if not pid:
            resp = self.client.get('/api/products')
            try:
                arr = resp.json()
                pid = arr[0].get('id') if arr and isinstance(arr, list) and len(arr) > 0 else None
            except Exception:
                pid = None
        if not pid:
            return
        # small sleep to reduce request bursts
        time.sleep(random.uniform(0.02, 0.1))
        # send update payload matching server's expected fields
        body = {
            'title': f'updated-{uuid4().hex[:6]}',
            'originalprice': random.randint(1200, 22000),
            'price': random.randint(1000, 20000),
            'discount': 0,
            'tag': 'locust-upd',
            'image': 'https://example.com/updated.jpg',
            'category': 'locust',
            'is_out_of_stock': False,
            'specs_image': None,
            'images': [],
            'specs': []
        }
        with self.client.put(f'/api/products/{pid}', json=body, name='/api/products (update)', catch_response=True) as r:
            if r.status_code not in (200, 201):
                r.failure(f'PUT /api/products/{pid} -> {r.status_code} {r.text[:200]}')
                if r.status_code >= 500:
                    time.sleep(random.uniform(0.5, 2.0))


class ChatbotBehavior(SequentialTaskSet):
    @task(1)
    def ask_bot(self):
        body = {'prompt': 'Tìm sản phẩm điện thoại giá rẻ, tối đa 5 triệu'}
        with self.client.post('/api/chatbot/chat', json=body, name='/api/chatbot', catch_response=True) as r:
            if r.status_code != 200:
                r.failure(f'POST /api/chatbot -> {r.status_code}')


class ExtendedWebsiteUser(HttpUser):
    tasks = [ExtendedUserBehavior, ChatbotBehavior]
    wait_time = between(1, 3)


class AdminUser(HttpUser):
    tasks = [AdminBehavior]
    wait_time = between(1, 3)

# Run with: locust -f client/locust/additional_locust_tests.py --host=http://localhost:5000
# Set env: LOCUST_TEST_EMAIL, LOCUST_TEST_PASSWORD, LOCUST_ADMIN_EMAIL, LOCUST_ADMIN_PASSWORD
