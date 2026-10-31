def test_login_success(client, seed_test_data):
    response = client.post("/api/v1/auth/login", json={
        "username": "admin_test",
        "password": "pass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client, seed_test_data):
    response = client.post("/api/v1/auth/login", json={
        "username": "admin_test",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_protected_route_without_token(client):
    response = client.get("/api/v1/departments")
    assert response.status_code == 401

def test_profile_me_endpoint(client, admin_headers, seed_test_data):
    response = client.get("/api/v1/auth/me", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert data["role"] == "ADMIN"
