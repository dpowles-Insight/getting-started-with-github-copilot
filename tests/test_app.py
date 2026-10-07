from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture
def reset_activities():
    """Reset the in-memory activity data before and after each test."""
    original = deepcopy(activities)
    yield
    activities.clear()
    activities.update(deepcopy(original))


def test_get_activities_returns_activity_list(reset_activities):
    # Arrange
    client = TestClient(app)

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert "Chess Club" in response.json()
    assert "Programming Class" in response.json()


def test_signup_adds_participant(reset_activities):
    # Arrange
    client = TestClient(app)
    email = "student@mergington.edu"

    # Act
    response = client.post(f"/activities/Chess Club/signup?email={email}")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert email in activities["Chess Club"]["participants"]


def test_signup_rejects_duplicate_email(reset_activities):
    # Arrange
    client = TestClient(app)
    email = "michael@mergington.edu"

    # Act
    response = client.post(f"/activities/Chess Club/signup?email={email}")

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Student is already signed up for this activity"}


def test_unregister_removes_participant(reset_activities):
    # Arrange
    client = TestClient(app)
    email = "michael@mergington.edu"

    # Act
    response = client.delete(f"/activities/Chess Club/signup?email={email}")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Removed {email} from Chess Club"}
    assert email not in activities["Chess Club"]["participants"]
