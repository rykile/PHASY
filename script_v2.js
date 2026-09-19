const KEY="tropar_threads_v2";
const seed=[
 {id:crypto.randomUUID(),title:"TROPARへようこそ！",name:"運営",category:"雑談",body:"ここはTROPARのテストスレッドです。\nまずは気軽に話してみてください！",createdAt:Date.now()-3600000,likes:3},
 {id:crypto.randomUUID(),title:"みんなで作りたい機能を考えよう",name:"RYK!LE",category:"質問",body:"掲示板・SNS・ニュースを組み合わせるなら、どんな機能があると便利そう？",createdAt:Date.now()-1800000,likes:5}
];
let threads=JSON.parse(localStorage.getItem(KEY)||"null")||seed;
let selectedCat="",sortPopular=false;
const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(threads))}
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function timeAgo(t){const d=Date.now()-t,m=Math.floor(d/60000);if(m<1)return"たった今";if(m<60)return m+"分前";const h=Math.floor(m/60);if(h<24)return h+"時間前";return new Date(t).toLocaleDateString("ja-JP")}
function render(){
 const q=$("search").value.trim().toLowerCase();
 let list=threads.filter(t=>(!selectedCat||t.category===selectedCat)&&(!q||(t.title+t.body+t.name).toLowerCase().includes(q)));
 list.sort((a,b)=>sortPopular?b.likes-a.likes:b.createdAt-a.createdAt);
 $("count").textContent=list.length+"件";
 $("threads").innerHTML=list.length?list.map(t=>`<article class="thread">
 <div class="meta">${escapeHTML(t.category)} · ${escapeHTML(t.name)} · ${timeAgo(t.createdAt)}</div>
 <h3>${escapeHTML(t.title)}</h3><div class="body">${escapeHTML(t.body)}</div>
 <div><span class="tag">#${escapeHTML(t.category)}</span></div>
 <div class="actions"><button data-like="${t.id}">❤️ ${t.likes}</button><button data-delete="${t.id}">削除</button></div>
 </article>`).join(""):`<div class="empty">該当するスレッドがありません。<br>最初のスレッドを作ってみましょう。</div>`;
}
function openModal(){$("dialog").showModal();setTimeout(()=>$("title").focus(),0)}
function closeModal(){$("dialog").close();$("threadForm").reset()}
$("newBtn").onclick=openModal;$("newBtn2").onclick=openModal;$("cancel").onclick=closeModal;
$("search").addEventListener("input",render);
$("sortBtn").onclick=()=>{sortPopular=!sortPopular;$("sortBtn").textContent=sortPopular?"人気順 ↕":"新着順 ↕";render()};
document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{document.querySelectorAll(".cat").forEach(x=>x.classList.remove("active"));b.classList.add("active");selectedCat=b.dataset.cat;render()});
$("threadForm").addEventListener("submit",e=>{e.preventDefault();
 const title=$("title").value.trim(),name=$("name").value.trim(),category=$("category").value,body=$("body").value.trim();
 if(!title||!name||!category||!body)return;
 threads.unshift({id:crypto.randomUUID(),title,name,category,body,createdAt:Date.now(),likes:0});save();closeModal();render();
});
$("threads").addEventListener("click",e=>{
 const like=e.target.closest("[data-like]"),del=e.target.closest("[data-delete]");
 if(like){const t=threads.find(x=>x.id===like.dataset.like);if(t){t.likes++;save();render()}}
 if(del){const t=threads.find(x=>x.id===del.dataset.delete);if(t&&confirm("この投稿を削除しますか？")){threads=threads.filter(x=>x.id!==t.id);save();render()}}
});
render();