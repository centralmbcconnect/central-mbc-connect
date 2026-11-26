import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ksdjtqnfrrdvfyzocuai.supabase.co",
  "sb_publishable_NoaBJAT3yRLAkCk-lTqbiw_ZAr4-KxP"
);
const dashboard=document.getElementById("admin-dashboard");
const form=document.getElementById("sermon-form");
const formStatus=document.getElementById("sermon-form-status");
const adminStatus=document.getElementById("sermon-admin-status");
const adminList=document.getElementById("sermon-admin-list");
const publicStatus=document.getElementById("public-sermons-status");
const publicList=document.getElementById("public-sermons-list");
const titleInput=document.getElementById("sermon-title");
const descriptionInput=document.getElementById("sermon-description");
const urlInput=document.getElementById("sermon-url");
const publishedInput=document.getElementById("sermon-published");
let requestId=0;
let saving=false;

function videoIdFromUrl(value) {
  let url;
  try { url=new URL(value); } catch(error) { return null; }
  if(url.protocol!=="https:") return null;
  const host=url.hostname.toLowerCase();
  if(host==="youtu.be") {
    const id=url.pathname.split("/").filter(Boolean)[0];
    return /^[A-Za-z0-9_-]{11}$/.test(id||"") ? id : null;
  }
  if(!["youtube.com","www.youtube.com","m.youtube.com"].includes(host)) return null;
  let id="";
  if(url.pathname==="/watch") id=url.searchParams.get("v")||"";
  else {
    const match=url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
    if(match) id=match[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
function clearForm() {
  form.reset();
  document.getElementById("sermon-id").value="";
  document.getElementById("sermon-save").textContent="Save Video";
  document.getElementById("sermon-cancel").hidden=true;
  formStatus.textContent="";
}
function clearAdmin() {
  requestId++;
  adminList.replaceChildren();
  adminStatus.textContent="Videos are ready to load.";
  clearForm();
}
function addEmbed(container,id,titleText,description) {
  const article=document.createElement("article");
  article.className="sermon-card";
  const frame=document.createElement("iframe");
  frame.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id);
  frame.title=titleText;
  frame.loading="lazy";
  frame.referrerPolicy="strict-origin-when-cross-origin";
  frame.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.allowFullscreen=true;
  const heading=document.createElement("h3");
  heading.textContent=titleText;
  article.append(frame,heading);
  if(description) {
    const detail=document.createElement("p");
    detail.textContent=description;
    article.append(detail);
  }
  container.append(article);
}
async function loadPublicVideos() {
  publicStatus.textContent="Loading sermons and videos...";
  publicList.replaceChildren();
  try {
    const {data,error}=await supabase.from("church_sermons")
      .select("id,title,description,youtube_video_id,created_at")
      .eq("published",true).order("created_at",{ascending:false}).limit(50);
    if(error) throw error;
    if(!data.length){
      addEmbed(publicList,"ljk4RgWur9I","Central MBC Sermon","Watch this public sermon on the Central MBC YouTube channel.");
      publicStatus.textContent="Featured sermon from Central MBC.";
      return;
    }
    for(const item of data) addEmbed(publicList,item.youtube_video_id,item.title,item.description);
    publicStatus.textContent="";
  } catch(error) { publicStatus.textContent="Unable to load sermons and videos right now."; }
}
async function isAdmin() {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)return false;
  const {data,error}=await supabase.rpc("is_admin");
  if(error)throw error;
  return data===true;
}
function adminRow(item) {
  const article=document.createElement("article");
  article.className="announcement-item";
  const heading=document.createElement("h4");
  heading.textContent=item.title;
  const state=document.createElement("p");
  state.className="announcement-date";
  state.textContent=item.published?"Published":"Draft";
  const link=document.createElement("a");
  link.href="https://youtu.be/"+encodeURIComponent(item.youtube_video_id);
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.textContent="Open YouTube video";
  const actions=document.createElement("div");
  actions.className="announcement-actions";
  const edit=document.createElement("button");
  edit.type="button";edit.textContent="Edit";
  edit.addEventListener("click",()=>{
    document.getElementById("sermon-id").value=item.id;
    titleInput.value=item.title;
    descriptionInput.value=item.description||"";
    urlInput.value=item.youtube_url;
    publishedInput.checked=item.published;
    document.getElementById("sermon-save").textContent="Update Video";
    document.getElementById("sermon-cancel").hidden=false;
    formStatus.textContent="Editing video.";
  });
  const remove=document.createElement("button");
  remove.type="button";remove.textContent="Delete";
  remove.addEventListener("click",()=>deleteVideo(item));
  actions.append(edit,remove);
  article.append(heading,state,link,actions);
  return article;
}
async function loadAdminVideos() {
  if(dashboard.hidden)return;
  const request=++requestId;
  adminStatus.textContent="Loading videos...";
  adminList.replaceChildren();
  try {
    if(!(await isAdmin())){dashboard.hidden=true;clearAdmin();return;}
    const {data,error}=await supabase.from("church_sermons")
      .select("id,title,description,youtube_url,youtube_video_id,published,created_at")
      .order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    if(request!==requestId||dashboard.hidden)return;
    for(const item of data)adminList.append(adminRow(item));
    adminStatus.textContent=data.length?"Showing the latest "+data.length+" video records.":"No videos have been added yet.";
  } catch(error) {
    if(request===requestId&&!dashboard.hidden)adminStatus.textContent="Unable to load videos. Please try again.";
  }
}
async function deleteVideo(item) {
  if(!window.confirm("Delete the video record for “"+item.title+"”?"))return;
  try {
    if(!(await isAdmin()))throw new Error();
    const {error}=await supabase.from("church_sermons").delete().eq("id",item.id);
    if(error)throw error;
    await loadAdminVideos();await loadPublicVideos();
  } catch(error){adminStatus.textContent="Could not delete the video. Please try again.";}
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(dashboard.hidden||saving)return;
  const id=document.getElementById("sermon-id").value;
  const title=titleInput.value.trim();
  const description=descriptionInput.value.trim();
  const youtubeUrl=urlInput.value.trim();
  const videoId=videoIdFromUrl(youtubeUrl);
  if(!title||title.length>200||description.length>3000||!videoId) {
    formStatus.textContent="Enter a title and a valid YouTube video link.";
    return;
  }
  saving=true;document.getElementById("sermon-save").disabled=true;
  formStatus.textContent="Saving video...";
  try {
    if(!(await isAdmin()))throw new Error();
    const values={title,description:description||null,youtube_url:youtubeUrl,youtube_video_id:videoId,published:publishedInput.checked};
    const result=id
      ?await supabase.from("church_sermons").update(values).eq("id",id).select("id").maybeSingle()
      :await supabase.from("church_sermons").insert(values).select("id").single();
    if(result.error||!result.data)throw result.error||new Error();
    clearForm();await loadAdminVideos();await loadPublicVideos();
    formStatus.textContent="Video saved.";
  } catch(error){formStatus.textContent="Could not save the video. Please try again.";}
  finally{saving=false;document.getElementById("sermon-save").disabled=false;}
});
document.getElementById("sermon-refresh").addEventListener("click",loadAdminVideos);
document.getElementById("sermon-cancel").addEventListener("click",clearForm);
async function updateAdmin() {
  setTimeout(async()=>{
    try {
      if(!(await isAdmin())){clearAdmin();return;}
      if(dashboard.hidden)return;
      await loadAdminVideos();
    } catch(error){clearAdmin();}
  },0);
}
supabase.auth.onAuthStateChange(updateAdmin);
new MutationObserver(()=>dashboard.hidden?clearAdmin():updateAdmin())
  .observe(dashboard,{attributes:true,attributeFilter:["hidden"]});
updateAdmin();
loadPublicVideos();
