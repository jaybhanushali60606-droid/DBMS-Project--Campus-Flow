from datetime import date

def test_monthly_defaulter_calculation(client, admin_headers, faculty_headers, seed_test_data):
    today = date.today()
    c_id = seed_test_data["course"].course_id
    f_id = seed_test_data["f1"].faculty_id
    s1_id = seed_test_data["s1"].student_id
    s2_id = seed_test_data["s2"].student_id

    # Create 4 lectures in current month
    for i in range(1, 5):
        l_resp = client.post("/api/v1/lectures", headers=faculty_headers, json={
            "course_id": c_id,
            "faculty_id": f_id,
            "date": str(today),
            "start_time": f"0{i}:00:00",
            "end_time": f"0{i+1}:00:00",
            "topic": f"Session {i}"
        })
        l_id = l_resp.json()["lecture_id"]

        # Student 1 attends 4/4 (100% -> NOT defaulter)
        # Student 2 attends 1/4 (25% -> DEFAULTER < 75%)
        client.post("/api/v1/attendance/submit", headers=faculty_headers, json={
            "lecture_id": l_id,
            "records": [
                {"student_id": s1_id, "status": "PRESENT"},
                {"student_id": s2_id, "status": "PRESENT" if i == 1 else "ABSENT"}
            ]
        })

    # Check defaulters endpoint
    defaulters_resp = client.get(
        f"/api/v1/attendance/defaulters?month={today.month}&year={today.year}&threshold=75.0&defaulter_only=true",
        headers=admin_headers
    )
    assert defaulters_resp.status_code == 200
    defaulters = defaulters_resp.json()

    # Verify Student 2 is in defaulter list
    defaulter_student_ids = [d["student_id"] for d in defaulters]
    assert s2_id in defaulter_student_ids
    assert s1_id not in defaulter_student_ids

    # Verify calculated percentage
    s2_record = next(d for d in defaulters if d["student_id"] == s2_id)
    assert s2_record["attendance_percentage"] == 25.0
    assert s2_record["is_defaulter"] is True
