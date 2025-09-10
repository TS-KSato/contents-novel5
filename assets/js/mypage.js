// mypage.js — ローカルストレージを使う最小デモ
const S = {get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)), del:(k)=>localStorage.removeItem(k)};

function seed(){
  if(S.get('gl_member')==null) S.set('gl_member', false);
  if(S.get('gl_points')==null) S.set('gl_points', 0);
  if(!S.get('gl_history')) S.set('gl_history', []);
  if(!S.get('gl_profile')) S.set('gl_profile', {month:"", day:"", gender:""});
}
function renderStatus(){
  const m = !!S.get('gl_member');
  document.getElementById('memberPill').textContent = m ? '🛡️ 会員' : '🔓 非会員';
  document.getElementById('points').textContent = S.get('gl_points',0);
  document.getElementById('linkUnsub').style.display = m ? '' : 'none';
}
function renderHistory(){
  const list = S.get('gl_history', []);
  const box = document.getElementById('history'); box.innerHTML='';
  document.getElementById('histEmpty').style.display = list.length? 'none':'block';
  list.slice().reverse().forEach((h)=>{
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `<span>${h.date}</span><span class="muted">${h.title||'総合占い'}</span>`;
    box.appendChild(el);
  });
}
function renderProfile(){
  const mSel = document.getElementById('month');
  const dSel = document.getElementById('day');
  mSel.innerHTML = '<option value="">--</option>' + Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
  dSel.innerHTML = '<option value="">--</option>' + Array.from({length:31},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
  const p = S.get('gl_profile',{month:"",day:"",gender:""});
  if(p.month) mSel.value = p.month;
  if(p.day) dSel.value = p.day;
  document.getElementById('gender').value = p.gender||'';
}
function wire(){
  document.getElementById('btnCharge').addEventListener('click',()=>{
    const v = parseInt(prompt('チャージするポイント（例：100）','100')||'0',10);
    if(v>0){ S.set('gl_points', S.get('gl_points',0)+v); renderStatus(); }
  });
  document.getElementById('btnToggle').addEventListener('click',()=>{
    const cur = !!S.get('gl_member'); S.set('gl_member', !cur); renderStatus();
  });
  document.getElementById('btnMock').addEventListener('click',()=>{
    const list = S.get('gl_history', []);
    const today = new Date().toISOString().slice(0,10);
    list.push({date:today, title:'総合占い'}); S.set('gl_history', list); renderHistory();
  });
  document.getElementById('btnClear').addEventListener('click',()=>{ if(confirm('履歴を削除しますか？')){ S.set('gl_history', []); renderHistory(); }});
  document.getElementById('btnSave').addEventListener('click',()=>{
    const month = document.getElementById('month').value;
    const day = document.getElementById('day').value;
    const gender = document.getElementById('gender').value;
    S.set('gl_profile',{month,day,gender});
    const msg = document.getElementById('saveMsg'); msg.textContent='保存しました'; setTimeout(()=>msg.textContent='',1500);
  });
}
function start(){ seed(); renderStatus(); renderHistory(); renderProfile(); wire(); }
document.addEventListener('DOMContentLoaded', start);
