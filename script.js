const STORAGE_KEYS = {
  classes: "assignment-tracker-classes",
  assignments: "assignment-tracker-items"
};

const DEFAULT_CLASSES = ["Cybersecurity", "Numerical Methods", "Systems Programming"];
const CLASS_COLORS = ["#2457d6", "#f59e0b", "#16a085", "#8b5cf6", "#e8596a", "#0891b2"];

let classes = readStorage(STORAGE_KEYS.classes, DEFAULT_CLASSES);
let assignments = readStorage(STORAGE_KEYS.assignments, []);
let editingId = null;

const elements = {
  assignmentForm: document.querySelector("#assignment-form"),
  assignmentName: document.querySelector("#assignment-name"),
  assignmentClass: document.querySelector("#assignment-class"),
  dueDate: document.querySelector("#due-date"),
  formHeading: document.querySelector("#form-heading"),
  submitLabel: document.querySelector("#submit-label"),
  cancelEdit: document.querySelector("#cancel-edit"),
  classForm: document.querySelector("#class-form"),
  className: document.querySelector("#class-name"),
  classList: document.querySelector("#class-list"),
  toggleClassForm: document.querySelector("#toggle-class-form"),
  upcomingList: document.querySelector("#upcoming-list"),
  completedList: document.querySelector("#completed-list"),
  completedSection: document.querySelector("#completed-section"),
  emptyState: document.querySelector("#empty-state"),
  clearCompleted: document.querySelector("#clear-completed"),
  assignmentTemplate: document.querySelector("#assignment-template")
};

document.querySelector("#today").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "long", day: "numeric"
}).format(new Date());

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.classes, JSON.stringify(classes));
  localStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(assignments));
}

function makeId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function render() {
  renderClasses();
  renderAssignments();
  saveData();
}

function renderClasses() {
  if (!classes.includes(elements.assignmentClass.value)) {
    elements.assignmentClass.innerHTML = "";
    if (!classes.length) {
      elements.assignmentClass.add(new Option("Add a class first", ""));
    } else {
      classes.forEach(name => elements.assignmentClass.add(new Option(name, name)));
    }
  }

  elements.classList.innerHTML = "";
  classes.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "class-item";
    const inUse = assignments.some(item => item.className === name);
    row.innerHTML = `
      <span class="class-dot" style="background:${CLASS_COLORS[index % CLASS_COLORS.length]}"></span>
      <span></span>
      <button class="class-delete" type="button" aria-label="Delete ${escapeHtml(name)}" ${inUse ? "disabled title=\"Delete this class's assignments first\"" : ""}>×</button>
    `;
    row.children[1].textContent = name;
    row.querySelector("button").addEventListener("click", () => {
      classes = classes.filter(item => item !== name);
      render();
    });
    elements.classList.append(row);
  });

  document.querySelector("#class-count").textContent = classes.length;
}

function renderAssignments() {
  elements.upcomingList.innerHTML = "";
  elements.completedList.innerHTML = "";

  const upcoming = assignments.filter(item => !item.completed).sort((a, b) => a.due.localeCompare(b.due));
  const completed = assignments.filter(item => item.completed).sort((a, b) => b.due.localeCompare(a.due));

  upcoming.forEach(item => elements.upcomingList.append(createAssignmentRow(item)));
  completed.forEach(item => elements.completedList.append(createAssignmentRow(item)));

  elements.emptyState.classList.toggle("hidden", upcoming.length > 0);
  elements.completedSection.classList.toggle("hidden", completed.length === 0);
  document.querySelector("#upcoming-count").textContent = upcoming.length;
  document.querySelector("#completed-count").textContent = completed.length;
  document.querySelector("#header-count").textContent = upcoming.length;
}

function createAssignmentRow(item) {
  const row = elements.assignmentTemplate.content.firstElementChild.cloneNode(true);
  row.classList.toggle("completed", item.completed);
  row.querySelector(".assignment-title").textContent = item.title;
  row.querySelector(".assignment-class").textContent = item.className;
  row.querySelector(".assignment-date").textContent = formatDate(item.due);
  row.querySelector(".assignment-date").dateTime = item.due;

  const completeButton = row.querySelector(".complete-button");
  completeButton.textContent = item.completed ? "✓" : "○";
  completeButton.setAttribute("aria-label", item.completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`);
  completeButton.addEventListener("click", () => {
    item.completed = !item.completed;
    render();
  });

  row.querySelector(".edit-button").addEventListener("click", () => startEditing(item));
  row.querySelector(".delete-button").addEventListener("click", () => {
    assignments = assignments.filter(entry => entry.id !== item.id);
    if (editingId === item.id) resetAssignmentForm();
    render();
  });
  return row;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function startEditing(item) {
  editingId = item.id;
  elements.assignmentName.value = item.title;
  elements.assignmentClass.value = item.className;
  elements.dueDate.value = item.due;
  elements.formHeading.textContent = "Edit assignment";
  elements.submitLabel.textContent = "Save changes";
  elements.cancelEdit.classList.remove("hidden");
  elements.assignmentName.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAssignmentForm() {
  editingId = null;
  elements.assignmentForm.reset();
  elements.formHeading.textContent = "Add assignment";
  elements.submitLabel.textContent = "Add assignment";
  elements.cancelEdit.classList.add("hidden");
}

elements.assignmentForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = elements.assignmentName.value.trim();
  const className = elements.assignmentClass.value;
  const due = elements.dueDate.value;
  if (!title || !className || !due) return;

  if (editingId) {
    const item = assignments.find(entry => entry.id === editingId);
    Object.assign(item, { title, className, due });
  } else {
    assignments.push({ id: makeId(), title, className, due, completed: false });
  }
  resetAssignmentForm();
  render();
});

elements.cancelEdit.addEventListener("click", resetAssignmentForm);
elements.toggleClassForm.addEventListener("click", () => {
  elements.classForm.classList.toggle("hidden");
  elements.toggleClassForm.textContent = elements.classForm.classList.contains("hidden") ? "＋" : "×";
  if (!elements.classForm.classList.contains("hidden")) elements.className.focus();
});

elements.classForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = elements.className.value.trim();
  if (!name || classes.some(item => item.toLowerCase() === name.toLowerCase())) return;
  classes.push(name);
  elements.className.value = "";
  elements.classForm.classList.add("hidden");
  elements.toggleClassForm.textContent = "＋";
  render();
  elements.assignmentClass.value = name;
});

elements.clearCompleted.addEventListener("click", () => {
  assignments = assignments.filter(item => !item.completed);
  render();
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

render();
