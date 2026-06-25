window.CN10 = window.CN10 || {};
(function(){
  const ui=window.CN10.ui, api=window.CN10.api, wf=window.CN10.workflow;
  const {$,$$,fmt,escapeHtml,msg,table,showView,updateSteps}=ui;
  const state={currentSession:null}; window.CN10.appState=state;

  function fillDiemSelects(){
    const opts='<option value="">Chọn điểm</option>'+api.diem.map(d=>`<option value="${d.id}">${escapeHtml(d.ten_diem)}</option>`).join('');
    $('#sessionDiem').innerHTML=opts;
    $('#pointMap').innerHTML=api.diem.map(d=>`<div class="point-pill"><b>${escapeHtml(d.ten_diem)}</b><small>${escapeHtml(d.ma_diem||'ID '+d.id)}</small></div>`).join('');
    $('#diemTable').innerHTML=table(api.diem,[{key:'id',label:'ID'},{key:'ten_diem',label:'Tên điểm'},{key:'ma_diem',label:'Mã điểm'},{key:'thu_tu',label:'Thứ tự'},{key:'active',label:'Hoạt động'}]);
  }
  function renderUser(){
    if(api.profile){
      $('#userBadge').textContent=`${api.profile.ho_ten||api.profile.email} · ${api.profile.vai_tro}${api.profile.diem?.ten_diem?' · '+api.profile.diem.ten_diem:''}`;
      $('#loginEmail').classList.add('hidden'); $('#loginPassword').classList.add('hidden'); $('#loginBtn').classList.add('hidden'); $('#logoutBtn').classList.remove('hidden');
    } else {
      $('#userBadge').textContent='Chưa đăng nhập';
      $('#loginEmail').classList.remove('hidden'); $('#loginPassword').classList.remove('hidden'); $('#loginBtn').classList.remove('hidden'); $('#logoutBtn').classList.add('hidden');
    }
  }
  async function init(){
    try{
      $('#frontVersion').textContent=window.CN10_VERSION;
      await api.initAuth(); renderUser();
      await api.loadDiem(); fillDiemSelects();
      const v=await api.getDbVersion(); $('#dbVersion').textContent=v?.version_code || 'Chưa có system_version';
      $('#connectionStatus').textContent='Supabase OK';
      if(!$('#sessionMonth').value) $('#sessionMonth').value=new Date().toISOString().slice(0,7);
      await loadDashboard(); await loadSessions();
    }catch(e){ console.error(e); $('#connectionStatus').textContent='Lỗi: '+e.message; }
  }
  async function loadDashboard(){
    const supa=window.CN10.supa;
    const [sessions,tasks,bank,acc]=await Promise.all([
      supa.from('doisoat_session').select('id').neq('trang_thai','closed'),
      supa.from('tasks').select('id').neq('trang_thai','done'),
      supa.from('bank_unidentified').select('so_tien').eq('trang_thai','pending'),
      supa.from('accounting_status').select('id,accounting_status').eq('accounting_status','DU_DIEU_KIEN_HACH_TOAN')
    ]);
    $('#kpiOpenSessions').textContent=fmt(sessions.data?.length||0);
    $('#kpiIssues').textContent=fmt(tasks.data?.length||0);
    $('#kpiBankUnidentified').textContent=fmt((bank.data||[]).reduce((s,x)=>s+Number(x.so_tien||0),0));
    $('#kpiReadyAccounting').textContent=fmt(acc.data?.length||0);
    const recent=await api.loadSessions();
    $('#recentSessions').innerHTML=renderSessions(recent.data||[]);
  }
  function renderSessions(rows){
    return table(rows,[{key:'ma_phien',label:'Mã phiên'},{key:'diem',label:'Điểm',render:r=>escapeHtml(r.diem?.ten_diem||'')},{key:'ky_doisoat',label:'Kỳ'},{key:'trang_thai',label:'Trạng thái'},{key:'created_at',label:'Tạo lúc'},{key:'act',label:'Chọn',render:r=>`<button class="mini-btn" onclick="CN10_APP.selectSession(${r.id})">Chọn</button>`}], 'Chưa có phiên');
  }
  async function loadSessions(){
    const {data,error}=await api.loadSessions();
    if(error){ $('#sessionTable').innerHTML='<p class="empty-note">'+escapeHtml(error.message)+'</p>'; return; }
    $('#sessionTable').innerHTML=renderSessions(data||[]);
  }
  async function selectSession(id){
    const {data,error}=await window.CN10.supa.from('doisoat_session').select('*,diem(ten_diem)').eq('id',id).single();
    if(error){ alert(error.message); return; }
    state.currentSession=data;
    $('#sessionInfo').innerHTML=`<b>${escapeHtml(data.ma_phien)}</b> · ${escapeHtml(data.diem?.ten_diem||'')} · ${escapeHtml(data.ky_doisoat||'')} · <b>${escapeHtml(data.trang_thai)}</b>`;
    updateSteps(data.trang_thai==='closed'?6:2);
    $('#closeSessionBtn').disabled=data.trang_thai==='closed';
    $('#runReconcileBtn').disabled=!wf.valid;
  }
  async function createSession(){
    const diem_id=$('#sessionDiem').value, ky_doisoat=$('#sessionMonth').value, ghi_chu=$('#sessionNote').value;
    if(!diem_id){ alert('Chọn điểm trước khi tạo phiên'); return; }
    if(!ky_doisoat){ alert('Chọn kỳ đối soát'); return; }
    const {data,error}=await api.createSession({diem_id,ky_doisoat,ghi_chu});
    if(error){ alert(error.message); return; }
    state.currentSession=data; await api.log('CREATE_SESSION',{session_id:data.id,diem_id:data.diem_id});
    await selectSession(data.id); await loadSessions(); await loadDashboard();
  }
  async function saveResult(){
    if(!state.currentSession){ alert('Chưa chọn phiên'); return; }
    if(!wf.result){ alert('Chưa chạy đối soát'); return; }
    try{
      msg($('#runMessage'),'Đang lưu kết quả Supabase...');
      const dotId=await api.saveResult({session:state.currentSession,result:wf.result,file_name:wf.fileName});
      msg($('#runMessage'),`Đã lưu kết quả. Mã lần chạy: ${dotId}`,true);
      $('#saveResultBtn').disabled=true; $('#closeSessionBtn').disabled=false; updateSteps(5);
      await selectSession(state.currentSession.id); await loadSessions(); await loadDashboard();
    }catch(e){ console.error(e); msg($('#runMessage'),e.message,false); }
  }
  async function closeSession(){
    if(!state.currentSession){ alert('Chưa chọn phiên'); return; }
    if(!confirm('Chốt phiên này? Sau khi chốt không nên sửa dữ liệu phiên.')) return;
    const {error}=await api.closeSession(state.currentSession);
    if(error){ alert(error.message); return; }
    await api.log('CLOSE_SESSION',{session_id:state.currentSession.id,diem_id:state.currentSession.diem_id});
    await selectSession(state.currentSession.id); await loadSessions(); await loadDashboard(); updateSteps(6);
  }
  async function loadHistory(){
    const {data,error}=await window.CN10.supa.from('dot_doisoat').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(200);
    if(error){ $('#historyTable').innerHTML='<p class="empty-note">'+escapeHtml(error.message)+'</p>'; return; }
    $('#historyTable').innerHTML=table(data||[],[{key:'id',label:'ID'},{key:'ngay_doisoat',label:'Ngày'},{key:'diem',label:'Điểm',render:r=>escapeHtml(r.diem?.ten_diem||'')},{key:'file_name',label:'File'},{key:'tong_ho_so',label:'Hồ sơ',render:r=>fmt(r.tong_ho_so)},{key:'so_khop',label:'Khớp',render:r=>fmt(r.so_khop)},{key:'so_lech',label:'Lệch',render:r=>fmt(r.so_lech)}]);
  }
  async function lookup(){
    const raw=$('#lookupInput').value.trim(); if(!raw) return;
    const ma=window.CN10_ENGINE.cleanCode(raw);
    const {data,error}=await window.CN10.supa.from('ketqua_doisoat').select('*').or(`ma_hoso_sach.eq.${ma},ma_hoso_goc.ilike.%${raw}%,so_hoa_don.ilike.%${raw}%,tham_chieu_bidv.ilike.%${raw}%`).order('id',{ascending:false}).limit(300);
    if(error){ $('#lookupResult').innerHTML='<p class="empty-note">'+escapeHtml(error.message)+'</p>'; return; }
    $('#lookupResult').innerHTML=table(data||[],[{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'ngay_thu',label:'Ngày'},{key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)},{key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)},{key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)},{key:'trang_thai',label:'Trạng thái'},{key:'so_hoa_don',label:'HĐ'},{key:'dot_id',label:'Lần chạy'}]);
  }
  function setupEvents(){
    $$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
    $$('[data-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.jump)));
    $('#loginBtn').addEventListener('click',async()=>{ const {error}=await api.login($('#loginEmail').value.trim(),$('#loginPassword').value); if(error) alert(error.message); else location.reload(); });
    $('#logoutBtn').addEventListener('click',async()=>{ await api.logout(); location.reload(); });
    $('#refreshBtn').addEventListener('click',()=>location.reload());
    $('#createSessionBtn').addEventListener('click',createSession);
    $('#loadSessionsBtn').addEventListener('click',loadSessions);
    $$('input[name="uploadMode"]').forEach(r=>r.addEventListener('change',()=>{ const mode=document.querySelector('input[name="uploadMode"]:checked').value; $('#uploadOne').classList.toggle('hidden',mode!=='one'); $('#uploadThree').classList.toggle('hidden',mode!=='three'); }));
    [['#fileWorkbook','#fileWorkbookName'],['#fileThuPhi','#fileThuPhiName'],['#fileBIDV','#fileBIDVName'],['#fileSInvoice','#fileSInvoiceName']].forEach(([input,label])=>$(input).addEventListener('change',e=>$(label).textContent=e.target.files[0]?.name||'Chưa chọn file'));
    $('#validateFilesBtn').addEventListener('click',async()=>{ try{ await wf.validate(); }catch(e){ msg($('#runMessage'),e.message,false); } });
    $('#runReconcileBtn').addEventListener('click',()=>{ try{ wf.run(); }catch(e){ msg($('#runMessage'),e.message,false); } });
    $('#saveResultBtn').addEventListener('click',saveResult);
    $('#closeSessionBtn').addEventListener('click',closeSession);
    $('#exportResultBtn').addEventListener('click',wf.export);
    $$('.tab').forEach(b=>b.addEventListener('click',()=>{ $$('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); wf.renderResult(b.dataset.tab); }));
    $('#loadHistoryBtn').addEventListener('click',loadHistory);
    $('#lookupBtn').addEventListener('click',lookup); $('#lookupInput').addEventListener('keydown',e=>{if(e.key==='Enter') lookup();});
    document.addEventListener('cn10:view',e=>{ if(e.detail.id==='accounting') window.CN10.accounting.loadAccounting(); if(e.detail.id==='unidentified') window.CN10.accounting.loadBank(); if(e.detail.id==='history') loadHistory(); if(e.detail.id==='dashboard') loadDashboard(); });
  }
  window.CN10_APP={selectSession,showView};
  setupEvents(); init();
})();
