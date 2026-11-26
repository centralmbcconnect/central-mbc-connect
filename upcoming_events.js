import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ksdjtqnfrrdvfyzocuai.supabase.co",
  "sb_publishable_NoaBJAT3yRLAkCk-lTqbiw_ZAr4-KxP"
);
const list = document.getElementById("public-events-list");
const status = document.getElementById("public-events-status");
const title = document.getElementById("events-month-title");
const previous = document.getElementById("events-previous");
const next = document.getElementById("events-next");
const chicagoParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit"
});
let months = [];
let eventsByMonth = new Map();
let selectedMonth = "";
let requestId = 0;

function getMonthKey(value) {
  const parts = Object.fromEntries(chicagoParts.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return parts.year + "-" + parts.month;
}
function formatMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("en-US", {
    timeZone: "America/Chicago", month: "long", year: "numeric"
  });
}
function renderMonth() {
  list.replaceChildren();
  if (!months.length) {
    title.textContent = "No upcoming events";
    status.textContent = "There are no upcoming church events.";
    previous.disabled = true;
    next.disabled = true;
    return;
  }
  let index = months.indexOf(selectedMonth);
  if (index < 0) {
    index = 0;
    selectedMonth = months[index];
  }
  const monthLabel = formatMonth(selectedMonth);
  const events = eventsByMonth.get(selectedMonth) || [];
  title.textContent = monthLabel;
  previous.disabled = index === 0;
  next.disabled = index === months.length - 1;

  for (const event of events) {
    const article = document.createElement("article");
    article.className = "announcement-item";
    const heading = document.createElement("h3");
    heading.textContent = event.title;
    article.append(heading);

    const date = document.createElement("p");
    date.className = "announcement-date";
    date.textContent = new Date(event.starts_at).toLocaleString("en-US", {
      timeZone: "America/Chicago", weekday: "long", month: "long",
      day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
    });
    article.append(date);
    if (event.location) {
      const location = document.createElement("p");
      location.textContent = event.location;
      article.append(location);
    }
    if (event.description) {
      const description = document.createElement("p");
      description.className = "announcement-content";
      description.textContent = event.description;
      article.append(description);
    }
    list.append(article);
  }
  status.textContent = "Showing " + events.length + " upcoming event" +
    (events.length === 1 ? "" : "s") + " for " + monthLabel + ".";
}

async function loadUpcomingEvents() {
  const request = ++requestId;
  status.textContent = "Loading upcoming events...";
  list.replaceChildren();
  try {
    const { data, error } = await supabase.from("church_events")
      .select("id, title, description, location, starts_at, ends_at")
      .eq("published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    if (request !== requestId) return;

    eventsByMonth = new Map();
    for (const event of data || []) {
      const key = getMonthKey(event.starts_at);
      const events = eventsByMonth.get(key) || [];
      events.push(event);
      eventsByMonth.set(key, events);
    }
    months = Array.from(eventsByMonth.keys()).sort();
    if (!months.includes(selectedMonth)) selectedMonth = months[0] || "";
    renderMonth();
  } catch (error) {
    if (request === requestId) {
      list.replaceChildren();
      title.textContent = "Upcoming events";
      status.textContent = "Upcoming events are temporarily unavailable. Please try again.";
      previous.disabled = true;
      next.disabled = true;
    }
  }
}
previous.addEventListener("click", () => {
  const index = months.indexOf(selectedMonth);
  if (index > 0) { selectedMonth = months[index - 1]; renderMonth(); }
});
next.addEventListener("click", () => {
  const index = months.indexOf(selectedMonth);
  if (index >= 0 && index < months.length - 1) { selectedMonth = months[index + 1]; renderMonth(); }
});
window.refreshUpcomingEvents = loadUpcomingEvents;
loadUpcomingEvents();
