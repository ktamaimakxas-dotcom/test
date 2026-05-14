const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const dueInput = document.querySelector("#dueInput");
const statusInput = document.querySelector("#statusInput");
const taskList = document.querySelector("#taskList");
const todayLabel = document.querySelector("#todayLabel");
const taskCount = document.querySelector("#taskCount");
const todoCount = document.querySelector("#todoCount");
const doingCount = document.querySelector("#doingCount");
const doneCount = document.querySelector("#doneCount");
const progressValue = document.querySelector("#progressValue");
const progressRing = document.querySelector("#progressRing");
const clearDone = document.querySelector("#clearDone");
const filterButtons = document.querySelectorAll(".filter-button");

const STORAGE_KEY = "focus-desk-tasks";
const RING_LENGTH = 301.59;
const STATUSES = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
};

let tasks = loadTasks();
let currentFilter = "all";
let editingId = null;

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
    dueDate: dueInput.value,
    status: statusInput.value,
    createdAt: new Date().toISOString(),
  });

  taskInput.value = "";
  dueInput.value = "";
  statusInput.value = "todo";
  saveTasks();
  render();
});

taskList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  if (event.target.matches("[data-action='edit']")) {
    editingId = task.id;
    render();
  }

  if (event.target.matches(".task-delete")) {
    tasks = tasks.filter((entry) => entry.id !== task.id);
    saveTasks();
    render();
  }

  if (event.target.matches("[data-action='cancel']")) {
    editingId = null;
    render();
  }
});

taskList.addEventListener("change", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  if (event.target.matches(".status-select")) {
    task.status = event.target.value;
    saveTasks();
    render();
  }
});

taskList.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target.closest(".edit-form");
  if (!form) return;

  const task = tasks.find((entry) => entry.id === form.dataset.id);
  const title = form.elements.title.value.trim();
  if (!task || !title) return;

  task.title = title;
  task.dueDate = form.elements.dueDate.value;
  task.status = form.elements.status.value;
  editingId = null;
  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
    render();
  });
});

clearDone.addEventListener("click", () => {
  tasks = tasks.filter((task) => task.status !== "done");
  saveTasks();
  render();
});

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    return savedTasks.map(normalizeTask);
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function filteredTasks() {
  if (currentFilter === "active") return tasks.filter((task) => task.status !== "done");
  if (currentFilter === "done") return tasks.filter((task) => task.status === "done");
  return tasks;
}

function render() {
  const visibleTasks = filteredTasks();
  const todoTasks = tasks.filter((task) => task.status === "todo").length;
  const doingTasks = tasks.filter((task) => task.status === "doing").length;
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const percent = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  taskCount.textContent = `${tasks.length}件`;
  todoCount.textContent = todoTasks;
  doingCount.textContent = doingTasks;
  doneCount.textContent = doneTasks;
  progressValue.textContent = `${percent}%`;
  progressRing.style.strokeDashoffset = RING_LENGTH - (RING_LENGTH * percent) / 100;

  if (!visibleTasks.length) {
    taskList.innerHTML = `<li class="empty-state">${emptyMessage()}</li>`;
    return;
  }

  taskList.innerHTML = visibleTasks
    .map((task) => (task.id === editingId ? editTemplate(task) : taskTemplate(task)))
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

function normalizeTask(task) {
  const status = task.status ?? (task.done ? "done" : "todo");

  return {
    id: task.id ?? crypto.randomUUID(),
    title: task.title ?? "",
    dueDate: task.dueDate ?? "",
    status: STATUSES[status] ? status : "todo",
    createdAt: task.createdAt ?? new Date().toISOString(),
  };
}

function taskTemplate(task) {
  const dueClass = dueState(task.dueDate, task.status);
  const dueLabel = task.dueDate ? formatDueDate(task.dueDate) : "期限なし";

  return `
    <li class="task-item ${task.status}" data-id="${task.id}">
      <div class="task-main">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <span class="due-date ${dueClass}">${dueLabel}</span>
      </div>
      <select class="status-select status-${task.status}" aria-label="ステータス">
        ${statusOptions(task.status)}
      </select>
      <div class="task-actions">
        <button class="task-edit" type="button" data-action="edit" aria-label="編集">編集</button>
        <button class="task-delete" type="button" aria-label="削除">x</button>
      </div>
    </li>
  `;
}

function editTemplate(task) {
  return `
    <li class="task-item editing" data-id="${task.id}">
      <form class="edit-form" data-id="${task.id}">
        <input name="title" type="text" value="${escapeAttribute(task.title)}" aria-label="タスク名" />
        <input name="dueDate" type="date" value="${escapeAttribute(task.dueDate)}" aria-label="期限" />
        <select name="status" aria-label="ステータス">
          ${statusOptions(task.status)}
        </select>
        <div class="edit-actions">
          <button type="submit">保存</button>
          <button type="button" data-action="cancel">取消</button>
        </div>
      </form>
    </li>
  `;
}

function statusOptions(selectedStatus) {
  return Object.entries(STATUSES)
    .map(([value, label]) => {
      const selected = value === selectedStatus ? "selected" : "";
      return `<option value="${value}" ${selected}>${label}</option>`;
    })
    .join("");
}

function formatDueDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function dueState(dateValue, status) {
  if (!dateValue || status === "done") return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${dateValue}T00:00:00`);
  return dueDate < today ? "overdue" : "";
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

render();
