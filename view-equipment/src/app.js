const TOKEN_KEY = "makerspace-account";
const auth = document.querySelector("#auth");
const appShell = document.querySelector("#appShell");
const authMessage = document.querySelector("#authMessage");
const accountLine = document.querySelector("#accountLine");
const pageTitle = document.querySelector("#pageTitle");
const pageLede = document.querySelector("#pageLede");
const chooseView = document.querySelector("#chooseView");
const accountView = document.querySelector("#accountView");
const staffView = document.querySelector("#staffView");
const staffMessage = document.querySelector("#staffMessage");
const staffList = document.querySelector("#staffList");
const staffDetails = document.querySelector("#staffDetails");
const ticketsView = document.querySelector("#ticketsView");
const ticketsMessage = document.querySelector("#ticketsMessage");
const ticketsList = document.querySelector("#ticketsList");
const ticketsDetails = document.querySelector("#ticketsDetails");
const materialsView = document.querySelector("#materialsView");
const materialsMessage = document.querySelector("#materialsMessage");
const materialsList = document.querySelector("#materialsList");
const materialsDetails = document.querySelector("#materialsDetails");
const manageView = document.querySelector("#manageView");
const manageMessage = document.querySelector("#manageMessage");
const manageList = document.querySelector("#manageList");
const manageDetails = document.querySelector("#manageDetails");
let selectedMaterialId = "";
let materialRows = [];
let materialType = "";
let selectedAccountId = "";
let materialsCanManage = false;
let pendingBlockReason = "";
let ticketRows = [];
let ticketTypes = [];
let ticketType = "";
let pendingTicketType = "";
let accountRows = [];
let accountQuery = "";
let ticketGroup = "open";
let selectedTicketId = "";
let accountRole = "";
let historyScope = "mine";
let historyRows = [];
let pendingProfileUser = "";
let pendingReservationId = "";
const historyMessage = document.querySelector("#historyMessage");
const historyList = document.querySelector("#historyList");
const historyDetails = document.querySelector("#historyDetails");
const historyEquipment = document.querySelector("#historyEquipment");
const typeSelect = document.querySelector("#type");
const message = document.querySelector("#message");
const count = document.querySelector("#count");
const list = document.querySelector("#list");
const details = document.querySelector("#details");
let token = localStorage.getItem(TOKEN_KEY) || "";
const emptyDetails = `
  <div class="empty">
    <p class="eyebrow">Machine</p>
    <h2>Pick one</h2>
    <p>Each card is a machine you can book. Open it, then choose a free slot.</p>
  </div>
`;

function sessionHeader() {
  return token ? { "X-Session": token } : {};
}

function showSignedOut() {
  token = "";
  localStorage.removeItem(TOKEN_KEY);
  appShell.hidden = true;
  auth.hidden = false;
  document.title = "Sign in";
  if (location.hash !== "#/sign-in") location.hash = "#/sign-in";
  window.scrollTo(0, 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function roleLabel(role) {
  if (role === "staff") return "Staff";
  if (role === "user") return "User";
  return role;
}

function fillAccount(account) {
  accountLine.textContent = `${account.name} · ${account.email}`;
  const initial = (account.name || "?").trim().charAt(0).toUpperCase();
  document.querySelector("#accountAvatar").textContent = initial;
  document.querySelector("#accountName").textContent = account.name;
  document.querySelector("#accountEmail").textContent = account.email;
  document.querySelector("#accountRole").textContent = roleLabel(account.role);
  accountRole = account.role;
  document.querySelector("#openStaff").hidden = account.role !== "staff";
  document.querySelector("#openTickets").hidden = account.role !== "staff";
  document.querySelector("#openAllReservations").hidden = account.role !== "staff";
  document.querySelector("#openMaterials").hidden = account.role !== "staff";
  document.querySelector("#openManage").hidden = account.role !== "staff";
}

function showChoose() {
  chooseView.hidden = false;
  accountView.hidden = true;
  staffView.hidden = true;
  ticketsView.hidden = true;
  materialsView.hidden = true;
  manageView.hidden = true;
  document.querySelector("#backToChoices").hidden = true;
  pageTitle.textContent = "Choose what to book";
  pageLede.textContent = "Pick a machine. Open it to see the day and take a free slot.";
  document.title = "Choose what to book";
  if (location.hash !== "#/choose") location.hash = "#/choose";
  window.scrollTo(0, 0);
}

function showAccount() {
  chooseView.hidden = true;
  accountView.hidden = false;
  staffView.hidden = true;
  ticketsView.hidden = true;
  materialsView.hidden = true;
  manageView.hidden = true;
  document.querySelector("#backToChoices").hidden = false;
  historyScope = "mine";
  document.querySelector("#historyUserBlock").hidden = true;
  document.querySelector("#historyHeading").textContent = "Reservations";
  pageTitle.textContent = "My reservations";
  pageLede.textContent = "Your bookings, past and upcoming.";
  document.title = "My reservations";
  if (location.hash !== "#/account") location.hash = "#/account";
  window.scrollTo(0, 0);
  loadHistory().catch(showHistoryError);
}

function showAllReservations() {
  if (accountRole !== "staff") {
    showAccount();
    return;
  }
  chooseView.hidden = true;
  accountView.hidden = false;
  staffView.hidden = true;
  ticketsView.hidden = true;
  materialsView.hidden = true;
  manageView.hidden = true;
  historyScope = "all";
  document.querySelector("#historyUserBlock").hidden = false;
  document.querySelector("#historyHeading").textContent = "All reservations";
  document.querySelector("#backToChoices").hidden = false;
  pageTitle.textContent = "All reservations";
  pageLede.textContent = "Every booking, for every user.";
  document.title = "All reservations";
  if (location.hash !== "#/reservations") location.hash = "#/reservations";
  window.scrollTo(0, 0);
  loadHistory().catch(showHistoryError);
}

function showStaff() {
  if (accountRole !== "staff") {
    showAccount();
    return;
  }
  chooseView.hidden = true;
  accountView.hidden = true;
  staffView.hidden = false;
  ticketsView.hidden = true;
  materialsView.hidden = true;
  manageView.hidden = true;
  document.querySelector("#backToChoices").hidden = false;
  pageTitle.textContent = "Staff";
  pageLede.textContent = "Block a machine, or open it again.";
  document.title = "Staff";
  if (location.hash !== "#/staff") location.hash = "#/staff";
  window.scrollTo(0, 0);
  setBanner(staffMessage, "");
  loadStaff().catch(showStaffError);
}

function showTickets() {
  if (accountRole !== "staff") {
    showAccount();
    return;
  }
  chooseView.hidden = true;
  accountView.hidden = true;
  staffView.hidden = true;
  ticketsView.hidden = false;
  materialsView.hidden = true;
  manageView.hidden = true;
  document.querySelector("#backToChoices").hidden = false;
  pageTitle.textContent = "View tickets";
  pageLede.textContent = "Open reports stay here. Completed ones stay under Completed.";
  document.title = "View tickets";
  if (location.hash !== "#/tickets") location.hash = "#/tickets";
  window.scrollTo(0, 0);
  loadTickets().catch(showTicketsError);
}

function showSignedIn(account) {
  auth.hidden = true;
  appShell.hidden = false;
  fillAccount(account);
  if (location.hash === "#/account") showAccount();
  else if (location.hash === "#/staff") showStaff();
  else if (location.hash === "#/tickets") showTickets();
  else if (location.hash === "#/reservations") showAllReservations();
  else if (location.hash === "#/materials") showMaterials();
  else if (location.hash === "#/accounts") showManage();
  else showChoose();
}

function showAuthError(error) {
  const text = {
    InvalidCredentials: "Email or password is wrong.",
    LoginBlocked: "Sign-in is blocked for 15 minutes after 3 failed attempts.",
    AccountSuspended: "This account is suspended. Contact the makerspace staff.",
    EmailTaken: "An account with this email already exists.",
    InvalidRegistration: "Enter a name, a valid email, and a password of at least 8 characters.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(authMessage, text || "Something went wrong.", "is-blocked");
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.code = data.error;
    throw error;
  }
  return data;
}

function statusLabel(item) {
  if (item.status !== "blocked") return "Open";
  const extra = [item.reason, item.period].filter(Boolean).join(" · ");
  return extra ? `Blocked · ${extra}` : "Blocked";
}

function showError(error) {
  list.innerHTML = "";
  count.textContent = "";
  showEmptyDetails();
  const text = {
    NoSession: "Sign in to see the catalogue.",
    UnknownType: "Unknown type.",
    EquipmentNotFound: "Equipment not found.",
    InvalidDate: "Enter a valid date.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(message, text || "Something went wrong.", "is-blocked");
}

async function showAvailabilityError(error) {
  if (error.code === "NoSession") {
    showError(error);
    return;
  }
  if (error.code === "SlotTaken" || error.code === "MachineBlocked" || error.code === "InvalidSlot" || error.code === "PastSlot") {
    if (details.dataset.id) {
      try { await loadAvailability(details.dataset.id); } catch { /* keep the reservation error */ }
    }
    if (error.code === "MachineBlocked") return;
    const slotMessage = document.querySelector("#availabilityMessage");
    const suggestions = document.querySelector("#suggestions");
    const text = {
      SlotTaken: "This slot is no longer available.",
      MachineBlocked: "This machine is blocked.",
      InvalidSlot: "Choose one free hour from the day.",
      PastSlot: "This time has already passed."
    }[error.code];
    if (slotMessage) setBanner(slotMessage, text, "is-blocked");
    if (error.code === "SlotTaken" && suggestions) renderSuggestions(suggestions, error.suggestions);
    return;
  }
  const slotMessage = document.querySelector("#availabilityMessage");
  const slots = document.querySelector("#slots");
  const suggestions = document.querySelector("#suggestions");
  if (!slotMessage) {
    showError(error);
    return;
  }
  if (slots) slots.innerHTML = "";
  if (suggestions) suggestions.innerHTML = "";
  const text = {
    InvalidDate: "Enter a valid date.",
    EquipmentNotFound: "Equipment not found.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(slotMessage, text || "Something went wrong.", "is-blocked");
}

const DAY_PAGE = 7;
const DAY_LIMIT = 56;
const HISTORY_BACK = 120;
const HISTORY_AHEAD = 56;
let dayWindowStart = startOfToday();
let historyWindowStart = startOfToday();

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDay(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayOffset(from, to) {
  const utc = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc(to) - utc(from)) / 86400000);
}

function formatLongDay(date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function selectAvailabilityDate(iso) {
  const input = document.querySelector("#availabilityDate");
  if (!input) return;
  input.value = iso;
  const today = startOfToday();
  const offset = Math.max(0, Math.min(DAY_LIMIT, dayOffset(today, parseIsoDate(iso))));
  const page = Math.min(Math.floor(offset / DAY_PAGE) * DAY_PAGE, DAY_LIMIT - (DAY_PAGE - 1));
  dayWindowStart = shiftDay(today, page);
  renderDayStrip();
}

function renderDayStrip() {
  const strip = document.querySelector("#dayStrip");
  const input = document.querySelector("#availabilityDate");
  const heading = document.querySelector("#selectedDayLabel");
  if (!strip || !input) return;
  const today = startOfToday();
  const todayIso = isoDate(today);
  if (!input.value) input.value = todayIso;
  const selected = parseIsoDate(input.value);
  const maxStart = shiftDay(today, DAY_LIMIT - (DAY_PAGE - 1));
  if (dayWindowStart < today) dayWindowStart = today;
  if (dayWindowStart > maxStart) dayWindowStart = maxStart;
  heading.textContent = formatLongDay(selected);
  const days = [];
  for (let index = 0; index < DAY_PAGE; index += 1) {
    const date = shiftDay(dayWindowStart, index);
    const iso = isoDate(date);
    const pressed = iso === input.value;
    const name = iso === todayIso ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
    days.push(`
      <button class="day${pressed ? " is-selected" : ""}${iso === todayIso ? " is-today" : ""}" type="button" data-date="${iso}" aria-pressed="${pressed}" aria-label="${formatLongDay(date)}">
        <span class="day-name">${name}</span>
        <span class="day-number">${date.getDate()}</span>
      </button>
    `);
  }
  strip.innerHTML = days.join("");
  const previous = document.querySelector("[data-day-shift='-7']");
  const next = document.querySelector("[data-day-shift='7']");
  if (previous) previous.disabled = isoDate(dayWindowStart) <= todayIso;
  if (next) next.disabled = dayOffset(today, dayWindowStart) >= DAY_LIMIT - (DAY_PAGE - 1);
}

function historyPageBounds() {
  const today = startOfToday();
  return {
    today,
    minStart: shiftDay(today, -Math.floor(HISTORY_BACK / DAY_PAGE) * DAY_PAGE),
    maxStart: shiftDay(today, HISTORY_AHEAD - (DAY_PAGE - 1))
  };
}

function selectHistoryDate(iso) {
  const input = document.querySelector("#historyDate");
  if (!input) return;
  input.value = iso;
  const { today, minStart, maxStart } = historyPageBounds();
  const page = Math.floor(dayOffset(today, parseIsoDate(iso)) / DAY_PAGE) * DAY_PAGE;
  const minPage = dayOffset(today, minStart);
  const maxPage = dayOffset(today, maxStart);
  historyWindowStart = shiftDay(today, Math.max(minPage, Math.min(maxPage, page)));
  renderHistoryStrip();
}

function renderHistoryStrip() {
  const strip = document.querySelector("#historyDayStrip");
  const input = document.querySelector("#historyDate");
  const heading = document.querySelector("#historyDayLabel");
  if (!strip || !input) return;
  const { today, minStart, maxStart } = historyPageBounds();
  const todayIso = isoDate(today);
  if (historyWindowStart < minStart) historyWindowStart = minStart;
  if (historyWindowStart > maxStart) historyWindowStart = maxStart;
  if (heading) heading.textContent = input.value ? formatLongDay(parseIsoDate(input.value)) : "All dates";
  const clear = document.querySelector("#clearHistoryDate");
  if (clear) {
    const selected = !input.value;
    clear.classList.toggle("is-selected", selected);
    clear.setAttribute("aria-pressed", String(selected));
  }
  const days = [];
  for (let index = 0; index < DAY_PAGE; index += 1) {
    const date = shiftDay(historyWindowStart, index);
    const iso = isoDate(date);
    const pressed = iso === input.value;
    const name = iso === todayIso ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
    days.push(`
      <button class="day${pressed ? " is-selected" : ""}${iso === todayIso ? " is-today" : ""}" type="button" data-date="${iso}" aria-pressed="${pressed}" aria-label="${formatLongDay(date)}">
        <span class="day-name">${name}</span>
        <span class="day-number">${date.getDate()}</span>
      </button>
    `);
  }
  strip.innerHTML = days.join("");
  const previous = document.querySelector("[data-history-shift='-7']");
  const next = document.querySelector("[data-history-shift='7']");
  if (previous) previous.disabled = historyWindowStart <= minStart;
  if (next) next.disabled = historyWindowStart >= maxStart;
}

function statusClass(status) {
  if (status === "Awaiting confirmation") return "is-awaiting";
  if (status === "Confirmed") return "is-confirmed";
  if (status === "Completed") return "is-completed";
  if (status === "Cancelled") return "is-cancelled";
  return "";
}

function reservationDateTile(iso) {
  const date = parseIsoDate(iso);
  const name = iso === isoDate(startOfToday()) ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
  return `
    <span class="reservation-date">
      <span class="day-name">${name}</span>
      <span class="day-number">${date.getDate()}</span>
      <span class="reservation-month">${month}</span>
    </span>
  `;
}

function renderFilterChips() {
  const equipment = document.querySelector("#historyEquipmentChips");
  if (equipment) {
    equipment.innerHTML = [...historyEquipment.options].map((option) => {
      const selected = option.value === historyEquipment.value;
      const label = option.value ? option.textContent : "All";
      return `<button class="chip${selected ? " is-selected" : ""}" type="button" data-equipment="${escapeHtml(option.value)}" aria-pressed="${selected}">${escapeHtml(label)}</button>`;
    }).join("");
  }
  const status = document.querySelector("#historyStatus").value;
  document.querySelectorAll("#historyStatusChips .chip").forEach((chip) => {
    const selected = chip.dataset.status === status;
    chip.classList.toggle("is-selected", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  renderHistoryStrip();
}

function slotLabel(state) {
  if (state === "booked") return "Booked";
  if (state === "unavailable") return "Unavailable";
  return "Free";
}

function mark(kind) {
  if (kind === "open" || kind === "free") {
    return '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="currentColor"></circle></svg>';
  }
  if (kind === "booked") {
    return '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="2" rx="1" fill="currentColor"></rect></svg>';
  }
  return '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"></rect></svg>';
}

const emptyHistory = `
  <div class="empty">
    <p class="eyebrow">Reservation</p>
    <h2>Pick one</h2>
    <p>Open a reservation to see the machine, the time, and the status.</p>
  </div>
`;

function showEmptyHistory() {
  delete historyDetails.dataset.id;
  historyDetails.innerHTML = emptyHistory;
}

function showHistoryError(error) {
  if (error.code === "NoSession") {
    showSignedOut();
    return;
  }
  if (error.code === "CannotConfirm") {
    setBanner(historyMessage, "This reservation can no longer be confirmed.", "is-blocked");
    return;
  }
  if (error.code === "CannotCancel") {
    setBanner(historyMessage, "This reservation can no longer be cancelled.", "is-blocked");
    return;
  }
  if (error.code === "CannotReport") {
    setBanner(historyMessage, "This reservation cannot be reported.", "is-blocked");
    return;
  }
  if (error.code === "ReportIncomplete") {
    setBanner(historyMessage, "Enter the issue type and a description.", "is-blocked");
    return;
  }
  if (error.code === "ReportExists") {
    setBanner(historyMessage, "A report is already open for this reservation.", "is-blocked");
    return;
  }
  historyList.innerHTML = "";
  showEmptyHistory();
  const text = {
    InvalidDate: "Enter a valid date.",
    UnknownStatus: "Unknown status.",
    EquipmentNotFound: "Equipment not found.",
    ReservationNotFound: "Reservation not found.",
    Forbidden: "Only staff can see every reservation.",
    MessageIncomplete: "Enter a subject and a message.",
    UserNotFound: "This person has no account.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(historyMessage, text || "Something went wrong.", "is-blocked");
}

async function fillEquipmentChoices() {
  if (historyEquipment.dataset.ready === "true") return;
  const data = await readJson(await fetch("/api/catalogue?type=", { headers: sessionHeader() }));
  const types = [];
  for (const item of data.equipment) {
    if (!types.includes(item.type)) types.push(item.type);
  }
  historyEquipment.insertAdjacentHTML("beforeend", types.map((type) => (
    `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`
  )).join(""));
  historyEquipment.dataset.ready = "true";
}

async function loadHistory(options = {}) {
  const openReservation = pendingReservationId;
  pendingReservationId = "";
  await fillEquipmentChoices();
  if (!options.silent) renderFilterChips();
  if (!options.silent) {
    setBanner(historyMessage, "", "");
    showEmptyHistory();
  }
  const params = new URLSearchParams();
  const date = document.querySelector("#historyDate").value;
  if (date) params.set("date", date);
  if (historyEquipment.value) params.set("equipment", historyEquipment.value);
  const status = document.querySelector("#historyStatus").value;
  if (status) params.set("status", status);
  const user = pendingProfileUser || document.querySelector("#historyUser").value;
  if (historyScope === "all" && user) params.set("user", user);
  const path = historyScope === "all" ? "/api/staff/reservations" : "/api/reservations";
  const data = await readJson(await fetch(`${path}?${params}`, { headers: sessionHeader() }));
  historyRows = data.reservations || [];
  if (historyScope === "all" && data.users) fillHistoryUsers(data.users);
  if (pendingProfileUser) {
    document.querySelector("#historyUser").value = pendingProfileUser;
    pendingProfileUser = "";
  }
  if (data.message) {
    historyList.innerHTML = "";
    if (!options.silent) setBanner(historyMessage, data.message, "is-warning");
    return;
  }
  const openId = historyDetails.dataset.id || "";
  historyList.innerHTML = data.reservations.map((item) => `
    <div class="card reservation-card${item.id === openId ? " is-selected" : ""}" data-reservation="${escapeHtml(item.id)}"${item.id === openId ? ' aria-current="true"' : ""}>
      <button class="card-open" type="button">
        ${reservationDateTile(item.date)}
        <span class="reservation-body">
          <span class="card-title">${escapeHtml(item.equipment)}</span>
          ${item.serial ? `<span class="card-location">${escapeHtml(item.serial)}</span>` : ""}
          ${historyScope === "all" ? `<span class="card-location">${escapeHtml(item.user)}</span>` : ""}
          <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
          <span class="reservation-time"><span class="slot-time">${escapeHtml(item.start)}</span><span class="slot-until">until ${escapeHtml(item.end)}</span></span>
        </span>
      </button>
      ${reservationActions(item)}
    </div>
  `).join("");
  if (openReservation && historyRows.some((item) => item.id === openReservation)) {
    await loadReservation(openReservation);
  }
  if (!options.silent || !openId || historyScope === "all") return;
  const open = data.reservations.find((item) => item.id === openId);
  const showingConfirm = Boolean(historyDetails.querySelector("#confirmReservation"));
  const showingCancel = Boolean(historyDetails.querySelector("#cancelReservation"));
  const showingReport = Boolean(historyDetails.querySelector("#showReport"));
  const formOpen = historyDetails.querySelector("#reportForm") && !historyDetails.querySelector("#reportForm").hidden;
  if (!formOpen && open && (open.canConfirm !== showingConfirm || open.canCancel !== showingCancel || open.canReport !== showingReport)) {
    await loadReservation(openId);
  }
}

function reservationActions(item) {
  const confirm = item.canConfirm
    ? `<button class="primary confirm-reservation" type="button" data-confirm="${escapeHtml(item.id)}">Confirm</button>`
    : "";
  const cancel = item.canCancel
    ? `<button class="cancel-reservation" type="button" data-cancel="${escapeHtml(item.id)}"><span>Cancel</span><span>reservation</span></button>`
    : "";
  return confirm || cancel ? `<div class="card-actions">${confirm}${cancel}</div>` : "";
}

function fillHistoryUsers(users) {
  const select = document.querySelector("#historyUser");
  const chosen = select.value;
  select.innerHTML = [`<option value="">All users</option>`].concat(users.map((user) => (
    `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)}</option>`
  ))).join("");
  if ([...select.options].some((option) => option.value === chosen)) select.value = chosen;
}

async function loadReservation(id) {
  const item = historyScope === "all"
    ? historyRows.find((row) => row.id === id)
    : await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}`, { headers: sessionHeader() }));
  if (!item) {
    showEmptyHistory();
    return;
  }
  const readOnly = historyScope === "all";
  historyDetails.dataset.id = item.id;
  document.querySelectorAll("#historyList .card").forEach((card) => {
    const selected = card.dataset.reservation === item.id;
    card.classList.toggle("is-selected", selected);
    if (selected) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  });
  historyDetails.innerHTML = `
    <p class="eyebrow">Reservation</p>
    <h2>${escapeHtml(item.equipment)}</h2>
    <div class="reservation-hero">
      ${reservationDateTile(item.date)}
      <div>
        <p class="day-heading">${formatLongDay(parseIsoDate(item.date))}</p>
        <p class="reservation-time"><span class="slot-time">${escapeHtml(item.start)}</span><span class="slot-until">until ${escapeHtml(item.end)}</span></p>
        <p class="card-location">${escapeHtml(item.serial || "")}</p>
        <p class="card-location">${escapeHtml(item.location || "—")}</p>
        <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
    </div>
    ${readOnly ? profilePanel(item.profile) : ""}
    <div class="reservation-actions">
      ${readOnly || !item.canConfirm ? "" : `<button id="confirmReservation" class="primary" type="button">Confirm</button>`}
      ${readOnly || !item.canCancel ? "" : `<button id="cancelReservation" class="cancel-reservation" type="button">Cancel reservation</button>`}
      ${readOnly || !item.canReport ? "" : `<button id="showReport" class="primary" type="button">Report</button>`}
    </div>
    ${!readOnly && item.canReport ? `
      <form id="reportForm" class="report-form" hidden>
        <label for="issueType">Issue type</label>
        <select id="issueType">
          <option value="">Select an issue</option>
          <option>Not working</option>
          <option>Unsafe to use</option>
          <option>Other</option>
        </select>
        <label for="issueDescription">Description</label>
        <textarea id="issueDescription"></textarea>
        <button class="primary" type="submit">Submit report</button>
      </form>
    ` : ""}
    ${item.report ? `
      <section class="report-saved">
        <p class="eyebrow">Report</p>
        <span class="badge ${ticketStatusClass(item.report.status)}">${escapeHtml(item.report.status)}</span>
        <p class="card-title">${escapeHtml(item.report.issueType)}</p>
        <p>${escapeHtml(item.report.description)}</p>
      </section>
    ` : ""}
  `;
}

function armCancel(button) {
  if (button.dataset.ready === "yes") return true;
  button.dataset.ready = "yes";
  button.innerHTML = "<span>Yes,</span><span>cancel</span>";
  setBanner(historyMessage, "Cancel this reservation? The time slot will be free again.", "is-warning");
  return false;
}

async function cancelReservation(id, button) {
  if (!armCancel(button)) return;
  if (button) button.disabled = true;
  const data = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: sessionHeader()
  }));
  await loadHistory();
  await loadReservation(id);
  setBanner(historyMessage, data.message, data.mailSent ? "is-open" : "is-warning");
}

async function confirmReservation(id, button) {
  if (button) button.disabled = true;
  const data = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
    headers: sessionHeader()
  }));
  await loadHistory();
  await loadReservation(id);
  setBanner(historyMessage, data.message, data.mailSent ? "is-open" : "is-warning");
}

function showEmptyDetails() {
  details.hidden = false;
  delete details.dataset.id;
  details.innerHTML = emptyDetails;
}

function setBanner(node, text, kind) {
  node.className = "banner";
  if (!text) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.hidden = false;
  node.textContent = text;
  if (kind) node.classList.add(kind);
}

function markSelected(id) {
  document.querySelectorAll(".card").forEach((card) => {
    const selected = card.dataset.id === id;
    card.classList.toggle("is-selected", selected);
    if (selected) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  });
}

async function loadCatalogue() {
  setBanner(message, "", "");
  showEmptyDetails();
  const type = typeSelect.value;
  const data = await readJson(await fetch(`/api/catalogue?type=${encodeURIComponent(type)}`, {
    headers: sessionHeader()
  }));
  if (data.message) {
    list.innerHTML = "";
    count.textContent = "";
    setBanner(message, data.message, "is-warning");
    return;
  }
  count.textContent = `${data.equipment.length} in this view`;
  list.innerHTML = data.equipment.map((item) => {
    const open = item.status !== "blocked";
    return `
      <button class="card" type="button" data-id="${item.id}">
        <span class="card-top">
          <span class="card-title">${escapeHtml(item.type)}</span>
          <span class="badge ${item.status}">${mark(open ? "open" : "blocked")}${open ? "Open" : "Blocked"}</span>
        </span>
        <span class="card-location">${escapeHtml(item.serial)}</span>
        <span class="card-location">${escapeHtml(item.location)}</span>
        <span class="card-status">${statusLabel(item)}</span>
      </button>
    `;
  }).join("");
}

async function loadDetails(id) {
  const item = await readJson(await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
    headers: sessionHeader()
  }));
  details.hidden = false;
  details.dataset.id = item.id;
  markSelected(item.id);
  details.innerHTML = `
    <p class="eyebrow">Machine</p>
    <h2>${escapeHtml(item.type)}</h2>
    <dl>
      <dt>Serial number</dt><dd>${escapeHtml(item.serial)}</dd>
      <dt>Location</dt><dd>${escapeHtml(item.location)}</dd>
      <dt>Description</dt><dd>${item.description || "—"}</dd>
      <dt>Rules of use</dt><dd>${item.rules || "—"}</dd>
      <dt>Material</dt><dd data-material-level>${escapeHtml(materialLine(item.material))}</dd>
      <dt>Status</dt><dd>${statusLabel(item)}</dd>
    </dl>
    <section class="availability">
      <h3>Availability</h3>
      <p id="selectedDayLabel" class="day-heading"></p>
      <div class="day-picker">
        <button class="day-nav" type="button" data-day-shift="-7" aria-label="Previous week">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <div id="dayStrip" class="day-strip" role="group" aria-label="Date"></div>
        <button class="day-nav" type="button" data-day-shift="7" aria-label="Next week">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
      <input id="availabilityDate" hidden>
      <p id="availabilityMessage" class="banner" role="status" hidden></p>
      <div id="slots" class="slots"></div>
      <div id="suggestions"></div>
    </section>
  `;
  dayWindowStart = startOfToday();
  selectAvailabilityDate(isoDate(dayWindowStart));
  await loadAvailability(item.id);
}

async function loadAvailability(id) {
  const date = document.querySelector("#availabilityDate").value;
  const data = await readJson(await fetch(`/api/equipment/${encodeURIComponent(id)}/availability?date=${encodeURIComponent(date)}`, {
    headers: sessionHeader()
  }));
  const slotMessage = document.querySelector("#availabilityMessage");
  const slots = document.querySelector("#slots");
  const suggestions = document.querySelector("#suggestions");
  const block = [data.reason, data.period].filter(Boolean).join(" · ");
  if (data.message) setBanner(slotMessage, data.message, "is-warning");
  else if (block) setBanner(slotMessage, `Blocked · ${block}`, "is-blocked");
  else setBanner(slotMessage, "", "");
  slots.innerHTML = data.slots.map((slot) => {
    const label = slot.state === "free" ? "Book" : slotLabel(slot.state);
    const body = `
      <span class="slot-time">${escapeHtml(slot.start)}</span>
      <span class="slot-until">until ${escapeHtml(slot.end)}</span>
      <span class="slot-label">${label}</span>
    `;
    if (slot.state !== "free") return `<div class="slot ${slot.state}">${body}</div>`;
    return `<button class="slot free" type="button" data-book="true" data-start="${escapeHtml(slot.start)}" data-end="${escapeHtml(slot.end)}">${body}</button>`;
  }).join("");
  renderSuggestions(suggestions, data.suggestions);
}

function renderSuggestions(node, items) {
  node.className = "suggestions";
  node.innerHTML = !items || items.length === 0 ? "" : `
    <h3>Nearest free slots</h3>
    <ul>
      ${items.map((slot) => `<li><button class="suggestion" type="button" data-date="${escapeHtml(slot.date)}">${escapeHtml(formatLongDay(parseIsoDate(slot.date)))} · ${escapeHtml(slot.start)}–${escapeHtml(slot.end)}</button></li>`).join("")}
    </ul>
  `;
}

async function bookSlot(id, start, end, button) {
  if (button) button.disabled = true;
  const response = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({
      equipmentId: id,
      date: document.querySelector("#availabilityDate").value,
      start,
      end
    })
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.code = data.error;
    error.suggestions = data.suggestions || [];
    if (button) button.disabled = false;
    throw error;
  }
  await loadAvailability(id);
  const fresh = await readJson(await fetch(`/api/equipment/${encodeURIComponent(id)}`, { headers: sessionHeader() }));
  const materialCell = document.querySelector("#details [data-material-level]");
  if (materialCell) materialCell.textContent = materialLine(fresh.material);
  const slotMessage = document.querySelector("#availabilityMessage");
  setBanner(slotMessage, data.message, "is-open");
}

function showSignInTab(signIn) {
  document.querySelector("#signInForm").hidden = !signIn;
  document.querySelector("#registerForm").hidden = signIn;
  document.querySelector("#showSignIn").classList.toggle("is-selected", signIn);
  document.querySelector("#showRegister").classList.toggle("is-selected", !signIn);
  document.querySelector("#showSignIn").setAttribute("aria-selected", String(signIn));
  document.querySelector("#showRegister").setAttribute("aria-selected", String(!signIn));
  document.querySelector("#auth h1").textContent = signIn ? "Sign in" : "Create account";
  setBanner(authMessage, "", "");
}

async function submitAccount(url, body, button) {
  if (button) button.disabled = true;
  setBanner(authMessage, "", "");
  try {
    const data = await readJson(await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }));
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    showSignedIn(data.account);
    await loadCatalogue();
  } catch (error) {
    showAuthError(error);
  } finally {
    if (button) button.disabled = false;
  }
}

document.querySelector("#showSignIn").addEventListener("click", () => showSignInTab(true));
document.querySelector("#showRegister").addEventListener("click", () => showSignInTab(false));

document.querySelector("#signInForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAccount("/api/login", {
    email: document.querySelector("#signInEmail").value,
    password: document.querySelector("#signInPassword").value
  }, event.submitter);
});

document.querySelector("#registerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAccount("/api/register", {
    name: document.querySelector("#registerName").value,
    email: document.querySelector("#registerEmail").value,
    password: document.querySelector("#registerPassword").value
  }, event.submitter);
});

document.querySelector("#openAccount").addEventListener("click", () => {
  if (location.hash !== "#/account") location.hash = "#/account";
});

document.querySelector("#backToChoices").addEventListener("click", () => {
  if (location.hash !== "#/choose") location.hash = "#/choose";
});

document.querySelector("#signOut").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", headers: sessionHeader() });
  showSignedOut();
});

document.querySelector("#openStaff").addEventListener("click", () => {
  if (location.hash !== "#/staff") location.hash = "#/staff";
});

document.querySelector("#openTickets").addEventListener("click", () => {
  if (location.hash !== "#/tickets") location.hash = "#/tickets";
});

document.querySelector("#openAllReservations").addEventListener("click", () => {
  if (location.hash !== "#/reservations") location.hash = "#/reservations";
});

function ticketStatusClass(status) {
  if (status === "Resolved") return "is-completed";
  if (status === "Rejected") return "is-cancelled";
  if (status === "In progress") return "is-confirmed";
  if (status === "Maintenance requested") return "blocked";
  return "is-awaiting";
}

function ticketWhen(item) {
  if (!item.date) return "";
  const clock = item.start && item.end ? ` · ${item.start}–${item.end}` : "";
  return `${formatLongDay(parseIsoDate(item.date))}${clock}`;
}

function showTicketsError(error) {
  const text = {
    NoSession: "Sign in to see the tickets.",
    Forbidden: "Only staff can view tickets.",
    TicketNotFound: "Ticket not found.",
    MessageIncomplete: "Enter a subject and a message.",
    UserNotFound: "This person has no account.",
    UnknownStatus: "Choose a known status.",
    EquipmentNotFound: "Equipment not found.",
    InvalidDate: "Enter a valid date.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(ticketsMessage, text || "Something went wrong.", "is-blocked");
}

function renderTicketDetails(item) {
  const actions = ["In progress", "Maintenance requested", "Resolved", "Rejected"]
    .filter((status) => status !== item.status)
    .map((status) => `<button class="${status === "Resolved" ? "primary" : "ghost"}" type="button" data-ticket-status="${escapeHtml(status)}">${escapeHtml(status)}</button>`)
    .join("");
  const finished = item.status === "Resolved" || item.status === "Rejected";
  ticketsDetails.innerHTML = `
    <p class="eyebrow">Ticket</p>
    <h2>${escapeHtml(item.equipment || "Equipment")}</h2>
    <p class="card-location">${escapeHtml(item.serial || "")}</p>
    <p class="card-location">${escapeHtml(item.location)}</p>
    <p><span class="badge ${ticketStatusClass(item.status)}">${escapeHtml(item.status)}</span></p>
    ${isMaterialTicket(item) ? `<section class="profile-card"><p class="eyebrow">Opened automatically</p><p>The material level reached its minimum.</p></section>` : profilePanel(item.profile)}
    <p class="card-status">${escapeHtml(ticketWhen(item))}</p>
    <p class="card-title">${escapeHtml(item.issueType)}</p>
    <p>${escapeHtml(item.description)}</p>
    ${finished ? "<p>This report stays in Completed.</p>" : ""}
    <div class="block-actions">${actions}</div>
    <div class="block-actions staff-links">
      <button class="ghost" type="button" data-block-machine="${escapeHtml(item.equipmentId)}" data-block-reason="${escapeHtml(item.issueType)}">Block machine</button>
      ${isMaterialTicket(item) ? `<button class="ghost" type="button" data-open-materials="${escapeHtml(item.equipmentId)}">View material</button>` : ""}
    </div>
  `;
}

function visibleTickets() {
  return ticketRows.filter((item) => !ticketType || item.equipment === ticketType);
}

function renderTicketChips() {
  const order = ["3D printer", "laser cutter", "electronics workstation", "printer"];
  const types = [...ticketTypes].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
  });
  const chips = [{ value: "", label: "All" }].concat(types.map((type) => ({ value: type, label: type })));
  document.querySelector("#ticketTypeChips").innerHTML = chips.map((chip) => {
    const selected = chip.value === ticketType;
    return `<button class="chip${selected ? " is-selected" : ""}" type="button" data-ticket-type="${escapeHtml(chip.value)}" aria-pressed="${selected}">${escapeHtml(chip.label)}</button>`;
  }).join("");
}

function renderTickets(message) {
  renderTicketChips();
  for (const [id, group] of [["ticketsOpenTab", "open"], ["ticketsCompletedTab", "completed"]]) {
    const tab = document.querySelector(`#${id}`);
    const selected = ticketGroup === group;
    tab.classList.toggle("is-selected", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
  }
  const visible = visibleTickets();
  ticketsList.innerHTML = visible.map((item) => `
    <button class="card${item.id === selectedTicketId ? " is-selected" : ""}" type="button" data-ticket="${escapeHtml(item.id)}" ${item.id === selectedTicketId ? "aria-current=\"true\"" : ""}>
      <span class="card-top">
        <span class="card-title">${escapeHtml(item.equipment || "Equipment")}${item.serial ? ` · ${escapeHtml(item.serial)}` : ""}</span>
        <span class="badge ${ticketStatusClass(item.status)}">${escapeHtml(item.status)}</span>
      </span>
      <span class="card-location">${escapeHtml(isMaterialTicket(item) ? "Automatic alert" : item.user)}</span>
      <span class="card-status">${escapeHtml(ticketWhen(item))}</span>
    </button>
  `).join("");
  setBanner(ticketsMessage, visible.length === 0 ? (message || "No tickets found") : "", "is-warning");
  const selected = visible.find((item) => item.id === selectedTicketId);
  if (selected) renderTicketDetails(selected);
  else {
    if (!ticketRows.some((item) => item.id === selectedTicketId)) selectedTicketId = "";
    ticketsDetails.innerHTML = `
      <div class="empty">
        <p class="eyebrow">Ticket</p>
        <h2>Pick one</h2>
        <p>Open a ticket to see the equipment, the user, and the report.</p>
      </div>
    `;
  }
}

async function loadTickets() {
  if (pendingTicketType) {
    ticketType = pendingTicketType;
    pendingTicketType = "";
  }
  const params = new URLSearchParams({ group: ticketGroup });
  const date = document.querySelector("#ticketDate").value;
  if (date) params.set("date", date);
  const data = await readJson(await fetch(`/api/tickets?${params}`, { headers: sessionHeader() }));
  ticketRows = data.tickets || [];
  ticketTypes = [...new Set((data.equipment || []).map((item) => item.type))];
  renderTickets(data.message);
  return data;
}

ticketsList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-ticket]");
  if (!card) return;
  selectedTicketId = card.dataset.ticket;
  loadTickets().catch(showTicketsError);
});

document.querySelector("#ticketsOpenTab").addEventListener("click", () => {
  ticketGroup = "open";
  selectedTicketId = "";
  loadTickets().catch(showTicketsError);
});

document.querySelector("#ticketsCompletedTab").addEventListener("click", () => {
  ticketGroup = "completed";
  selectedTicketId = "";
  loadTickets().catch(showTicketsError);
});

document.querySelector("#ticketTypeChips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-ticket-type]");
  if (!chip) return;
  ticketType = chip.dataset.ticketType;
  renderTickets("");
});
document.querySelector("#ticketDate").addEventListener("change", () => loadTickets().catch(showTicketsError));

function profilePanel(profile) {
  if (!profile) {
    return `
      <section class="profile-card">
        <p class="eyebrow">Profile</p>
        <h3>Unknown user</h3>
        <p>This person has no account, so staff cannot email them.</p>
      </section>
    `;
  }
  return `
    <section class="profile-card">
      <p class="eyebrow">Profile</p>
      <h3>${escapeHtml(profile.name)}</h3>
      <p><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></p>
      <p class="note">${escapeHtml(roleLabel(profile.role))}</p>
      <div class="block-actions">
        <button class="ghost" type="button" data-profile-reservations="${escapeHtml(profile.id)}">Reservations</button>
        <button class="primary" type="button" data-write-email>Write email</button>
      </div>
      <form class="report-form profile-mail" hidden>
        <label>Subject</label>
        <input class="profile-subject" maxlength="120">
        <label>Message</label>
        <textarea class="profile-text"></textarea>
        <button class="primary" type="submit">Send email</button>
      </form>
    </section>
  `;
}

function openProfileReservations(userId) {
  pendingProfileUser = userId;
  if (location.hash !== "#/reservations") location.hash = "#/reservations";
  else showAllReservations();
}

async function sendProfileEmail(form, banner, showError) {
  const subject = form.querySelector(".profile-subject");
  const text = form.querySelector(".profile-text");
  const card = form.closest(".profile-card");
  const userId = card.querySelector("[data-profile-reservations]")?.dataset.profileReservations || "";
  const missingSubject = !subject.value.trim();
  const missingText = !text.value.trim();
  subject.classList.toggle("is-invalid", missingSubject);
  text.classList.toggle("is-invalid", missingText);
  if (missingSubject || missingText || !userId) {
    setBanner(banner, "Enter a subject and a message.", "is-blocked");
    return;
  }
  const button = form.querySelector("button");
  if (button) button.disabled = true;
  try {
    const data = await readJson(await fetch("/api/staff/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sessionHeader() },
      body: JSON.stringify({ userId, subject: subject.value.trim(), text: text.value.trim() })
    }));
    form.hidden = true;
    subject.value = "";
    text.value = "";
    setBanner(banner, data.message, data.mailSent ? "is-open" : "is-warning");
  } catch (error) {
    if (button) button.disabled = false;
    showError(error);
  }
}

ticketsDetails.addEventListener("click", async (event) => {
  const reservations = event.target.closest("[data-profile-reservations]");
  if (reservations) {
    openProfileReservations(reservations.dataset.profileReservations);
    return;
  }
  const write = event.target.closest("[data-write-email]");
  if (write) {
    write.closest(".profile-card").querySelector(".profile-mail").hidden = false;
    return;
  }
  const button = event.target.closest("[data-ticket-status]");
  if (!button || !selectedTicketId) return;
  button.disabled = true;
  const status = button.dataset.ticketStatus;
  const id = selectedTicketId;
  try {
    const data = await readJson(await awaitFetchTicket(id, status));
    if (status === "Resolved" || status === "Rejected") ticketGroup = "completed";
    selectedTicketId = id;
    await loadTickets();
    setBanner(ticketsMessage, data.message, "is-open");
  } catch (error) {
    button.disabled = false;
    showTicketsError(error);
  }
});

ticketsDetails.addEventListener("submit", (event) => {
  const form = event.target.closest(".profile-mail");
  if (!form) return;
  event.preventDefault();
  sendProfileEmail(form, ticketsMessage, showTicketsError);
});

function awaitFetchTicket(id, status) {
  return fetch(`/api/tickets/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({ status })
  });
}

function showStaffError(error) {
  const text = {
    NoSession: "Sign in to see the staff panel.",
    Forbidden: "Only staff can block a machine.",
    EquipmentNotFound: "Equipment not found.",
    BlockIncomplete: "Enter the reason and the block period.",
    BlockAfterSession: "The period ends before the current session ends.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(staffMessage, text || "Something went wrong.", "is-blocked");
}

function staffBadge(item) {
  if (item.status === "blocked") return `<span class="badge blocked">${mark("blocked")}Blocked</span>`;
  return `<span class="badge open">${mark("open")}Open</span>`;
}

let staffRows = [];
let staffType = "";

function visibleStaff() {
  return staffRows.filter((item) => !staffType || item.type === staffType);
}

function renderStaffChips() {
  const order = ["3D printer", "laser cutter", "electronics workstation", "printer"];
  const types = [...new Set(staffRows.map((item) => item.type))].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
  });
  const chips = [{ value: "", label: "All" }].concat(types.map((type) => ({ value: type, label: type })));
  document.querySelector("#staffTypeChips").innerHTML = chips.map((chip) => {
    const selected = chip.value === staffType;
    return `<button class="chip${selected ? " is-selected" : ""}" type="button" data-staff-type="${escapeHtml(chip.value)}" aria-pressed="${selected}">${escapeHtml(chip.label)}</button>`;
  }).join("");
}

function renderStaff() {
  renderStaffChips();
  const selected = staffDetails.dataset.id || "";
  const visible = visibleStaff();
  staffList.innerHTML = visible.map((item) => `
    <button class="card${item.id === selected ? " is-selected" : ""}" type="button" data-staff="${escapeHtml(item.id)}" ${item.id === selected ? "aria-current=\"true\"" : ""}>
      <span class="card-top">
        <span class="card-title">${escapeHtml(item.type)}</span>
        ${staffBadge(item)}
      </span>
      <span class="card-location">${escapeHtml(item.serial)}</span>
      <span class="card-location">${escapeHtml(item.location)}</span>
      <span class="card-status">${escapeHtml(statusLabel(item))}</span>
    </button>
  `).join("");
  const current = visible.find((item) => item.id === selected);
  if (current) renderStaffDetails(current);
  else {
    if (!staffRows.some((item) => item.id === selected)) delete staffDetails.dataset.id;
    staffDetails.innerHTML = `
      <div class="empty">
        <p class="eyebrow">Machine</p>
        <h2>Pick one</h2>
        <p>Choose a machine to block it or open it again.</p>
      </div>
    `;
  }
}

async function loadStaff() {
  const data = await readJson(await fetch("/api/staff/equipment", { headers: sessionHeader() }));
  staffRows = data.equipment || [];
  renderStaff();
}

function renderStaffDetails(item) {
  staffDetails.dataset.id = item.id;
  const reasonValue = item.reason || pendingBlockReason;
  pendingBlockReason = "";
  const openEnded = item.status === "blocked" && !item.blockStart && !item.blockEnd;
  staffDetails.innerHTML = `
    <p class="eyebrow">Machine</p>
    <h2>${escapeHtml(item.type)}</h2>
    <p class="card-location">${escapeHtml(item.serial)}</p>
    <p class="card-location">${escapeHtml(item.location)}</p>
    <p>${staffBadge(item)}</p>
    ${item.status === "blocked" ? `<p class="card-status">${escapeHtml(statusLabel(item))}</p><p>This machine is already blocked. You can change the reason or the period.</p>` : ""}
    <form id="blockForm" class="block-form">
      <label for="blockReason">Reason</label>
      <input id="blockReason" value="${escapeHtml(reasonValue)}">
      <label class="block-check" for="blockOpenEnded">
        <input id="blockOpenEnded" type="checkbox"${openEnded ? " checked" : ""}>
        Until further notice
      </label>
      <label for="blockStart">From</label>
      <input id="blockStart" type="date" value="${escapeHtml(item.blockStart || "")}"${openEnded ? " disabled" : ""}>
      <label for="blockEnd">Until</label>
      <input id="blockEnd" type="date" value="${escapeHtml(item.blockEnd || "")}"${openEnded ? " disabled" : ""}>
      <div class="block-actions">
        <button class="primary" type="submit">Block machine</button>
        ${item.status === "blocked" ? `<button id="unblockMachine" class="ghost" type="button">Unblock</button>` : ""}
      </div>
    </form>
    <div class="block-actions staff-links">
      <button class="ghost" type="button" data-staff-tickets="${escapeHtml(item.id)}" data-staff-ticket-type="${escapeHtml(item.type)}">Tickets for this machine</button>
      <button class="ghost" type="button" data-staff-materials="${escapeHtml(item.id)}">Materials</button>
    </div>
  `;
}

document.querySelector("#staffTypeChips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-staff-type]");
  if (!chip) return;
  staffType = chip.dataset.staffType;
  renderStaff();
});

staffList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-staff]");
  if (!card) return;
  setBanner(staffMessage, "");
  staffDetails.dataset.id = card.dataset.staff;
  loadStaff().catch(showStaffError);
});

staffDetails.addEventListener("change", (event) => {
  if (event.target.id !== "blockOpenEnded") return;
  const off = event.target.checked;
  document.querySelector("#blockStart").disabled = off;
  document.querySelector("#blockEnd").disabled = off;
});

staffDetails.addEventListener("click", (event) => {
  const confirmButton = event.target.closest("#confirmBlock");
  if (confirmButton) {
    const when = document.querySelector("input[name='blockWhen']:checked");
    const cancelIds = [...document.querySelectorAll("[data-cancel-id]:checked")].map((item) => item.dataset.cancelId);
    confirmButton.disabled = true;
    blockMachine(staffDetails.dataset.id, {
      ...blockFields(),
      confirm: true,
      when: when ? when.value : "now",
      cancelIds
    }).catch((error) => {
      confirmButton.disabled = false;
      showStaffError(error);
    });
    return;
  }
  const button = event.target.closest("#unblockMachine");
  if (!button) return;
  button.disabled = true;
  unblockMachine(staffDetails.dataset.id).catch((error) => {
    button.disabled = false;
    showStaffError(error);
  });
});

async function unblockMachine(id) {
  const data = await readJson(await fetch(`/api/staff/equipment/${encodeURIComponent(id)}/unblock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: "{}"
  }));
  await loadStaff();
  setBanner(staffMessage, data.message, "is-open");
}

staffDetails.addEventListener("submit", (event) => {
  const form = event.target.closest("#blockForm");
  if (!form) return;
  event.preventDefault();
  const reason = document.querySelector("#blockReason");
  const openEnded = document.querySelector("#blockOpenEnded").checked;
  const start = document.querySelector("#blockStart");
  const end = document.querySelector("#blockEnd");
  const missingReason = !reason.value.trim();
  const missingPeriod = !openEnded && (!start.value || !end.value || start.value > end.value);
  reason.classList.toggle("is-invalid", missingReason);
  start.classList.toggle("is-invalid", missingPeriod);
  end.classList.toggle("is-invalid", missingPeriod);
  if (missingReason || missingPeriod) {
    setBanner(staffMessage, "Enter the reason and the block period.", "is-blocked");
    return;
  }
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;
  blockMachine(staffDetails.dataset.id, blockFields()).catch((error) => {
    if (button) button.disabled = false;
    showStaffError(error);
  });
});

function renderBlockPreview(data) {
  const form = document.querySelector("#blockForm");
  const previous = document.querySelector("#blockPreview");
  if (previous) previous.remove();
  const session = data.activeSession ? `
    <fieldset class="block-choice">
      <legend>Current session</legend>
      <p>${escapeHtml(data.activeSession.name)} · ${escapeHtml(data.activeSession.date)} ${escapeHtml(data.activeSession.start)}–${escapeHtml(data.activeSession.end)}</p>
      <label class="block-check"><input type="radio" name="blockWhen" value="now" checked> Block now</label>
      <label class="block-check"><input type="radio" name="blockWhen" value="after"> Block after this session ends</label>
    </fieldset>
  ` : "";
  const rows = data.reservations.map((item) => `
    <label class="block-check">
      <input type="checkbox" data-cancel-id="${escapeHtml(item.id)}">
      <span>${escapeHtml(item.name)} · ${escapeHtml(item.date)} ${escapeHtml(item.start)}–${escapeHtml(item.end)} · ${escapeHtml(item.status)}</span>
    </label>
  `).join("");
  form.insertAdjacentHTML("beforeend", `
    <div id="blockPreview">
      ${session}
      <fieldset class="block-choice">
        <legend>Reservations in this period</legend>
        ${rows || "<p>No reservations in this period.</p>"}
      </fieldset>
      <button id="confirmBlock" class="primary" type="button">Block machine</button>
    </div>
  `);
  const submit = form.querySelector("button[type='submit']");
  if (submit) submit.hidden = true;
}

function blockFields() {
  const openEnded = document.querySelector("#blockOpenEnded").checked;
  return {
    reason: document.querySelector("#blockReason").value.trim(),
    untilFurtherNotice: openEnded,
    blockStart: openEnded ? "" : document.querySelector("#blockStart").value,
    blockEnd: openEnded ? "" : document.querySelector("#blockEnd").value
  };
}

async function blockMachine(id, input) {
  const data = await readJson(await fetch(`/api/staff/equipment/${encodeURIComponent(id)}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify(input)
  }));
  if (data.preview) {
    renderBlockPreview(data);
    const button = document.querySelector("#blockForm button[type='submit']");
    if (button) button.disabled = false;
    setBanner(staffMessage, data.message, "is-warning");
    return;
  }
  await loadStaff();
  setBanner(staffMessage, data.message, data.mailSent === false ? "is-warning" : "is-open");
}

accountView.addEventListener("click", (event) => {
  const day = event.target.closest("#historyDayStrip [data-date]");
  if (day) {
    const input = document.querySelector("#historyDate");
    if (input.value === day.dataset.date) input.value = "";
    else selectHistoryDate(day.dataset.date);
    loadHistory().catch(showHistoryError);
    return;
  }
  const shift = event.target.closest("[data-history-shift]");
  if (shift) {
    if (shift.disabled) return;
    historyWindowStart = shiftDay(historyWindowStart, Number(shift.dataset.historyShift));
    renderHistoryStrip();
    return;
  }
  if (event.target.closest("#clearHistoryDate")) {
    document.querySelector("#historyDate").value = "";
    loadHistory().catch(showHistoryError);
    return;
  }
  const equipment = event.target.closest("#historyEquipmentChips [data-equipment]");
  if (equipment) {
    historyEquipment.value = equipment.dataset.equipment;
    loadHistory().catch(showHistoryError);
    return;
  }
  const status = event.target.closest("#historyStatusChips [data-status]");
  if (!status) return;
  document.querySelector("#historyStatus").value = status.dataset.status;
  loadHistory().catch(showHistoryError);
});

document.querySelector("#historyDate").addEventListener("change", () => loadHistory().catch(showHistoryError));
document.querySelector("#historyEquipment").addEventListener("change", () => loadHistory().catch(showHistoryError));
document.querySelector("#historyStatus").addEventListener("change", () => loadHistory().catch(showHistoryError));
document.querySelector("#historyUser").addEventListener("change", () => loadHistory().catch(showHistoryError));

historyList.addEventListener("click", (event) => {
  const confirmButton = event.target.closest("[data-confirm]");
  if (confirmButton) {
    confirmReservation(confirmButton.dataset.confirm, confirmButton).catch((error) => {
      confirmButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const cancelButton = event.target.closest("[data-cancel]");
  if (cancelButton) {
    cancelReservation(cancelButton.dataset.cancel, cancelButton).catch((error) => {
      cancelButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const card = event.target.closest("[data-reservation]");
  if (!card) return;
  setBanner(historyMessage, "");
  loadReservation(card.dataset.reservation).catch(showHistoryError);
});

historyDetails.addEventListener("click", (event) => {
  const reservations = event.target.closest("[data-profile-reservations]");
  if (reservations) {
    openProfileReservations(reservations.dataset.profileReservations);
    return;
  }
  const write = event.target.closest("[data-write-email]");
  if (write) {
    write.closest(".profile-card").querySelector(".profile-mail").hidden = false;
    return;
  }
  const confirmButton = event.target.closest("#confirmReservation");
  if (confirmButton) {
    confirmReservation(historyDetails.dataset.id, confirmButton).catch((error) => {
      confirmButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const cancelButton = event.target.closest("#cancelReservation");
  if (cancelButton) {
    cancelReservation(historyDetails.dataset.id, cancelButton).catch((error) => {
      cancelButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const reportButton = event.target.closest("#showReport");
  if (!reportButton) return;
  reportButton.hidden = true;
  document.querySelector("#reportForm").hidden = false;
});

historyDetails.addEventListener("submit", (event) => {
  const mail = event.target.closest(".profile-mail");
  if (mail) {
    event.preventDefault();
    sendProfileEmail(mail, historyMessage, showHistoryError);
    return;
  }
  const form = event.target.closest("#reportForm");
  if (!form) return;
  event.preventDefault();
  const issueType = document.querySelector("#issueType");
  const description = document.querySelector("#issueDescription");
  const missingType = !issueType.value;
  const missingDescription = !description.value.trim();
  issueType.classList.toggle("is-invalid", missingType);
  description.classList.toggle("is-invalid", missingDescription);
  if (missingType || missingDescription) {
    setBanner(historyMessage, "Enter the issue type and a description.", "is-blocked");
    return;
  }
  const button = form.querySelector("button");
  if (button) button.disabled = true;
  submitReport(historyDetails.dataset.id, issueType.value, description.value.trim()).catch((error) => {
    if (button) button.disabled = false;
    showHistoryError(error);
  });
});

async function submitReport(id, issueType, description) {
  const data = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({ issueType, description })
  }));
  await loadHistory();
  await loadReservation(id);
  setBanner(historyMessage, data.message, data.mailSent ? "is-open" : "is-warning");
}

window.addEventListener("hashchange", () => {
  if (!token) return;
  if (location.hash === "#/account") {
    showAccount();
    return;
  }
  if (location.hash === "#/staff") {
    showStaff();
    return;
  }
  if (location.hash === "#/tickets") {
    showTickets();
    return;
  }
  if (location.hash === "#/reservations") {
    showAllReservations();
    return;
  }
  if (location.hash === "#/materials") {
    showMaterials();
    return;
  }
  if (location.hash === "#/accounts") {
    showManage();
    return;
  }
  if (location.hash === "#/choose") {
    const opening = chooseView.hidden;
    showChoose();
    if (opening) loadCatalogue().catch(showError);
  }
});

setInterval(() => {
  if (!token || accountView.hidden) return;
  loadHistory({ silent: true }).catch(() => {});
}, 30000);

setInterval(() => {
  if (!token || materialsView.hidden) return;
  if (document.activeElement && document.activeElement.id === "materialQuantity") return;
  loadMaterials().catch(() => {});
}, 15000);

typeSelect.addEventListener("change", () => loadCatalogue().catch(showError));

list.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  loadDetails(card.dataset.id).catch(showError);
});

details.addEventListener("click", (event) => {
  const book = event.target.closest("[data-book]");
  if (book) {
    bookSlot(details.dataset.id, book.dataset.start, book.dataset.end, book).catch(showAvailabilityError);
    return;
  }
  const day = event.target.closest("[data-date]");
  if (day) {
    selectAvailabilityDate(day.dataset.date);
    loadAvailability(details.dataset.id).catch(showAvailabilityError);
    return;
  }
  const shift = event.target.closest("[data-day-shift]");
  if (!shift || shift.disabled) return;
  dayWindowStart = shiftDay(dayWindowStart, Number(shift.dataset.dayShift));
  renderDayStrip();
});

details.addEventListener("change", (event) => {
  if (event.target.id !== "availabilityDate") return;
  loadAvailability(details.dataset.id).catch(showAvailabilityError);
});

// ---- Quick links between Tickets, Materials and Staff (Block machine) ----

function isMaterialTicket(item) {
  return item.issueType === "Low material";
}

function goTo(hash, show) {
  if (location.hash !== hash) location.hash = hash;
  else show();
}

function openBlockMachine(id, reason) {
  staffDetails.dataset.id = id;
  pendingBlockReason = reason || "";
  goTo("#/staff", showStaff);
}

function openMachineTickets(id, ticketId, type) {
  pendingTicketType = type || "";
  selectedTicketId = ticketId || "";
  ticketGroup = "open";
  goTo("#/tickets", showTickets);
}

function openMachineMaterials(id) {
  selectedMaterialId = id || "";
  goTo("#/materials", showMaterials);
}

ticketsDetails.addEventListener("click", (event) => {
  const block = event.target.closest("[data-block-machine]");
  if (block) {
    openBlockMachine(block.dataset.blockMachine, block.dataset.blockReason);
    return;
  }
  const material = event.target.closest("[data-open-materials]");
  if (material) openMachineMaterials(material.dataset.openMaterials);
});

staffDetails.addEventListener("click", (event) => {
  const tickets = event.target.closest("[data-staff-tickets]");
  if (tickets) {
    openMachineTickets(tickets.dataset.staffTickets, "", tickets.dataset.staffTicketType);
    return;
  }
  const materials = event.target.closest("[data-staff-materials]");
  if (materials) openMachineMaterials(materials.dataset.staffMaterials);
});

// ---- Materials: everyone sees the level, only staff can update it ----

function materialStateClass(state) {
  if (state === "ok") return "open";
  if (state === "low") return "is-awaiting";
  return "blocked";
}

function materialStateLabel(state) {
  if (state === "ok") return "In stock";
  if (state === "low") return "Low";
  return "Empty";
}

function materialAmount(item) {
  return `${item.quantity} of ${item.capacity}`;
}

function showMaterialsError(error) {
  const text = {
    NoSession: "Sign in to see the materials.",
    Forbidden: "Only staff can change a level.",
    EquipmentNotFound: "Machine not found.",
    InvalidQuantity: "Enter a whole number from 0 to 9999.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(materialsMessage, text || "Something went wrong.", "is-blocked");
}

function materialLine(material) {
  if (!material) return "—";
  const label = material.state === "ok" ? "In stock" : material.state === "low" ? "Low" : "Empty";
  return `${material.name} · ${label} · ${material.percent}% · ${material.quantity} of ${material.capacity} ${material.unit}`;
}

function shortChartDay(iso) {
  const date = parseIsoDate(iso);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
  return `${date.getDate()} ${month}`;
}

function chartTime(item) {
  const value = Date.parse(`${item.date}T${item.start}:00`);
  return Number.isNaN(value) ? 0 : value;
}

function materialChart(item) {
  const uses = item.uses || [];
  if (uses.length === 0) {
    return `<p class="note">No reservation has used this material yet.</p>`;
  }
  const capacity = item.capacity || 1;
  const ceiling = 86;
  const times = uses.map(chartTime);
  const first = Math.min(...times);
  const last = Math.max(...times);
  const span = last - first;
  const points = uses.map((use, index) => {
    const along = span === 0 ? (uses.length === 1 ? 0.5 : index / (uses.length - 1)) : (chartTime(use) - first) / span;
    const x = 8 + along * 84;
    const stock = use.stockAfter == null ? item.quantity : use.stockAfter;
    const y = Math.max(0, Math.min(ceiling, (stock / capacity) * ceiling));
    return { ...use, x, y, stock };
  });
  const line = points.map((point) => `${point.x},${100 - point.y}`).join(" ");
  return `
    <section class="material-chart">
      <p class="eyebrow">Stock over time</p>
      <div class="xy-chart">
        <div class="xy-y" aria-hidden="true">
          <span class="xy-max" style="bottom:${ceiling}%">${capacity}</span>
          <span class="xy-readout-y" hidden></span>
        </div>
        <div class="xy-main">
          <div class="xy-plot" data-unit="${escapeHtml(item.unit)}">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="${line}"></polyline>
            </svg>
            <span class="xy-guide-x" hidden></span>
            <span class="xy-guide-y" hidden></span>
            ${points.map((point) => `
              <span class="xy-mark" style="left:${point.x}%; bottom:${point.y}%">
                <button class="xy-point" type="button" data-chart-point="${escapeHtml(point.reservationId)}" data-stock="${point.stock}" data-when="${escapeHtml(`${shortChartDay(point.date)} ${point.start}`)}" aria-label="${escapeHtml(point.reservationId)}"></button>
                <span class="xy-pop" hidden>
                  <button type="button" data-open-reservation="${escapeHtml(point.reservationId)}">${escapeHtml(point.reservationId)}</button>
                </span>
              </span>
            `).join("")}
          </div>
          <div class="xy-x" aria-hidden="true">
            <span class="xy-readout-x" hidden></span>
            <span class="xy-last">${escapeHtml(shortChartDay(uses[uses.length - 1].date))}</span>
          </div>
        </div>
      </div>
      <p class="note">Y is ${escapeHtml(item.unit)} left. X is the reservation time. Choose a point to see its reservation.</p>
    </section>`;
}

function openStaffReservation(id) {
  pendingReservationId = id;
  pendingProfileUser = "";
  document.querySelector("#historyDate").value = "";
  document.querySelector("#historyEquipment").value = "";
  document.querySelector("#historyStatus").value = "";
  const user = document.querySelector("#historyUser");
  if (user) user.value = "";
  if (location.hash !== "#/reservations") location.hash = "#/reservations";
  else showAllReservations();
}

function levelMeter(item) {
  const tone = item.state === "ok" ? "is-ok" : item.state === "low" ? "is-low" : "is-empty";
  return `<span class="level-track" aria-hidden="true"><span class="level-fill ${tone}" style="width:${item.percent}%"></span></span>`;
}

function showMaterials() {
  if (accountRole !== "staff") {
    showAccount();
    return;
  }
  chooseView.hidden = true;
  accountView.hidden = true;
  staffView.hidden = true;
  ticketsView.hidden = true;
  manageView.hidden = true;
  materialsView.hidden = false;
  document.querySelector("#backToChoices").hidden = false;
  pageTitle.textContent = "Materials";
  pageLede.textContent = materialsCanManage
    ? "Material level for each machine. Update a level, or block a machine that has run out."
    : "How much material is left for each machine.";
  document.title = "Materials";
  if (location.hash !== "#/materials") location.hash = "#/materials";
  window.scrollTo(0, 0);
  setBanner(materialsMessage, "");
  loadMaterials().catch(showMaterialsError);
}

function renderMaterialDetails(item) {
  const staffPart = materialsCanManage ? `
    <form id="materialForm" class="block-form">
      <label for="materialQuantity">New level (${escapeHtml(item.unit)})</label>
      <input id="materialQuantity" type="number" min="0" max="${item.capacity}" step="1" value="${item.quantity}">
      <div class="block-actions">
        <button class="primary" type="submit">Update level</button>
      </div>
    </form>
    <div class="block-actions staff-links">
      ${item.ticketId ? `<button class="ghost" type="button" data-material-ticket="${escapeHtml(item.equipmentId)}" data-ticket-id="${escapeHtml(item.ticketId)}" data-material-ticket-type="${escapeHtml(item.equipment)}">View ticket</button>` : ""}
      <button class="ghost" type="button" data-material-block="${escapeHtml(item.equipmentId)}" data-block-reason="${item.state === "ok" ? "" : "Low material"}">Block machine</button>
    </div>
  ` : "";
  materialsDetails.dataset.id = item.id;
  materialsDetails.innerHTML = `
    <p class="eyebrow">Material</p>
    <h2>${escapeHtml(item.equipment)}</h2>
    <p class="card-location">${item.serial ? `${escapeHtml(item.serial)} · ` : ""}${escapeHtml(item.location)}</p>
    <p><span class="badge ${materialStateClass(item.state)}">${materialStateLabel(item.state)}</span> ${item.percent}%</p>
    ${levelMeter(item)}
    <p class="card-status">${escapeHtml(item.name)} · ${escapeHtml(materialAmount(item))} ${escapeHtml(item.unit)} · full stock ${item.capacity} ${escapeHtml(item.unit)}</p>
    <p class="note">One booked hour uses ${item.usePerHour} ${escapeHtml(item.unit)}.</p>
    ${materialChart(item)}
    ${staffPart}
  `;
}

function visibleMaterials() {
  return materialRows
    .filter((item) => !materialType || item.equipment === materialType)
    .slice()
    .sort((left, right) => left.percent - right.percent || left.serial.localeCompare(right.serial));
}

function renderMaterialChips() {
  const order = ["3D printer", "laser cutter", "electronics workstation", "printer"];
  const types = [...new Set(materialRows.map((item) => item.equipment))].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
  });
  const chips = [{ value: "", label: "All" }].concat(types.map((type) => ({ value: type, label: type })));
  document.querySelector("#materialsTypeChips").innerHTML = chips.map((chip) => {
    const selected = chip.value === materialType;
    return `<button class="chip${selected ? " is-selected" : ""}" type="button" data-material-type="${escapeHtml(chip.value)}" aria-pressed="${selected}">${escapeHtml(chip.label)}</button>`;
  }).join("");
}

function renderMaterials(message) {
  renderMaterialChips();
  const visible = visibleMaterials();
  materialsList.innerHTML = visible.map((item) => `
    <button class="card${item.id === selectedMaterialId ? " is-selected" : ""}" type="button" data-material="${escapeHtml(item.id)}" ${item.id === selectedMaterialId ? "aria-current=\"true\"" : ""}>
      <span class="card-top">
        <span class="card-title">${escapeHtml(item.equipment)}</span>
        <span class="badge ${materialStateClass(item.state)}">${materialStateLabel(item.state)}</span>
      </span>
      <span class="card-location">${escapeHtml(item.name)} · ${item.serial ? `${escapeHtml(item.serial)} · ` : ""}${escapeHtml(item.location)}</span>
      ${levelMeter(item)}
      <span class="card-status">${item.percent}% · ${escapeHtml(materialAmount(item))} ${escapeHtml(item.unit)}</span>
    </button>
  `).join("");
  setBanner(materialsMessage, visible.length === 0 && materialType ? "No materials found" : message, "is-warning");
  const selected = visible.find((item) => item.id === selectedMaterialId);
  if (selected) renderMaterialDetails(selected);
  else {
    if (!materialRows.some((item) => item.id === selectedMaterialId)) selectedMaterialId = "";
    delete materialsDetails.dataset.id;
    materialsDetails.innerHTML = `
      <div class="empty">
        <p class="eyebrow">Material</p>
        <h2>Pick one</h2>
        <p>Open a machine to see how much material is left.</p>
      </div>
    `;
  }
}

async function loadMaterials() {
  const data = await readJson(await fetch("/api/materials", { headers: sessionHeader() }));
  materialsCanManage = data.canManage === true;
  materialRows = data.materials || [];
  pageLede.textContent = materialsCanManage
    ? "Material level for each machine. Update a level, or block a machine that has run out."
    : "How much material is left for each machine.";
  renderMaterials(data.message);
  return data;
}

async function updateMaterialLevel(id, quantity) {
  const data = await readJson(await fetch(`/api/staff/materials/${encodeURIComponent(id)}/level`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({ quantity })
  }));
  await loadMaterials();
  setBanner(materialsMessage, data.message, data.state === "ok" ? "is-open" : "is-warning");
}

document.querySelector("#materialsTypeChips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-material-type]");
  if (!chip) return;
  materialType = chip.dataset.materialType;
  renderMaterials("");
});

materialsList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-material]");
  if (!card) return;
  selectedMaterialId = card.dataset.material;
  setBanner(materialsMessage, "");
  loadMaterials().catch(showMaterialsError);
});

materialsDetails.addEventListener("submit", (event) => {
  const form = event.target.closest("#materialForm");
  if (!form) return;
  event.preventDefault();
  const input = document.querySelector("#materialQuantity");
  const value = input.value.trim() === "" ? NaN : Number(input.value);
  const max = Number(input.max);
  const invalid = !Number.isInteger(value) || value < 0 || value > max;
  input.classList.toggle("is-invalid", invalid);
  if (invalid) {
    setBanner(materialsMessage, `Enter a whole number from 0 to ${max}.`, "is-blocked");
    return;
  }
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;
  updateMaterialLevel(materialsDetails.dataset.id, value).catch((error) => {
    if (button) button.disabled = false;
    showMaterialsError(error);
  });
});

materialsDetails.addEventListener("click", (event) => {
  const reservation = event.target.closest("[data-open-reservation]");
  if (reservation) {
    openStaffReservation(reservation.dataset.openReservation);
    return;
  }
  const point = event.target.closest("[data-chart-point]");
  if (point) {
    const plot = point.closest(".xy-plot");
    const chart = point.closest(".xy-chart");
    const pop = point.parentElement.querySelector(".xy-pop");
    const show = pop.hidden;
    const guideX = plot.querySelector(".xy-guide-x");
    const guideY = plot.querySelector(".xy-guide-y");
    const readoutY = chart.querySelector(".xy-readout-y");
    const readoutX = chart.querySelector(".xy-readout-x");
    const last = chart.querySelector(".xy-last");
    const maxLabel = chart.querySelector(".xy-max");
    plot.querySelectorAll(".xy-pop").forEach((item) => { item.hidden = true; });
    plot.querySelectorAll(".xy-point").forEach((item) => item.classList.remove("is-selected"));
    guideX.hidden = true;
    guideY.hidden = true;
    readoutY.hidden = true;
    readoutX.hidden = true;
    last.hidden = false;
    maxLabel.hidden = false;
    if (show) {
      const mark = point.parentElement;
      pop.hidden = false;
      point.classList.add("is-selected");
      guideX.hidden = false;
      guideX.style.bottom = mark.style.bottom;
      guideX.style.width = mark.style.left;
      guideY.hidden = false;
      guideY.style.left = mark.style.left;
      guideY.style.height = mark.style.bottom;
      readoutY.hidden = false;
      readoutY.style.bottom = mark.style.bottom;
      readoutY.textContent = `${point.dataset.stock} ${plot.dataset.unit}`;
      readoutX.hidden = false;
      readoutX.style.left = mark.style.left;
      readoutX.textContent = point.dataset.when;
      last.hidden = true;
      maxLabel.hidden = parseFloat(mark.style.bottom) > 74;
    }
    return;
  }
  const block = event.target.closest("[data-material-block]");
  if (block) {
    openBlockMachine(block.dataset.materialBlock, block.dataset.blockReason);
    return;
  }
  const ticket = event.target.closest("[data-material-ticket]");
  if (ticket) openMachineTickets(ticket.dataset.materialTicket, ticket.dataset.ticketId, ticket.dataset.materialTicketType);
});

document.querySelector("#openMaterials").addEventListener("click", () => {
  if (location.hash !== "#/materials") location.hash = "#/materials";
});

// ---- Manage accounts: staff can suspend an account until a date, or reactivate it ----

function showManageError(error) {
  const text = {
    NoSession: "Sign in to manage accounts.",
    Forbidden: "Only staff can manage accounts.",
    UserNotFound: "This account does not exist.",
    CannotSuspend: "You cannot suspend your own account.",
    SuspensionIncomplete: "Choose an end date from today onwards.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(manageMessage, text || "Something went wrong.", "is-blocked");
}

function showManage() {
  if (accountRole !== "staff") {
    showAccount();
    return;
  }
  chooseView.hidden = true;
  accountView.hidden = true;
  staffView.hidden = true;
  ticketsView.hidden = true;
  materialsView.hidden = true;
  manageView.hidden = false;
  document.querySelector("#backToChoices").hidden = false;
  pageTitle.textContent = "Manage accounts";
  pageLede.textContent = "Suspend an account until a date, or reactivate it. A suspended account cannot sign in.";
  document.title = "Manage accounts";
  if (location.hash !== "#/accounts") location.hash = "#/accounts";
  window.scrollTo(0, 0);
  setBanner(manageMessage, "");
  loadManage().catch(showManageError);
}

function accountBadge(item) {
  return item.status === "suspended"
    ? `<span class="badge blocked">Suspended</span>`
    : `<span class="badge open">Active</span>`;
}

function renderManageDetails(item) {
  const own = item.email === document.querySelector("#accountEmail").textContent;
  const suspended = item.status === "suspended";
  manageDetails.dataset.id = item.id;
  manageDetails.innerHTML = `
    <p class="eyebrow">Account</p>
    <h2>${escapeHtml(item.name)}</h2>
    <p class="card-location">${escapeHtml(item.email)} · ${escapeHtml(roleLabel(item.role))}</p>
    <p>${accountBadge(item)}</p>
    ${suspended ? `<p class="card-status">Suspended until ${escapeHtml(item.until)}</p>` : ""}
    ${own ? "<p>This is your own account. You cannot suspend it.</p>" : `
      <form id="suspendForm" class="block-form">
        <label for="suspendUntil">Suspended until</label>
        <input id="suspendUntil" type="date" value="${escapeHtml(item.until || "")}">
        <div class="block-actions">
          <button class="primary" type="submit">${suspended ? "Update suspension" : "Suspend account"}</button>
          ${suspended ? `<button id="reactivateAccount" class="ghost" type="button">Reactivate</button>` : ""}
        </div>
      </form>
    `}
  `;
}

function visibleAccounts() {
  const query = accountQuery.trim().toLowerCase();
  return accountRows.filter((item) => {
    if (!query) return true;
    return item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query);
  });
}

function renderManage() {
  const visible = visibleAccounts();
  manageList.innerHTML = visible.map((item) => `
    <button class="card${item.id === selectedAccountId ? " is-selected" : ""}" type="button" data-account="${escapeHtml(item.id)}" ${item.id === selectedAccountId ? "aria-current=\"true\"" : ""}>
      <span class="card-top">
        <span class="card-title">${escapeHtml(item.name)}</span>
        ${accountBadge(item)}
      </span>
      <span class="card-location">${escapeHtml(item.email)}</span>
      <span class="card-status">${item.status === "suspended" ? `Until ${escapeHtml(item.until)}` : escapeHtml(roleLabel(item.role))}</span>
    </button>
  `).join("");
  const selected = visible.find((item) => item.id === selectedAccountId);
  if (selected) renderManageDetails(selected);
  else {
    if (!accountRows.some((item) => item.id === selectedAccountId)) selectedAccountId = "";
    manageDetails.innerHTML = `
      <div class="empty">
        <p class="eyebrow">Account</p>
        <h2>Pick one</h2>
        <p>${visible.length === 0 ? "No account matches that name or email." : "Choose an account to suspend it or to reactivate it."}</p>
      </div>
    `;
  }
}

async function loadManage() {
  const data = await readJson(await fetch("/api/staff/accounts", { headers: sessionHeader() }));
  accountRows = data.accounts || [];
  renderManage();
  return data;
}

function armSuspend(button) {
  if (button.dataset.ready === "yes") return true;
  button.dataset.ready = "yes";
  button.textContent = "Yes, suspend";
  setBanner(manageMessage, "Suspend this account? The person will be signed out and will not be able to sign in until that date.", "is-warning");
  return false;
}

async function suspendAccountRequest(id, until) {
  const data = await readJson(await fetch(`/api/staff/accounts/${encodeURIComponent(id)}/suspend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({ until })
  }));
  await loadManage();
  setBanner(manageMessage, data.message, "is-open");
}

async function reactivateAccountRequest(id) {
  const data = await readJson(await fetch(`/api/staff/accounts/${encodeURIComponent(id)}/reactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: "{}"
  }));
  await loadManage();
  setBanner(manageMessage, data.message, "is-open");
}

document.querySelector("#accountSearch").addEventListener("input", (event) => {
  accountQuery = event.target.value;
  renderManage();
});

manageList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-account]");
  if (!card) return;
  selectedAccountId = card.dataset.account;
  setBanner(manageMessage, "");
  loadManage().catch(showManageError);
});

manageDetails.addEventListener("input", () => {
  const button = manageDetails.querySelector("#suspendForm button[type='submit']");
  if (button && button.dataset.ready === "yes") {
    delete button.dataset.ready;
    button.textContent = manageDetails.querySelector("#reactivateAccount") ? "Update suspension" : "Suspend account";
    setBanner(manageMessage, "");
  }
});

manageDetails.addEventListener("submit", (event) => {
  const form = event.target.closest("#suspendForm");
  if (!form) return;
  event.preventDefault();
  const until = document.querySelector("#suspendUntil");
  until.classList.toggle("is-invalid", !until.value);
  if (!until.value) {
    setBanner(manageMessage, "Choose an end date from today onwards.", "is-blocked");
    return;
  }
  const button = form.querySelector("button[type='submit']");
  if (!armSuspend(button)) return;
  button.disabled = true;
  suspendAccountRequest(manageDetails.dataset.id, until.value).catch((error) => {
    button.disabled = false;
    showManageError(error);
  });
});

manageDetails.addEventListener("click", (event) => {
  const button = event.target.closest("#reactivateAccount");
  if (!button) return;
  button.disabled = true;
  reactivateAccountRequest(manageDetails.dataset.id).catch((error) => {
    button.disabled = false;
    showManageError(error);
  });
});

document.querySelector("#openManage").addEventListener("click", () => {
  if (location.hash !== "#/accounts") location.hash = "#/accounts";
});

async function restore() {
  if (!token) {
    showSignedOut();
    return;
  }
  try {
    const account = await readJson(await fetch("/api/me", { headers: sessionHeader() }));
    showSignedIn(account);
    if (location.hash !== "#/account" && location.hash !== "#/staff") await loadCatalogue();
  } catch (error) {
    if (error.code === "NoSession") {
      showSignedOut();
      return;
    }
    showError(error);
  }
}

restore();
