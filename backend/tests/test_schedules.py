def test_schedule_creation_success(client, admin_headers, seed_test_data):
    resp = client.post("/api/v1/schedules", headers=admin_headers, json={
        "room_id": seed_test_data["room"].room_id,
        "course_id": seed_test_data["course"].course_id,
        "faculty_id": seed_test_data["f1"].faculty_id,
        "activity_type": "LECTURE",
        "title": "Algorithms Lecture",
        "day_of_week": "Monday",
        "start_time": "09:00:00",
        "end_time": "10:30:00"
    })
    assert resp.status_code == 201

def test_room_booking_overlap_conflict(client, admin_headers, seed_test_data):
    # First booking: Room 101, Monday 09:00 - 10:30
    client.post("/api/v1/schedules", headers=admin_headers, json={
        "room_id": seed_test_data["room"].room_id,
        "course_id": seed_test_data["course"].course_id,
        "faculty_id": seed_test_data["f1"].faculty_id,
        "activity_type": "LECTURE",
        "title": "First Session",
        "day_of_week": "Tuesday",
        "start_time": "09:00:00",
        "end_time": "10:30:00"
    })

    # Overlapping booking in SAME room: Tuesday 10:00 - 11:00 (overlaps from 10:00 to 10:30)
    conflict_resp = client.post("/api/v1/schedules", headers=admin_headers, json={
        "room_id": seed_test_data["room"].room_id,
        "course_id": seed_test_data["course"].course_id,
        "faculty_id": seed_test_data["f2"].faculty_id,
        "activity_type": "LAB",
        "title": "Overlapping Session",
        "day_of_week": "Tuesday",
        "start_time": "10:00:00",
        "end_time": "11:00:00"
    })
    assert conflict_resp.status_code == 409
    assert "scheduling conflict" in conflict_resp.json()["detail"].lower()

def test_invalid_schedule_time_order(client, admin_headers, seed_test_data):
    # End time before start time
    resp = client.post("/api/v1/schedules", headers=admin_headers, json={
        "room_id": seed_test_data["room"].room_id,
        "activity_type": "LECTURE",
        "title": "Bad Times",
        "day_of_week": "Wednesday",
        "start_time": "11:00:00",
        "end_time": "10:00:00"
    })
    assert resp.status_code == 400
