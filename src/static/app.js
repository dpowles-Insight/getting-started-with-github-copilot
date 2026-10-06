document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let pendingUndo = null;
  let countdownTimer = null;
  let hideTimer = null;

  function clearUndoState() {
    pendingUndo = null;
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    messageDiv.innerHTML = "";
    messageDiv.classList.add("hidden");
  }

  function showMessage(text, type, undoAction = null) {
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    messageDiv.innerHTML = "";

    const textNode = document.createElement("span");
    textNode.textContent = text;
    messageDiv.appendChild(textNode);

    if (undoAction) {
      const actionWrapper = document.createElement("span");
      actionWrapper.className = "undo-controls";

      const countdown = document.createElement("span");
      countdown.className = "undo-countdown";
      countdown.textContent = "5s";
      actionWrapper.appendChild(countdown);

      const undoButton = document.createElement("button");
      undoButton.type = "button";
      undoButton.className = "undo-button";
      undoButton.setAttribute("aria-label", "Undo removal");
      undoButton.title = "Undo removal";
      undoButton.textContent = "↶";
      undoButton.addEventListener("click", async () => {
        const response = await fetch(
          `/activities/${encodeURIComponent(undoAction.activity)}/signup?email=${encodeURIComponent(undoAction.email)}`,
          {
            method: "POST",
          }
        );

        const result = await response.json();

        if (response.ok) {
          messageDiv.textContent = `Restored ${undoAction.email}`;
          messageDiv.className = "success";
          await fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Undo failed";
          messageDiv.className = "error";
        }

        if (countdownTimer) {
          clearTimeout(countdownTimer);
          countdownTimer = null;
        }
        pendingUndo = null;

        setTimeout(() => {
          clearUndoState();
        }, 2000);
      });

      actionWrapper.appendChild(undoButton);
      messageDiv.appendChild(actionWrapper);

      let remaining = 5;
      const updateCountdown = () => {
        if (remaining <= 0) {
          clearUndoState();
          return;
        }

        countdown.textContent = `${remaining}s`;
        remaining -= 1;
        countdownTimer = setTimeout(updateCountdown, 1000);
      };

      updateCountdown();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participants = (details.participants || []).length
          ? details.participants
              .map(
                (email) => `
                  <li class="participant-item">
                    <span class="participant-email">${email}</span>
                    <button
                      type="button"
                      class="delete-participant"
                      data-activity="${name}"
                      data-email="${email}"
                      aria-label="Remove ${email} from ${name}"
                      title="Remove participant"
                    >
                      ✕
                    </button>
                  </li>
                `
              )
              .join("")
          : "<li class='participant-empty'>No participants yet</li>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            <ul>
              ${participants}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-participant").forEach((button) => {
        button.addEventListener("click", async () => {
          const activity = button.dataset.activity;
          const email = button.dataset.email;

          try {
            const response = await fetch(
              `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
              {
                method: "DELETE",
              }
            );

            const result = await response.json();

            if (response.ok) {
              const undoAction = { activity, email };
              pendingUndo = undoAction;
              showMessage(`${result.message}.`, "success", undoAction);
              await fetchActivities();
            } else {
              messageDiv.textContent = result.detail || "An error occurred";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }

            if (response.ok) {
              setTimeout(() => {
                if (pendingUndo) {
                  messageDiv.classList.remove("hidden");
                }
              }, 0);
            }
          } catch (error) {
            messageDiv.textContent = "Failed to remove participant.";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
            console.error("Error removing participant:", error);
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      hideTimer = setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);

      if (countdownTimer) {
        clearTimeout(countdownTimer);
        countdownTimer = null;
      }
      pendingUndo = null;
      messageDiv.innerHTML = messageDiv.textContent;
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
