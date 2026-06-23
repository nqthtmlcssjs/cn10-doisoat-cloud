(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const fmt = (n)=>Number(n||0).toLocaleString('vi-VN');
  const supa = window.supabase.createClient(window.CN10_CONFIG.SUPABASE_URL, window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY);

  let lastResult=null, lastFileName='', currentTab='all', latestRuns=[];
  let currentUser=null, currentProfile=null, allDiem=[];

  const canAll = ()=> currentProfile && ['admin','ketoan'].includes(currentProfile.vai_tro);
  const isAdmin = ()=> currentProfile && currentProfile.vai_tro === 'admin';
  const currentDiemId = ()=> currentProfile?.diem_id || null;

  function msg(el, text, ok=true){ if(!el) return; el.textContent=text||''; el.className='message ' + (ok?'ok':'err'); }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function asInt(v){ const n=parseInt(v,10); return Number.isFinite(n) ? n : null; }
  function table(rows, cols, empty='Không có dữ liệu'){
    if(!rows || rows.length===0) return `<p class="empty-note">${empty}</p>`;
    const head = cols.map(c=>`<th>${escapeHtml(c.label)}</th>`).join('');
    const body = rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):escapeHtml(r[c.key]??'')}</td>`).join('')}</tr>`).join('');
    return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }
  function selectedDiem(selector){
    const el=$(selector); if(!el) return null;
    const v=el.value;
    if(!v || v==='all') return null;
    return asInt(v);
  }
  function scopeQuery(q, diemSelector=null){
    if(currentProfile?.vai_tro==='diem' && currentProfile.diem_id) return q.eq('diem_id', currentProfile.diem_id);
    if(canAll() && diemSelector){ const d=selectedDiem(diemSelector); if(d) return q.eq('diem_id', d); }
    return q;
  }
  function showView(id){
    $$('.view').forEach(v=>v.classList.remove('active-view'));
    $('#'+id)?.classList.add('active-view');
    $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
    if(id==='history') loadHistory();
    if(id==='journal') loadJournal();
    if(id==='admin') { loadDiem(); loadUsersApp(); }
    if(id==='dashboard') loadDashboard();
  }

  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $('#refreshBtn')?.addEventListener('click',()=>{loadDashboard(); if($('#history')?.classList.contains('active-view')) loadHistory();});
  $('#loginBtn')?.addEventListener('click', loginEmail);
  $('#logoutBtn')?.addEventListener('click', async()=>{ await supa.auth.signOut(); location.reload(); });

  async function loginEmail(){
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    if(!email || !password){ alert('Nhập email và mật khẩu'); return; }
    const {error} = await supa.auth.signInWithPassword({email, password});
    if(error){ alert(error.message); return; }
    await initAuth();
    await loadDashboard();
  }

  async function getProfileForEmail(email){
    const em = String(email || '').trim().toLowerCase();
    if(!em) return { profile:null, error:null };

    // Không dùng join tại bước đầu để tránh lỗi relationship/cache của Supabase.
    // Đọc quyền theo email không phân biệt hoa/thường.
    let {data, error} = await supa
      .from('users_app')
      .select('id,email,ho_ten,vai_tro,diem_id,active')
      .ilike('email', em)
      .limit(1);

    if(error) return { profile:null, error };
    let profile = Array.isArray(data) && data.length ? data[0] : null;

    // Fallback an toàn cho tài khoản admin ban đầu, tránh bị kẹt ở màn hình chưa phân quyền
    // khi bảng users_app bị RLS/schema cache trong giai đoạn cài đặt.
    if(!profile && em === 'admin@cn10.local'){
      profile = { email:em, ho_ten:'Quản trị CN10', vai_tro:'admin', diem_id:null, active:true, _fallback:true };
    }

    if(profile){
      profile.email = String(profile.email || em).trim().toLowerCase();
      profile.active = profile.active !== false;
      if(profile.diem_id){
        const d = await supa.from('diem').select('id,ten_diem,ma_diem').eq('id', profile.diem_id).maybeSingle();
        if(!d.error && d.data) profile.diem = d.data;
      }
    }
    return { profile, error:null };
  }

  async function initAuth(){
    const {data:{session}} = await supa.auth.getSession();
    currentUser=session?.user || null;
    if(currentUser){
      const email = String(currentUser.email || '').trim().toLowerCase();
      const {profile,error} = await getProfileForEmail(email);
      if(error){
        console.error('Lỗi đọc users_app:', error);
        currentProfile = {email, ho_ten:email, vai_tro:'guest', diem_id:null};
        $('#userBadge').textContent = `${email} · lỗi đọc quyền`;
      } else if(!profile || profile.active === false){
        currentProfile = {email, ho_ten:email, vai_tro:'guest', diem_id:null};
        $('#userBadge').textContent = `${email} · chưa phân quyền`;
      } else {
        currentProfile = profile;
        const suffix = currentProfile.diem?.ten_diem ? ` · ${currentProfile.diem.ten_diem}` : '';
        const fallback = currentProfile._fallback ? ' · fallback' : '';
        $('#userBadge').textContent = `${currentProfile.ho_ten || email} · ${currentProfile.vai_tro}${suffix}${fallback}`;
      }
      $('#loginBtn')?.classList.add('hidden'); $('#loginEmail')?.classList.add('hidden'); $('#loginPassword')?.classList.add('hidden'); $('#logoutBtn')?.classList.remove('hidden');
    } else {
      $('#userBadge').textContent='Chưa đăng nhập - chỉ xem thử';
      $('#loginBtn')?.classList.remove('hidden'); $('#loginEmail')?.classList.remove('hidden'); $('#loginPassword')?.classList.remove('hidden'); $('#logoutBtn')?.classList.add('hidden');
      currentProfile = null;
    }
    await loadDiemOptions();
    applyRoleUI();
  }

  function applyRoleUI(){
    $$('.admin-only').forEach(x=>x.style.display=isAdmin()?'block':'none');
    $$('.need-login').forEach(x=>x.disabled = !currentProfile || currentProfile.vai_tro==='guest');
    $$('.can-all-only').forEach(x=>x.style.display=canAll()?'':'none');
    $$('.point-label').forEach(x=>x.textContent = currentProfile?.diem?.ten_diem || (canAll()?'Toàn chi nhánh':'Chưa chọn điểm'));
    if(!canAll()){
      ['#runDiem','#journalDiem','#historyDiem','#lookupDiem'].forEach(sel=>{ const el=$(sel); if(el){ el.disabled=true; el.value=currentDiemId() || ''; }});
    }
  }

  async function loadDiemOptions(){
    const {data,error}=await supa.from('diem').select('*').eq('active', true).order('thu_tu');
    if(error){ console.error(error); return; }
    allDiem=data||[];
    const opts = `<option value="all">Toàn chi nhánh</option>` + allDiem.map(d=>`<option value="${d.id}">${escapeHtml(d.ten_diem)}</option>`).join('');
    const optsNoAll = `<option value="">Chọn điểm</option>` + allDiem.map(d=>`<option value="${d.id}">${escapeHtml(d.ten_diem)}</option>`).join('');
    ['#historyDiem','#lookupDiem'].forEach(sel=>{ const el=$(sel); if(el) el.innerHTML=opts; });
    ['#runDiem','#journalDiem','#userDiem'].forEach(sel=>{ const el=$(sel); if(el) el.innerHTML=optsNoAll; });
    if(currentProfile?.diem_id){ ['#historyDiem','#lookupDiem','#runDiem','#journalDiem'].forEach(sel=>{ const el=$(sel); if(el) el.value=currentProfile.diem_id; }); }
  }

  function updateKPI(s, runId='-'){
    $('#kpiTotal').textContent=fmt(s?.tong_ho_so||0); $('#kpiMatched').textContent=fmt(s?.so_khop||0); $('#kpiReview').textContent=fmt(s?.so_lech||0);
    $('#kpiThuPhi').textContent=fmt(s?.tong_thuphi||0); $('#kpiBidv').textContent=fmt(s?.tong_bidv||0); $('#kpiSinvoice').textContent=fmt(s?.tong_sinvoice||0); $('#kpiRunId').textContent=runId;
    const rate = s?.tong_ho_so ? ((Number(s.so_khop||0) / Number(s.tong_ho_so||1))*100).toFixed(2)+'%' : '0%';
    const el=$('#kpiRate'); if(el) el.textContent=rate;
  }
  async function checkConnection(){
    try{ const {error}=await supa.from('dot_doisoat').select('id').limit(1); if(error) throw error; $('#connectionStatus').textContent='Supabase OK'; }
    catch(e){ $('#connectionStatus').textContent='Lỗi Supabase'; console.error(e); }
  }
  async function loadDashboard(){
    let q=supa.from('dot_doisoat').select('*, diem(ten_diem)').order('id',{ascending:false}).limit(5);
    q=scopeQuery(q);
    const {data,error}=await q;
    if(error){ console.error(error); return; }
    latestRuns=data||[];
    if(latestRuns[0]) updateKPI(latestRuns[0], latestRuns[0].id); else updateKPI(null,'-');
    $('#latestRuns').innerHTML = renderRuns(latestRuns.slice(0,5));
  }
  function renderRuns(rows){
    return table(rows,[
      {key:'id',label:'ID'}, {key:'ngay_doisoat',label:'Ngày'}, {key:'diem',label:'Điểm',render:r=>escapeHtml(r.diem?.ten_diem||'CN10')}, {key:'file_name',label:'File'},
      {key:'tong_ho_so',label:'Hồ sơ',render:r=>fmt(r.tong_ho_so)}, {key:'so_khop',label:'Khớp',render:r=>fmt(r.so_khop)}, {key:'so_lech',label:'Lệch',render:r=>fmt(r.so_lech)},
      {key:'tong_thuphi',label:'Thu phí',render:r=>fmt(r.tong_thuphi)},
      {key:'act',label:'Thao tác',render:r=>`<div class="row-actions"><button class="mini-btn" onclick="CN10_APP.openRun(${r.id})">Chi tiết</button>${isAdmin()?`<button class="mini-btn danger-mini" onclick="CN10_APP.deleteRun(${r.id})">Xóa</button>`:''}</div>`}
    ]);
  }

  async function loadHistory(){
    let q=supa.from('dot_doisoat').select('*, diem(ten_diem)').order('id',{ascending:false}).limit(300);
    q=scopeQuery(q,'#historyDiem');
    const d1=$('#historyFrom')?.value, d2=$('#historyTo')?.value;
    if(d1) q=q.gte('ngay_doisoat', d1);
    if(d2) q=q.lte('ngay_doisoat', d2);
    const {data,error}=await q;
    if(error){ $('#historyTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#historyTable').innerHTML = renderRuns(data||[]);
  }
  $('#loadHistoryBtn')?.addEventListener('click', loadHistory);
  ['#historyDiem','#historyFrom','#historyTo'].forEach(sel=>$(sel)?.addEventListener('change', loadHistory));

  async function openRun(id){
    const [d,k,h,s,t] = await Promise.all([
      supa.from('dot_doisoat').select('*, diem(ten_diem)').eq('id',id).single(),
      supa.from('ketqua_doisoat').select('*').eq('dot_id',id).limit(50000),
      supa.from('hoa_don_chua_khop').select('*').eq('dot_id',id).limit(50000),
      supa.from('saoke_chua_nhan_dien').select('*').eq('dot_id',id).limit(50000),
      supa.from('thongke_sinvoice').select('*').eq('dot_id',id).limit(1000)
    ]);
    if(d.error){ alert(d.error.message); return; }
    if(currentProfile?.vai_tro==='diem' && d.data.diem_id !== currentProfile.diem_id){ alert('Bạn không có quyền xem lần chạy này'); return; }
    const run=d.data; updateKPI(run, run.id); showView('history');
    const matched=(k.data||[]).filter(x=>x.trang_thai==='Matched').length;
    $('#historyDetail').classList.remove('hidden');
    $('#historyDetail').innerHTML = `<div class="section-head"><div><h2>Chi tiết lần chạy #${id}</h2><p>${run.ngay_doisoat||''} · ${escapeHtml(run.diem?.ten_diem||'CN10')} · ${escapeHtml(run.file_name||'')}</p></div><button class="ghost-btn" onclick="CN10_APP.exportRun(${id})">⬇️ Xuất Excel</button></div>
      <div class="kpi-grid compact"><div class="kpi-card"><span>Hồ sơ</span><strong>${fmt(run.tong_ho_so)}</strong></div><div class="kpi-card ok"><span>Khớp</span><strong>${fmt(matched)}</strong></div><div class="kpi-card warn"><span>Lệch</span><strong>${fmt(run.so_lech)}</strong></div><div class="kpi-card"><span>Tỷ lệ</span><strong>${run.tong_ho_so?((matched/run.tong_ho_so)*100).toFixed(2)+'%':'0%'}</strong></div></div>
      <details open class="panel"><summary>Kết quả đối soát (${(k.data||[]).length})</summary>${renderResultTable(k.data||[])}</details>
      <details class="panel"><summary>Hóa đơn chưa khớp (${(h.data||[]).length})</summary>${renderHD(h.data||[])}</details>
      <details class="panel"><summary>Sao kê chưa nhận diện (${(s.data||[]).length})</summary>${renderSaoke(s.data||[])}</details>
      <details class="panel"><summary>Thống kê SInvoice</summary>${renderThongKe(t.data||[])}</details>`;
    window._currentRunData={run, ketqua:k.data||[], hd:h.data||[], saoke:s.data||[], thongke:t.data||[]};
  }
  async function deleteRun(id){
    if(!isAdmin()){ alert('Chỉ admin được xóa'); return; }
    if(!confirm(`Xóa toàn bộ lần đối soát #${id}?`)) return;
    const {error}=await supa.from('dot_doisoat').delete().eq('id',id);
    if(error) alert(error.message); else { alert('Đã xóa'); loadDashboard(); loadHistory(); $('#historyDetail').classList.add('hidden'); }
  }

  $('#workbookInput')?.addEventListener('change', e=>{ const f=e.target.files[0]; lastFileName=f?f.name:''; $('#fileName').textContent=lastFileName||'Chưa chọn file'; });
  if($('#runDate')) $('#runDate').valueAsDate = new Date();
  $('#runBtn')?.addEventListener('click', async()=>{
    const f=$('#workbookInput').files[0]; if(!f){ msg($('#runMessage'),'Chưa chọn file Excel',false); return; }
    try{
      msg($('#runMessage'),'Đang đọc file và chạy đối soát...');
      const buf=await f.arrayBuffer(); const wb=XLSX.read(buf,{type:'array',cellDates:true});
      lastResult = window.CN10_ENGINE.reconcileWorkbook(wb); lastFileName=f.name;
      updateKPI(lastResult.summary, '-'); renderCurrentTab(); $('#exportBtn').disabled=false; $('#saveBtn').disabled=false;
      msg($('#runMessage'),`Đã chạy xong: ${fmt(lastResult.summary.tong_ho_so)} hồ sơ, khớp ${fmt(lastResult.summary.so_khop)}, lệch ${fmt(lastResult.summary.so_lech)}.`);
      showView('reconcile');
    }catch(e){ console.error(e); msg($('#runMessage'),e.message,false); }
  });
  $('#saveBtn')?.addEventListener('click', saveSupabase);
  $('#exportBtn')?.addEventListener('click', ()=>exportData(lastResult));
  $$('.tab').forEach(b=>b.addEventListener('click',()=>{ $$('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); currentTab=b.dataset.tab; renderCurrentTab(); }));

  function renderCurrentTab(){
    if(!lastResult){ $('#resultTable').innerHTML='<p class="empty-note">Chưa có kết quả.</p>'; return; }
    if(currentTab==='matched') $('#resultTable').innerHTML=renderResultTable(lastResult.ketqua.filter(x=>x.trang_thai==='Matched'));
    else if(currentTab==='review') $('#resultTable').innerHTML=renderResultTable(lastResult.ketqua.filter(x=>x.trang_thai!=='Matched'));
    else if(currentTab==='sinvoiceMissing') $('#resultTable').innerHTML=renderHD(lastResult.hoaDonChuaKhop);
    else if(currentTab==='saokeMissing') $('#resultTable').innerHTML=renderSaoke(lastResult.saokeChuaNhanDien);
    else if(currentTab==='monthly') $('#resultTable').innerHTML=renderThongKe(lastResult.thongke);
    else $('#resultTable').innerHTML=renderResultTable(lastResult.ketqua);
  }
  function renderResultTable(rows){
    return table(rows,[{key:'don_vi',label:'Đơn vị'}, {key:'ma_hoso_goc',label:'Mã hồ sơ'}, {key:'ngay_thu',label:'Ngày'}, {key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)}, {key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)}, {key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)}, {key:'trang_thai',label:'Trạng thái',render:r=>`<span class="${r.trang_thai==='Matched'?'status-ok':'status-review'}">${escapeHtml(r.trang_thai)}</span>`}, {key:'tham_chieu_bidv',label:'Tham chiếu'}, {key:'so_hoa_don',label:'Số HĐ'}]);
  }
  function renderHD(rows){ return table(rows,[{key:'ngay_hoa_don',label:'Ngày'}, {key:'so_hoa_don',label:'Số hóa đơn'}, {key:'tong_tien',label:'Tổng tiền',render:r=>fmt(r.tong_tien)}, {key:'aq',label:'AQ'}, {key:'bp',label:'BP'}, {key:'bu',label:'BU'}, {key:'ly_do',label:'Lý do'}]); }
  function renderSaoke(rows){ return table(rows,[{key:'ngay_giao_dich',label:'Ngày'}, {key:'tham_chieu',label:'Tham chiếu'}, {key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)}, {key:'dien_giai',label:'Diễn giải'}, {key:'ly_do',label:'Lý do'}]); }
  function renderThongKe(rows){ return table(rows,[{key:'thang',label:'Tháng'}, {key:'tong_hd',label:'Tổng HĐ',render:r=>fmt(r.tong_hd||r.tong_hoa_don)}, {key:'tong_tien',label:'Tổng tiền',render:r=>fmt(r.tong_tien)}, {key:'da_khop',label:'Đã khớp',render:r=>fmt(r.da_khop)}, {key:'tien_da_khop',label:'Tiền đã khớp',render:r=>fmt(r.tien_da_khop)}, {key:'chua_khop',label:'Chưa khớp',render:r=>fmt(r.chua_khop)}, {key:'tien_chua_khop',label:'Tiền chưa khớp',render:r=>fmt(r.tien_chua_khop)}]); }

  async function saveSupabase(){
    if(!currentProfile || currentProfile.vai_tro==='guest'){ msg($('#runMessage'),'Bạn cần đăng nhập bằng tài khoản đã phân quyền trước khi lưu Supabase',false); return; }
    if(!lastResult){ msg($('#runMessage'),'Chưa có kết quả để lưu',false); return; }
    const diemId = canAll() ? selectedDiem('#runDiem') : currentDiemId();
    if(!diemId){ msg($('#runMessage'),'Chọn điểm cần lưu dữ liệu đối soát',false); return; }
    try{
      msg($('#runMessage'),'Đang lưu Supabase...');
      const runDate=$('#runDate').value || new Date().toISOString().slice(0,10);
      const ghiChu=$('#runNote')?.value?.trim() || '';
      const payload={ngay_doisoat:runDate, diem_id:diemId, nguoi_thuc_hien:currentProfile?.ho_ten||currentUser?.email||'CN10', ghi_chu:ghiChu, file_name:lastFileName, source_mode:'workbook', created_by:currentProfile?.email||currentUser?.email||'web', ...lastResult.summary};
      const {data:dot,error}=await supa.from('dot_doisoat').insert(payload).select('id').single(); if(error) throw error;
      const dotId=dot.id; const addDot=(x)=>({...x,dot_id:dotId,diem_id:diemId});
      await insertChunks('ketqua_doisoat', lastResult.ketqua.map(addDot));
      await insertChunks('hoa_don_chua_khop', lastResult.hoaDonChuaKhop.map(addDot));
      await insertChunks('saoke_chua_nhan_dien', lastResult.saokeChuaNhanDien.map(addDot));
      await insertChunks('thongke_sinvoice', lastResult.thongke.map(x=>({...x,dot_id:dotId})));
      msg($('#runMessage'),`Đã lưu Supabase. Mã lần chạy: ${dotId}`); $('#saveBtn').disabled=true; await loadDashboard();
    }catch(e){ console.error(e); msg($('#runMessage'),e.message,false); }
  }
  async function insertChunks(tableName, rows){ if(!rows || rows.length===0) return; for(let i=0;i<rows.length;i+=500){ const {error}=await supa.from(tableName).insert(rows.slice(i,i+500)); if(error) throw error; } }

  $('#lookupBtn')?.addEventListener('click', lookup); $('#lookupInput')?.addEventListener('keydown',e=>{if(e.key==='Enter') lookup();});
  $('#lookupDiem')?.addEventListener('change', lookup);
  async function lookup(){
    const raw=$('#lookupInput').value.trim(); if(!raw){ $('#lookupResult').innerHTML='<p class="empty-note">Nhập mã hồ sơ, số hóa đơn hoặc tham chiếu BIDV cần tìm.</p>'; return; }
    const ma=window.CN10_ENGINE.cleanCode(raw);
    let q=supa.from('ketqua_doisoat').select('*, dot_doisoat(ngay_doisoat,file_name)').or(`ma_hoso_sach.eq.${ma},so_hoa_don.ilike.%${raw}%,tham_chieu_bidv.ilike.%${raw}%`).order('id',{ascending:false}).limit(500);
    q=scopeQuery(q,'#lookupDiem');
    const {data,error}=await q;
    if(error){ $('#lookupResult').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#lookupResult').innerHTML=table(data||[],[{key:'ma_hoso_goc',label:'Mã hồ sơ'}, {key:'ngay_thu',label:'Ngày thu'}, {key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)}, {key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)}, {key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)}, {key:'trang_thai',label:'Trạng thái'}, {key:'tham_chieu_bidv',label:'Tham chiếu'}, {key:'so_hoa_don',label:'Số HĐ'}, {key:'dot_id',label:'Lần chạy'}]);
  }

  $('#journalSaveBtn')?.addEventListener('click', async()=>{
    if(!currentProfile || currentProfile.vai_tro==='guest'){ msg($('#journalMessage'),'Bạn cần đăng nhập để lưu nhật ký',false); return; }
    const diemId = canAll() ? selectedDiem('#journalDiem') : currentDiemId();
    if(!diemId){ msg($('#journalMessage'),'Chọn điểm cho nhật ký xử lý',false); return; }
    const row={diem_id:diemId, loai:$('#journalType').value, tham_chieu:$('#journalRef').value.trim(), ma_hoso:$('#journalMa').value.trim(), ghi_chu:$('#journalNote').value.trim(), created_by:currentProfile?.email||currentUser?.email||'web'};
    if(!row.tham_chieu || !row.ma_hoso){ msg($('#journalMessage'),'Cần nhập tham chiếu và mã hồ sơ',false); return; }
    const {error}=await supa.from('nhatky_xuly').insert(row); if(error){ msg($('#journalMessage'),error.message,false); return; }
    msg($('#journalMessage'),'Đã lưu nhật ký xử lý'); $('#journalRef').value=''; $('#journalMa').value=''; $('#journalNote').value=''; loadJournal();
  });
  async function loadJournal(){
    let q=supa.from('nhatky_xuly').select('*, diem(ten_diem)').order('id',{ascending:false}).limit(500);
    q=scopeQuery(q,'#journalDiem');
    const {data,error}=await q;
    if(error){ $('#journalTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#journalTable').innerHTML=table(data||[],[{key:'loai',label:'Loại'}, {key:'tham_chieu',label:'Tham chiếu'}, {key:'ma_hoso',label:'Mã hồ sơ'}, {key:'ghi_chu',label:'Ghi chú'}, {key:'diem',label:'Điểm',render:r=>escapeHtml(r.diem?.ten_diem||'')}, {key:'created_by',label:'Người tạo'}, {key:'created_at',label:'Ngày tạo'}, {key:'act',label:'Sửa/Xóa',render:r=>`<div class="row-actions"><button class="mini-btn" onclick="CN10_APP.editJournal(${r.id}, '${escapeHtml(r.ma_hoso)}')">Sửa</button><button class="mini-btn danger-mini" onclick="CN10_APP.deleteJournal(${r.id})">Xóa</button></div>`}]);
  }
  $('#journalDiem')?.addEventListener('change', loadJournal);
  async function editJournal(id, oldMa){
    const ma=prompt('Nhập mã hồ sơ mới:', oldMa); if(!ma) return;
    const {error}=await supa.from('nhatky_xuly').update({ma_hoso:ma, created_by:currentProfile?.email||currentUser?.email||'web'}).eq('id',id); if(error) alert(error.message); else loadJournal();
  }
  async function deleteJournal(id){ if(!confirm('Xóa dòng nhật ký này?')) return; const {error}=await supa.from('nhatky_xuly').delete().eq('id',id); if(error) alert(error.message); else loadJournal(); }

  async function loadDiem(){
    const {data,error}=await supa.from('diem').select('*').order('thu_tu'); if(error){ $('#diemTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#diemTable').innerHTML=table(data||[],[{key:'id',label:'ID'}, {key:'ma_diem',label:'Mã điểm'}, {key:'ten_diem',label:'Tên điểm'}, {key:'thu_tu',label:'Thứ tự'}, {key:'active',label:'Hoạt động'}]);
  }

  async function loadUsersApp(){
    if(!isAdmin()) return;
    const {data,error}=await supa.from('users_app').select('*, diem(ten_diem)').order('id');
    if(error){ $('#usersTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#usersTable').innerHTML=table(data||[],[{key:'email',label:'Email'}, {key:'ho_ten',label:'Họ tên'}, {key:'vai_tro',label:'Vai trò'}, {key:'diem',label:'Điểm',render:r=>escapeHtml(r.diem?.ten_diem||'')}, {key:'active',label:'Hoạt động'}]);
  }
  $('#userSaveBtn')?.addEventListener('click', async()=>{
    if(!isAdmin()){ alert('Chỉ admin'); return; }
    const row={email:$('#userEmail').value.trim(), ho_ten:$('#userName').value.trim(), vai_tro:$('#userRole').value, diem_id:selectedDiem('#userDiem'), active:true};
    if(!row.email){ msg($('#userMessage'),'Nhập email người dùng',false); return; }
    if(row.vai_tro==='diem' && !row.diem_id){ msg($('#userMessage'),'Tài khoản điểm phải chọn điểm',false); return; }
    if(row.vai_tro!=='diem') row.diem_id=null;
    const {error}=await supa.from('users_app').upsert(row,{onConflict:'email'});
    if(error){ msg($('#userMessage'),error.message,false); return; }
    msg($('#userMessage'),'Đã lưu quyền người dùng. Nhớ tạo user trong Authentication nếu chưa có.');
    $('#userEmail').value=''; $('#userName').value=''; loadUsersApp();
  });

  $('#backupBtn')?.addEventListener('click', backupAll);
  async function backupAll(){
    try{
      if(!currentProfile || !canAll()){ msg($('#backupMessage'),'Chỉ admin/kế toán được backup',false); return; }
      msg($('#backupMessage'),'Đang lấy dữ liệu backup...');
      const [d,k,h,s,n,t,u,diem]=await Promise.all([
        supa.from('dot_doisoat').select('*').limit(50000), supa.from('ketqua_doisoat').select('*').limit(50000), supa.from('hoa_don_chua_khop').select('*').limit(50000), supa.from('saoke_chua_nhan_dien').select('*').limit(50000), supa.from('nhatky_xuly').select('*').limit(50000), supa.from('thongke_sinvoice').select('*').limit(50000), supa.from('users_app').select('*').limit(50000), supa.from('diem').select('*').limit(50000)
      ]);
      for(const x of [d,k,h,s,n,t,u,diem]) if(x.error) throw x.error;
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.data||[]), 'dot_doisoat');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(k.data||[]), 'ketqua_doisoat');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h.data||[]), 'hoa_don_chua_khop');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.data||[]), 'saoke_chua_nhan_dien');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(n.data||[]), 'nhatky_xuly');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t.data||[]), 'thongke_sinvoice');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(u.data||[]), 'users_app');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diem.data||[]), 'diem');
      XLSX.writeFile(wb, `backup_doisoat_cn10_${new Date().toISOString().slice(0,10)}.xlsx`);
      msg($('#backupMessage'),'Đã xuất file backup.');
    }catch(e){ console.error(e); msg($('#backupMessage'), e.message, false); }
  }

  async function exportRun(id){
    if(!window._currentRunData || window._currentRunData.run?.id !== id){ await openRun(id); }
    if(window._currentRunData) exportData({ketqua:window._currentRunData.ketqua, hoaDonChuaKhop:window._currentRunData.hd, saokeChuaNhanDien:window._currentRunData.saoke, thongke:window._currentRunData.thongke}, `doi_soat_lan_${id}.xlsx`);
  }
  function exportData(data, name='ket_qua_doi_soat_cn10.xlsx'){
    if(!data) return; const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.ketqua||[]), 'KetQua');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.hoaDonChuaKhop||[]), 'HoaDon_ChuaKhop');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.saokeChuaNhanDien||[]), 'Saoke_ChuaNhanDien');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.thongke||[]), 'ThongKe_SInvoice');
    XLSX.writeFile(wb, name);
  }
  window.CN10_APP={openRun, exportRun, deleteRun, editJournal, deleteJournal, initAuth, getProfileForEmail};
  initAuth().then(()=>{checkConnection(); loadDashboard();});
})();
