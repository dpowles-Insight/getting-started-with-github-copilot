from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture
def reset_activities():
    original = deepcopy(activities)
    yield
    activities.clear()
    activities.update(deepcopy(original))


def test_signup_adds_participant(reset_activities):
    client = TestClient(app)

    response = client.post("/activities/Chess Club/signup?email=student@mergington.edu")

    assert response.status_code == 200
    assert "student@mergington.edu" in activities["Chess Club"]["participants"]


def test_unregister_removes_participant(reset_activities):
    client = TestClient(app)

    response = client.delete("/activities/Chess Club/signup?email=michael@mergington.edu")

    assert response.status_code == 200
    assert "michael@mergington.edu" not in activities["Chess Club"]["participants"]
