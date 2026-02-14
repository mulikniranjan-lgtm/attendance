const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMETABLE_KEY = "attendance_timetable_v1";
const ATTENDANCE_KEY = "attendance_records_v1";

let appState = {
  timetable: loadTimetable(),
  attendance: loadAttendance(),
  currentPage: "dashboard",
  calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: formatDate(new Date())
};

document.addEventListener("DOMContentLoaded", init);

/* ================= INIT ================= */

function init() {
  bindNavigation();
  bindCalendarControls();
  bindSaveTimetable();
  renderManageTimetable();
  renderCalendar();
  renderAll();
}


/* ================= NAVIGATION ================= */

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.page;
      if (!target) return;

      document.querySelectorAll(".nav-btn")
        .forEach(n => n.classList.remove("active"));

      btn.classList.add("active");

      document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

      document.getElementById(target)?.classList.add("active");

      renderAll();
    });
  });
}

/* ================= WEEKLY VIEW ================= */

function renderWeeklyView() {
  const grid = document.getElementById("weeklyGrid");
  if (!grid) return;

  grid.innerHTML = "";

  DAYS.forEach(day => {
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `<h3>${day}</h3>`;

    const periods = appState.timetable[day] || [];

    if (!periods.length) {
      card.innerHTML += `<p class="hint">No lectures</p>`;
    }

    periods.forEach(period => {
      const date = getCurrentWeekDate(day);
      const key = attendanceKey(date, day, period.id);
      const record = appState.attendance[key];

      const div = document.createElement("div");
      div.className = "period-item";

      div.innerHTML = `
        <h4>${period.subject}</h4>
        <small>${period.time}</small>
        <div class="action-row">
          <button class="mark-btn present ${record?.status === "present" ? "active" : ""}">
            Present
          </button>
          <button class="mark-btn absent ${record?.status === "absent" ? "active" : ""}">
            Absent
          </button>
        </div>
      `;

      div.querySelector(".present").onclick = () =>
        markAttendance(date, day, period, "present");

      div.querySelector(".absent").onclick = () =>
        markAttendance(date, day, period, "absent");

      card.appendChild(div);
    });

    grid.appendChild(card);
  });
}

/* ================= MARK ATTENDANCE ================= */

function markAttendance(date, day, period, status) {
  const key = attendanceKey(date, day, period.id);

  appState.attendance[key] = {
    date,
    day,
    subject: period.subject,
    status
  };

  saveAttendance(appState.attendance);
  renderAll();
}

/* ================= MANAGE TIMETABLE ================= */

function renderManageTimetable() {
  const container = document.getElementById("manageDays");
  if (!container) return;

  container.innerHTML = "";

  DAYS.forEach(day => {
    const card = document.createElement("div");
    card.className = "manage-day glass";

    card.innerHTML = `<h3>${day}</h3>`;

    const periods = appState.timetable[day] || [];

    periods.forEach(period => {
      const row = createPeriodRow(period.time, period.subject);
      card.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add Period";
    addBtn.className = "primary";
    addBtn.onclick = () => {
      const row = createPeriodRow("", "");
      card.appendChild(row);
    };

    card.appendChild(addBtn);
    container.appendChild(card);
  });
}

function createPeriodRow(time, subject) {
  const row = document.createElement("div");
  row.className = "period-row glass-soft";

  row.innerHTML = `
    <input type="text" class="period-time" placeholder="10:00-12:00" value="${time}">
    <input type="text" class="period-subject" placeholder="Subject name" value="${subject}">
    <button class="danger delete-period">Delete</button>
  `;

  row.querySelector(".delete-period").onclick = () => row.remove();

  return row;
}

function bindSaveTimetable() {
  const btn = document.getElementById("saveTimetable");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const timetable = {};
    const cards = document.querySelectorAll(".manage-day");

    cards.forEach((card, index) => {
      const day = DAYS[index];
      const rows = card.querySelectorAll(".period-row");

      timetable[day] = [];

      rows.forEach((row, i) => {
        const time = row.querySelector(".period-time").value.trim();
        const subject = row.querySelector(".period-subject").value.trim();

        if (time && subject) {
          timetable[day].push({
            id: `${day}-${Date.now()}-${i}`,
            time,
            subject
          });
        }
      });
    });

    appState.timetable = timetable;
    window.localStorage.setItem(
      TIMETABLE_KEY,
      JSON.stringify(timetable)
    );

    renderAll();
  });
}

/* ================= DASHBOARD ================= */

function renderDashboard() {
  const stats = calculateStats();
  const overall = document.getElementById("overallStats");
  if (!overall) return;

  overall.innerHTML = `
    <div class="stat-card"><small>Overall Attendance</small><h3>${stats.overallPct.toFixed(1)}%</h3></div>
    <div class="stat-card"><small>Total Lectures</small><h3>${stats.totalLectures}</h3></div>
    <div class="stat-card"><small>Total Present</small><h3>${stats.totalPresent}</h3></div>
    <div class="stat-card"><small>Total Absent</small><h3>${stats.totalAbsent}</h3></div>
  `;
}

/* ================= CALCULATIONS ================= */

function calculateStats() {
  const records = Object.values(appState.attendance);

  const totalLectures = records.length;
  const totalPresent = records.filter(r => r.status === "present").length;
  const totalAbsent = records.filter(r => r.status === "absent").length;

  const overallPct =
    totalLectures ? (totalPresent / totalLectures) * 100 : 0;

  return { totalLectures, totalPresent, totalAbsent, overallPct };
}

/* ================= HELPERS ================= */

function getCurrentWeekDate(dayName) {
  const now = new Date();
  const dayIndex = DAYS.indexOf(dayName);
  const currentDay = now.getDay();
  const diff = dayIndex + 1 - currentDay;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return formatDate(result);
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function attendanceKey(date, day, periodId) {
  return `${date}__${day}__${periodId}`;
}

function loadTimetable() {
  const saved = window.localStorage.getItem(TIMETABLE_KEY);

  if (saved) return JSON.parse(saved);

  const defaultTimetable = {
    Monday: [
      { id: "mon1", time: "10:00-12:00", subject: "OOP Practical" },
      { id: "mon2", time: "12:45-2:45", subject: "Soft Skills" },
      { id: "mon3", time: "3:00-4:00", subject: "Python for Data Science" },
      { id: "mon4", time: "4:00-5:00", subject: "Employability Enhancement Skills 1" }
    ],
    Tuesday: [
      { id: "tue1", time: "10:00-12:00", subject: "PDS Practical" },
      { id: "tue2", time: "12:45-1:45", subject: "Python for Data Science" },
      { id: "tue3", time: "1:45-2:45", subject: "Operating System" },
      { id: "tue4", time: "3:00-4:00", subject: "Object Oriented Programming" },
      { id: "tue5", time: "4:00-5:00", subject: "Employability Enhancement Skills 1" }
    ],
    Wednesday: [
      { id: "wed1", time: "10:00-12:00", subject: "Mini Project" },
      { id: "wed2", time: "12:45-1:45", subject: "Operating System" },
      { id: "wed3", time: "1:45-2:45", subject: "Python for Data Science" },
      { id: "wed4", time: "3:00-4:00", subject: "Open Elective" },
      { id: "wed5", time: "4:00-5:00", subject: "Environmental Science" }
    ],
    Thursday: [
      { id: "thu1", time: "10:00-12:00", subject: "Computer Maintenance Technology" },
      { id: "thu2", time: "12:45-1:45", subject: "Object Oriented Programming" },
      { id: "thu3", time: "1:45-2:45", subject: "Operating System" },
      { id: "thu4", time: "3:00-5:00", subject: "MDM" }
    ],
    Friday: [
      { id: "fri1", time: "10:00-12:00", subject: "OOP Practical" },
      { id: "fri2", time: "12:45-1:45", subject: "Open Elective" },
      { id: "fri3", time: "1:45-2:45", subject: "Operating System" },
      { id: "fri4", time: "3:00-4:00", subject: "Environmental Science" },
      { id: "fri5", time: "4:00-5:00", subject: "Library Hour" }
    ]
  };

  window.localStorage.setItem(
    TIMETABLE_KEY,
    JSON.stringify(defaultTimetable)
  );

  return defaultTimetable;
}


function loadAttendance() {
  const saved = window.localStorage.getItem(ATTENDANCE_KEY);
  return saved ? JSON.parse(saved) : {};
}

function saveAttendance(data) {
  window.localStorage.setItem(
    ATTENDANCE_KEY,
    JSON.stringify(data)
  );
}

function renderAll() {
  renderWeeklyView();
  renderDashboard();
}

function bindCalendarControls() {
  const prev = document.getElementById("prevMonth");
  const next = document.getElementById("nextMonth");

  if (!prev || !next) return;

  prev.onclick = () => {
    appState.calendarMonth =
      new Date(
        appState.calendarMonth.getFullYear(),
        appState.calendarMonth.getMonth() - 1,
        1
      );
    renderCalendar();
  };

  next.onclick = () => {
    appState.calendarMonth =
      new Date(
        appState.calendarMonth.getFullYear(),
        appState.calendarMonth.getMonth() + 1,
        1
      );
    renderCalendar();
  };
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("monthTitle");

  if (!grid || !title) return;

  grid.innerHTML = "";

  const month = appState.calendarMonth;

  title.textContent = month.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  // 🔹 Add day names header
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  dayNames.forEach(name => {
    const header = document.createElement("div");
    header.className = "calendar-day-name";
    header.textContent = name;
    grid.appendChild(header);
  });

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const daysInMonth =
    new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  // 🔹 Blank spaces before month starts
  for (let i = 0; i < startOffset; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell muted";
    grid.appendChild(blank);
  }

  // 🔹 Actual days
for (let day = 1; day <= daysInMonth; day++) {
  const date = new Date(month.getFullYear(), month.getMonth(), day);
  const dateStr = formatDate(date);

  const cell = document.createElement("div");
  cell.className = "calendar-cell";

  const dayNumber = document.createElement("strong");
  dayNumber.textContent = day;
  cell.appendChild(dayNumber);

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long"
  });



  // 📝 Show Assignments (if stored in localStorage)
  const assignments =
    JSON.parse(localStorage.getItem("assignment_tasks_v1") || "[]");

  assignments
  .filter(a => a.dueDate === dateStr && !a.completed)
  .forEach(a => {

    const today = new Date();
    today.setHours(0,0,0,0);

    const due = new Date(a.dueDate);
    due.setHours(0,0,0,0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const task = document.createElement("div");
    task.className = "calendar-assignment";

    let label = "";

    if (diffDays > 1) {
      label = `${diffDays}d left`;
    } else if (diffDays === 1) {
      label = "Tomorrow";
    } else if (diffDays === 0) {
      label = "Today";
    } else {
      label = "Overdue";
      task.classList.add("overdue");
    }

    task.textContent = `📝 ${a.title} • ${label}`;

    cell.appendChild(task);
  });


  cell.onclick = () => {
    appState.selectedDate = dateStr;
    renderSelectedDateEditor();
  };

  grid.appendChild(cell);
}

}


function renderSelectedDateEditor() {
  const container = document.getElementById("selectedDatePeriods");
  const title = document.getElementById("selectedDateTitle");

  if (!container || !title) return;

  const date = appState.selectedDate;
  title.textContent = "Attendance for " + date;

  container.innerHTML = "";

  const dayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "long"
  });

  if (!DAYS.includes(dayName)) {
    container.innerHTML = "<p>No classes (Weekend)</p>";
    return;
  }

  const periods = appState.timetable[dayName] || [];

  if (!periods.length) {
    container.innerHTML = "<p>No lectures scheduled</p>";
    return;
  }

  periods.forEach(period => {
    const key = attendanceKey(date, dayName, period.id);
    const record = appState.attendance[key];

    const div = document.createElement("div");
    div.className = "period-item";

    div.innerHTML = `
      <h4>${period.subject}</h4>
      <small>${period.time}</small>
      <div class="action-row">
        <button class="mark-btn present ${record?.status === "present" ? "active" : ""}">
          Present
        </button>
        <button class="mark-btn absent ${record?.status === "absent" ? "active" : ""}">
          Absent
        </button>
      </div>
    `;

    div.querySelector(".present").onclick = () =>
      markAttendance(date, dayName, period, "present");

    div.querySelector(".absent").onclick = () =>
      markAttendance(date, dayName, period, "absent");

    container.appendChild(div);
  });
}
