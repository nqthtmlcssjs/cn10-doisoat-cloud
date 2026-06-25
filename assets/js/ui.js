window.CN10 = window.CN10 || {};
(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const fmt = (n)=>Number(n||0).toLocaleString('vi-VN');
  const escapeHtml = (v)=>String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function msg(el, text, ok=true){ if(!el) return; el.textContent=text||''; el.className='message '+(ok?'ok':'err'); }
  function table(rows, cols, empty='Không có dữ liệu'){
    if(!rows || !rows.length) return `<p class="empty-note">${escapeHtml(empty)}</p>`;
    const head=cols.map(c=>`<th>${escapeHtml(c.label)}</th>`).join('');
    const body=rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):escapeHtml(r[c.key]??'')}</td>`).join('')}</tr>`).join('');
    return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }
  function showView(id){
    $$('.view').forEach(v=>v.classList.remove('active-view'));
    $('#'+id)?.classList.add('active-view');
    $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
    document.dispatchEvent(new CustomEvent('cn10:view',{detail:{id}}));
  }
  function updateSteps(step){
    for(let i=1;i<=6;i++){
      const el=$('#step'+i); if(!el) continue;
      el.classList.toggle('active', i===step); el.classList.toggle('done', i<step);
    }
  }
  function deltaClass(v){ const a=Math.abs(Number(v||0)); return a===0?'delta-ok':(a<10000?'delta-warn':'delta-danger'); }
  function fmtDelta(v){ const n=Number(v||0); return `<span class="${deltaClass(n)}">${n>0?'+':''}${fmt(n)}</span>`; }
  window.CN10.ui = {$,$$,fmt,escapeHtml,msg,table,showView,updateSteps,fmtDelta};
})();
