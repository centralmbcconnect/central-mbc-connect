import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ksdjtqnfrrdvfyzocuai.supabase.co",
  "sb_publishable_NoaBJAT3yRLAkCk-lTqbiw_ZAr4-KxP"
);
const grid = document.getElementById("church-calendar-grid");
const status = document.getElementById("calendar-status");
const title = document.getElementById("calendar-month-title");
const previous = document.getElementById("calendar-previous");
const next = document.getElementById("calendar-next");
const chicagoDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit"
});
const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
let shownMonth = new Date();
shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
let requestId = 0;

function getChicagoDateParts(value) {
  const parts = Object.fromEntries(chicagoDate.formatToParts(new Date(value)).map(part => [part.type,part.value]));
  return {year:Number(parts.year),month:Number(parts.month)-1,day:Number(parts.day)};
}
function monthKey(year, month) {
  const date = new Date(year,month,1);
  return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
}
function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-US", {
    timeZone:"America/Chicago",hour:"numeric",minute:"2-digit"
  });
}
function drawCalendar(events, year, month) {
  grid.replaceChildren();
  for (const dayName of weekdays) {
    const header = document.createElement("div");
    header.className = "calendar-weekday";
    header.setAttribute("role","columnheader");
    header.textContent = dayName;
    grid.append(header);
  }
  const first = new Date(year,month,1);
  const offset = first.getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = Math.ceil((offset+daysInMonth)/7)*7;
  const byDay = new Map();
  for (const event of events) {
    const d = getChicagoDateParts(event.starts_at);
    if (d.year !== year || d.month !== month) continue;
    const list = byDay.get(d.day) || [];
    list.push(event);
    byDay.set(d.day,list);
  }
  for (let cell=0; cell<cells; cell++) {
    const day = cell-offset+1;
    const inMonth = day>=1 && day<=daysInMonth;
    const box = document.createElement("div");
    box.className = "calendar-day"+(inMonth?"":" outside-month");
    box.setAttribute("role","gridcell");
    if (inMonth) {
      const number = document.createElement("span");
      number.className = "calendar-day-number";
      number.textContent = String(day);
      box.append(number);
      const dayEvents = byDay.get(day) || [];
      for (const item of dayEvents.slice(0,3)) {
        const eventLine = document.createElement("span");
        eventLine.className = "calendar-event";
        eventLine.title = item.title;
        const time = document.createElement("span");
        time.className = "calendar-event-time";
        time.textContent = formatTime(item.starts_at);
        const eventTitle = document.createElement("span");
        eventTitle.textContent = item.title;
        eventLine.append(time,eventTitle);
        box.append(eventLine);
      }
      if (dayEvents.length>3) {
        const more=document.createElement("span");
        more.className="calendar-event";
        more.textContent="+"+(dayEvents.length-3)+" more";
        box.append(more);
      }
    }
    grid.append(box);
  }
}
async function loadCalendar() {
  const request=++requestId;
  const year=shownMonth.getFullYear(), month=shownMonth.getMonth();
  title.textContent=shownMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  status.textContent="Loading events...";
  grid.replaceChildren();
  const now=new Date();
  const currentMonth=new Date(now.getFullYear(),now.getMonth(),1);
  previous.disabled=shownMonth<=currentMonth;
  try {
    const {data,error}=await supabase.from("church_events")
      .select("id,title,starts_at,ends_at,location,description")
      .eq("published",true).gte("starts_at",now.toISOString())
      .order("starts_at",{ascending:true}).limit(500);
    if(error) throw error;
    if(request!==requestId) return;
    const monthEvents=data.filter(item=>{
      const d=getChicagoDateParts(item.starts_at);
      return d.year===year && d.month===month;
    });
    drawCalendar(monthEvents,year,month);
    status.textContent=monthEvents.length
      ? "Showing "+monthEvents.length+" published event"+(monthEvents.length===1?"":"s")+" for "+title.textContent+"."
      : "No published events for "+title.textContent+".";
  } catch(error) {
    if(request===requestId) status.textContent="Unable to load the church calendar. Please try again.";
  }
}
previous.addEventListener("click",()=>{
  const current=new Date(); const floor=new Date(current.getFullYear(),current.getMonth(),1);
  const candidate=new Date(shownMonth.getFullYear(),shownMonth.getMonth()-1,1);
  if(candidate>=floor){shownMonth=candidate;loadCalendar();}
});
next.addEventListener("click",()=>{shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()+1,1);loadCalendar();});
loadCalendar();
