const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const taskList = document.querySelector("#taskList");
const todayLabel = document.querySelector("#todayLabel");
const taskCount = document.querySelector("#taskCount");
const activeCount = document.querySelector("#activeCount");
const doneCount = document.querySelector("#doneCount");
const progressValue = document.querySelector("#progressValue");
const progressRing = document.querySelector("#progressRing");
const clearDone = document.querySelector("#clearDone");
const filterButtons = document.querySelectorAll(".filter-button");

const STORAGE_KEY = "focus-desk-tasks";
const RING_LENGTH = 301.59;

let tasks = loadTasks();
let currentFilter = "all";

todayLabel.textContent = new Intl.DateTimeFormat("ja-JP", {
  month: "short",
  day: "numeric",
  weekday: "short",
}).format(new Date());

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();

  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: new Date().toISOString(),
  });

  taskInput.value = "";
  saveTasks();
  render();
});

taskList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  if (event.target.matches(".task-toggle")) {
    task.done = event.target.checked;
    saveTasks();
    render();
  }

  if (event.target.matches(".task-delete")) {
    tasks = tasks.filter((entry) => entry.id !== task.id);
    saveTasks();
    render();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
    render();
  });
});

clearDone.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  render();
});

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function filteredTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.done);
  if (currentFilter === "done") return tasks.filter((task) => task.done);
  return tasks;
}

function render() {
  const visibleTasks = filteredTasks();
  const doneTasks = tasks.filter((task) => task.done).length;
  const activeTasks = tasks.length - doneTasks;
  const percent = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  taskCount.textContent = `${tasks.length}件`;
  activeCount.textContent = activeTasks;
  doneCount.textContent = doneTasks;
  progressValue.textContent = `${percent}%`;
  progressRing.style.strokeDashoffset = RING_LENGTH - (RING_LENGTH * percent) / 100;

  if (!visibleTasks.length) {
    taskList.innerHTML = `<li class="empty-state">${emptyMessage()}</li>`;
    return;
  }

  taskList.innerHTML = visibleTasks
    .map(
      (task) => `
        <li class="task-item ${task.done ? "done" : ""}" data-id="${task.id}">
          <input class="task-toggle" type="checkbox" ${task.done ? "checked" : ""} aria-label="完了にする" />
          <span class="task-title">${escapeHtml(task.title)}</span>
          <button class="task-delete" type="button" aria-label="削除">x</button>
        </li>
      `,
    )
    .join("");
}

function emptyMessage() {
  if (currentFilter === "active") return "未完了のタスクはありません。";
  if (currentFilter === "done") return "完了済みのタスクはありません。";
  return "最初のタスクを追加してください。";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

render();
