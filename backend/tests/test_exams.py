from datetime import date

def test_exam_and_results_workflow(client, faculty_headers, seed_test_data):
    # 1. Create Exam
    ex_resp = client.post("/api/v1/exams", headers=faculty_headers, json={
        "course_id": seed_test_data["course"].course_id,
        "faculty_id": seed_test_data["f1"].faculty_id,
        "exam_type": "Final Exam",
        "exam_date": str(date.today()),
        "max_marks": 100.0
    })
    assert ex_resp.status_code == 201
    exam_id = ex_resp.json()["exam_id"]

    # 2. Submit Results
    res_resp = client.post("/api/v1/results/bulk", headers=faculty_headers, json={
        "exam_id": exam_id,
        "results": [
            {"student_id": seed_test_data["s1"].student_id, "marks": 88.0},
            {"student_id": seed_test_data["s2"].student_id, "marks": 62.0}
        ]
    })
    assert res_resp.status_code == 200

    # 3. View Results and verify automatic grade assignment
    view_resp = client.get(f"/api/v1/results?exam_id={exam_id}", headers=faculty_headers)
    assert view_resp.status_code == 200
    results = view_resp.json()
    assert len(results) == 2
    
    r1 = next(r for r in results if r["student_id"] == seed_test_data["s1"].student_id)
    assert r1["marks"] == 88.0
    assert r1["grade"] == "A"

    r2 = next(r for r in results if r["student_id"] == seed_test_data["s2"].student_id)
    assert r2["marks"] == 62.0
    assert r2["grade"] == "B"

def test_marks_validation_exceeding_max(client, faculty_headers, seed_test_data):
    # Exam max marks = 50
    ex_resp = client.post("/api/v1/exams", headers=faculty_headers, json={
        "course_id": seed_test_data["course"].course_id,
        "exam_type": "Quiz",
        "exam_date": str(date.today()),
        "max_marks": 50.0
    })
    exam_id = ex_resp.json()["exam_id"]

    # Student enters 55 marks (>50)
    res_resp = client.post("/api/v1/results/bulk", headers=faculty_headers, json={
        "exam_id": exam_id,
        "results": [
            {"student_id": seed_test_data["s1"].student_id, "marks": 55.0}
        ]
    })
    assert res_resp.status_code == 400
    assert "maximum marks" in res_resp.json()["detail"].lower()
