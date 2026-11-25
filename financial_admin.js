import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ksdjtqnfrrdvfyzocuai.supabase.co",
  "sb_publishable_NoaBJAT3yRLAkCk-lTqbiw_ZAr4-KxP"
);
const dashboard = document.getElementById("admin-dashboard");
const entryForm = document.getElementById("finance-entry-form");
const budgetForm = document.getElementById("finance-budget-form");
const monthInput = document.getElementById("finance-month");
const summary = document.getElementById("finance-summary");
const entriesList = document.getElementById("finance-entries");
const budgetsList = document.getElementById("finance-budgets");
const status = document.getElementById("finance-status");
const entryStatus = document.getElementById("finance-entry-status");
const budgetStatus = document.getElementById("finance-budget-status");
let requestId = 0;
let entrySaving = false;
let budgetSaving = false;

function money(value) {
  return new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(Number(value) || 0);
}
function monthValue(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0");
}
function dateValue(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
}
function resetForms() {
  entryForm.reset();
  document.getElementById("finance-entry-id").value = "";
  document.getElementById("finance-entry-date").value = dateValue();
  document.getElementById("finance-entry-save").textContent = "Save Entry";
  document.getElementById("finance-entry-cancel").hidden = true;
  budgetForm.reset();
  document.getElementById("finance-budget-id").value = "";
  document.getElementById("finance-budget-month").value = monthInput.value || monthValue();
  document.getElementById("finance-budget-save").textContent = "Save Budget";
  document.getElementById("finance-budget-cancel").hidden = true;
  entryStatus.textContent = "";
  budgetStatus.textContent = "";
}
function clearFinance() {
  requestId++;
  summary.replaceChildren();
  entriesList.replaceChildren();
  budgetsList.replaceChildren();
  status.textContent = "Financial records are ready to load.";
  resetForms();
}
function actionButton(label, callback) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", callback);
  return button;
}
function row(titleText, detailText, edit, remove) {
  const article = document.createElement("article");
  article.className = "finance-row";
  const title = document.createElement("strong");
  title.textContent = titleText;
  const detail = document.createElement("p");
  detail.textContent = detailText || "";
  const actions = document.createElement("div");
  actions.className = "announcement-actions";
  actions.append(actionButton("Edit", edit), actionButton("Delete", remove));
  article.append(title, detail, actions);
  return article;
}
function entryRow(item) {
  return row(item.entry_date + " · " + item.type.toUpperCase() + " · " + money(item.amount),
    item.category + (item.description ? " — " + item.description : ""),
    () => {
      document.getElementById("finance-entry-id").value = item.id;
      document.getElementById("finance-entry-date").value = item.entry_date;
      document.getElementById("finance-entry-type").value = item.type;
      document.getElementById("finance-entry-category").value = item.category;
      document.getElementById("finance-entry-description").value = item.description || "";
      document.getElementById("finance-entry-amount").value = item.amount;
      document.getElementById("finance-entry-save").textContent = "Update Entry";
      document.getElementById("finance-entry-cancel").hidden = false;
      entryStatus.textContent = "Editing financial entry.";
    }, () => deleteEntry(item));
}
function budgetRow(item) {
  return row(item.category + " · " + money(item.planned_amount), "",
    () => {
      document.getElementById("finance-budget-id").value = item.id;
      document.getElementById("finance-budget-month").value = item.budget_month.slice(0,7);
      document.getElementById("finance-budget-category").value = item.category;
      document.getElementById("finance-budget-amount").value = item.planned_amount;
      document.getElementById("finance-budget-save").textContent = "Update Budget";
      document.getElementById("finance-budget-cancel").hidden = false;
      budgetStatus.textContent = "Editing monthly budget.";
    }, () => deleteBudget(item));
}
async function isAdmin() {
  const {data:{session}} = await supabase.auth.getSession();
  if (!session) return false;
  const {data,error} = await supabase.rpc("is_admin");
  if (error) throw error;
  return data === true;
}
async function loadFinance() {
  if (dashboard.hidden) return;
  const current = ++requestId;
  status.textContent = "Loading monthly financial summary...";
  summary.replaceChildren(); entriesList.replaceChildren(); budgetsList.replaceChildren();
  try {
    if (!(await isAdmin())) { dashboard.hidden = true; clearFinance(); return; }
    const month = monthInput.value || monthValue();
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month.");
    const [year,monthNumber] = month.split("-").map(Number);
    const startDate = month + "-01";
    const next = new Date(year,monthNumber,1);
    const endDate = next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")+"-01";
    const {data:entries,error:e1} = await supabase.from("church_financial_entries")
      .select("id,entry_date,type,category,description,amount").gte("entry_date",startDate)
      .lt("entry_date",endDate).order("entry_date",{ascending:false}).limit(1000);
    if (e1) throw e1;
    const {data:budgets,error:e2} = await supabase.from("church_monthly_budgets")
      .select("id,budget_month,category,planned_amount").eq("budget_month",startDate)
      .order("category",{ascending:true}).limit(500);
    if (e2) throw e2;
    if (current !== requestId || dashboard.hidden) return;
    const income = entries.filter(x=>x.type==="income").reduce((n,x)=>n+Number(x.amount),0);
    const expenses = entries.filter(x=>x.type==="expense").reduce((n,x)=>n+Number(x.amount),0);
    const planned = budgets.reduce((n,x)=>n+Number(x.planned_amount),0);
    for (const [label,value] of [["Income",income],["Expenses",expenses],["Net",income-expenses],["Budgeted",planned]]) {
      const card=document.createElement("div"), heading=document.createElement("strong"), total=document.createElement("span");
      heading.textContent=label; total.textContent=money(value); card.append(heading,total); summary.append(card);
    }
    entries.forEach(x=>entriesList.append(entryRow(x)));
    budgets.forEach(x=>budgetsList.append(budgetRow(x)));
    if (!entries.length) entriesList.textContent="No income or expense entries for this month.";
    if (!budgets.length) budgetsList.textContent="No monthly budgets set.";
    status.textContent="Monthly totals for "+month+"; includes up to 1,000 entries.";
  } catch (error) {
    if (current===requestId && !dashboard.hidden) status.textContent="Unable to load financial records. Please try again.";
  }
}
async function deleteEntry(item) {
  if (!window.confirm("Permanently delete this financial entry?")) return;
  try { if (!(await isAdmin())) throw new Error(); const {error}=await supabase.from("church_financial_entries").delete().eq("id",item.id); if(error)throw error; await loadFinance(); }
  catch(error){status.textContent="Could not delete the financial entry. Please try again.";}
}
async function deleteBudget(item) {
  if (!window.confirm("Permanently delete this monthly budget?")) return;
  try { if (!(await isAdmin())) throw new Error(); const {error}=await supabase.from("church_monthly_budgets").delete().eq("id",item.id); if(error)throw error; await loadFinance(); }
  catch(error){status.textContent="Could not delete the monthly budget. Please try again.";}
}
entryForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (dashboard.hidden || entrySaving) return;
  const id=document.getElementById("finance-entry-id").value;
  const entryDate=document.getElementById("finance-entry-date").value;
  const type=document.getElementById("finance-entry-type").value;
  const category=document.getElementById("finance-entry-category").value.trim();
  const description=document.getElementById("finance-entry-description").value.trim();
  const amount=Number(document.getElementById("finance-entry-amount").value);
  if (!entryDate || !["income","expense"].includes(type) || !category || category.length>100 || description.length>1000 ||
      !Number.isFinite(amount) || amount<=0 || amount>=10000000000 || Math.round(amount*100)!==amount*100) {
    entryStatus.textContent="Enter a valid date, category, description, and amount with no more than two decimal places."; return;
  }
  entrySaving=true; document.getElementById("finance-entry-save").disabled=true; entryStatus.textContent="Saving entry...";
  try {
    if (!(await isAdmin())) throw new Error();
    const values={entry_date:entryDate,type,category,description:description||null,amount:amount.toFixed(2)};
    const result=id ? await supabase.from("church_financial_entries").update(values).eq("id",id).select("id").maybeSingle()
      : await supabase.from("church_financial_entries").insert(values).select("id").single();
    if(result.error||!result.data)throw result.error||new Error();
    resetForms(); await loadFinance(); entryStatus.textContent="Financial entry saved.";
  } catch(error){entryStatus.textContent="Could not save the financial entry. Please try again.";}
  finally{entrySaving=false;document.getElementById("finance-entry-save").disabled=false;}
});
budgetForm.addEventListener("submit", async event => {
  event.preventDefault();
  if(dashboard.hidden||budgetSaving)return;
  const id=document.getElementById("finance-budget-id").value;
  const month=document.getElementById("finance-budget-month").value;
  const category=document.getElementById("finance-budget-category").value.trim();
  const amount=Number(document.getElementById("finance-budget-amount").value);
  if(!/^\d{4}-\d{2}$/.test(month)||!category||category.length>100||!Number.isFinite(amount)||amount<=0||
      amount>=10000000000||Math.round(amount*100)!==amount*100){budgetStatus.textContent="Enter a valid month, category, and amount with no more than two decimal places.";return;}
  budgetSaving=true;document.getElementById("finance-budget-save").disabled=true;budgetStatus.textContent="Saving monthly budget...";
  try{
    if(!(await isAdmin()))throw new Error();
    const values={budget_month:month+"-01",category,planned_amount:amount.toFixed(2)};
    const result=id?await supabase.from("church_monthly_budgets").update(values).eq("id",id).select("id").maybeSingle()
      :await supabase.from("church_monthly_budgets").upsert(values,{onConflict:"budget_month,category"}).select("id").single();
    if(result.error||!result.data)throw result.error||new Error();
    resetForms();await loadFinance();budgetStatus.textContent="Monthly budget saved.";
  }catch(error){budgetStatus.textContent="Could not save the monthly budget. Please try again.";}
  finally{budgetSaving=false;document.getElementById("finance-budget-save").disabled=false;}
});
document.getElementById("finance-refresh").addEventListener("click",loadFinance);
monthInput.addEventListener("change",loadFinance);
document.getElementById("finance-entry-cancel").addEventListener("click",resetForms);
document.getElementById("finance-budget-cancel").addEventListener("click",resetForms);

async function updateAdminView() {
  setTimeout(async ()=>{
    try {
      if (!(await isAdmin())) { clearFinance(); return; }
      monthInput.value=monthValue();
      document.getElementById("finance-budget-month").value=monthInput.value;
      document.getElementById("finance-entry-date").value=dateValue();
      await loadFinance();
    } catch(error) { clearFinance(); }
  },0);
}
supabase.auth.onAuthStateChange(updateAdminView);
updateAdminView();
