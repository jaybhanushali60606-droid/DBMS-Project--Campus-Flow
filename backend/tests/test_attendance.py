from datetime import date, time

def test_faculty_mark_attendance(client, faculty_headers, seed_test_data):
    # 1. Create a lecture by faculty f1
    lec_resp = client.post("/api/v1/lectures", headers=faculty_headers, json={
        "course_id": seed_test_data["course"].course_id,
        "faculty_id": seed_test_data["f1"].faculty_id,
        "date": str(date.today()),
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "topic": "ER Modeling"
    })
    assert lec_resp.status_code == 201
    lec_id = lec_resp.json()["lecture_id"]

    # 2. Mark attendance for enrolled students
    att_resp = client.post("/api/v1/attendance/submit", headers=faculty_headers, json={
        "lecture_id": lec_id,
        "records": [
            {"student_id": seed_test_data["s1"].student_id, "status": "PRESENT", "remarks": "On time"},
            {"student_id": seed_test_data["s2"].student_id, "status": "ABSENT", "remarks": "Medical"}
        ]
    })
    assert att_resp.status_code == 200
    res = att_resp.json()
    assert res["present_count"] == 1
    assert res["absent_count"] == 1

def test_unauthorized_faculty_cannot_mark_attendance(client, other_faculty_headers, faculty_headers, seed_test_data):
    # Lecture belongs to f1
    lec_resp = client.post("/api/v1/lectures", headers=faculty_headers, json={
        "course_id": seed_test_data["course"].course_id,
        "faculty_id": seed_test_data["f1"].faculty_id,
        "date": str(date.today()),
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "topic": "SQL Joins"
    })
    lec_id = lec_resp.json()["lecture_id"]

    # Other faculty (f2) tries to mark attendance for f1's lecture
    att_resp = client.post("/api/v1/attendance/submit", headers=other_faculty_headers, json={
        "lecture_id": lec_id,
        "records": [
            {"student_id": seed_test_data["s1"].student_id, "status": "PRESENT"}
        ]
    })
    assert att_resp.status_code == 403

def test_student_cannot_view_other_student_attendance(client, student1_headers, seed_test_data):
    # s1 tries to view s2's attendance records
    resp = client.get(f"/api/v1/students/{seed_test_data['s2'].student_id}/attendance", headers=student1_headers)
    assert resp.status_code == 403
