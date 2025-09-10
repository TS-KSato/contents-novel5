const JSON_PATH="./recipe.json";
function esc(s){return String(s||"").replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
function q(name){return new URL(location.href).searchParams.get(name)}

(async function(){
  const id = q("id");
  const content = document.getElementById("content");
  if(!id){ content.innerHTML = `<div class="meta">レシピIDが指定されていません。</div>`; return; }

  try{
    const res=await fetch(JSON_PATH,{cache:"no-cache"});
    const data=await res.json();
    const recipes=Array.isArray(data)?data:(data.items||[]);
    const r = recipes.find(x=>String(x.id)===String(id));
    if(!r){ content.innerHTML = `<div class="meta">レシピが見つかりませんでした。</div>`; return; }

    document.getElementById("title").textContent = r.title || "レシピ";
    document.getElementById("subtitle").textContent = r.real_name ? `現実参考：${r.real_name}` : "エテルナリアの一皿";
    const initials = (r.character||"").slice(0,2) || "食";
    const av = document.getElementById("avatar");
    if(r.avatar){ av.style.backgroundImage = `url('${esc(r.avatar)}')`; } else { av.textContent = initials; }

    const linkMap = {"アラン":"./dragon-table-alan.html","ドレイク":"./dragon-table-drake.html","ライラ":"./dragon-table-laila.html","ネスター":"./dragon-table-nester.html"};
    const charLink = document.getElementById("charLink");
    charLink.textContent = r.character ? `${r.character}の食卓へ` : "キャラ別トップへ";
    charLink.href = linkMap[r.character] || "./dragon-table.html";

    content.innerHTML = `
      ${ r.intro? `<p class="lead">${esc(r.intro)}</p>`:"" }
      <div class="sep"></div>
      <div class="body">
        <h3 style="margin:.25rem 0;font-size:1rem;">材料</h3>
        <ul style="margin:.25rem 0 .5rem; padding-left:1.25rem;">
          ${(r.ingredients||[]).map(i=>`<li>${esc(i)}</li>`).join("")}
        </ul>
        <h3 style="margin:.25rem 0;font-size:1rem;">作り方</h3>
        <ol style="margin:.25rem 0 .5rem; padding-left:1.25rem;">
          ${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}
        </ol>
      </div>
      ${ r.comment? `<div class="sep"></div><p class="meta">${esc(r.comment)}</p>`:"" }
    `;
  }catch(e){
    content.innerHTML = `<div class="meta">読み込みに失敗しました。recipe.jsonをご確認ください。</div>`;
  }
})();
