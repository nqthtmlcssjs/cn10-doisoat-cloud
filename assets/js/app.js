(function(){
  const cfg=window.CN10_CONFIG;
  const supa=window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  let currentUser=null,currentProfile=null,diemList=[],currentWorkbook=null,currentData=null,currentFile=null;
  const fmt=n=>Number(n||0).toLocaleString('vi-VN');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  const msg=(el,text,type='')=>{el.classList.remove('hidden','err','ok'); if(type) el.classList.add(type); el.textContent=text;};
  function table(rows, cols){
    if(!rows?.length) return '<p class="muted" style="padding:16px">Chưa có dữ liệu</p>';
    return `<table class="table"><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  async function sha256(file){
    const buf=await file.arrayBuffer();
    const hash=await crypto.subtle.digest('SHA-256',buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function readWorkbook(file){
    const buf=await file.arrayBuffer();
    return XLSX.read(buf,{type:'array',cellDates:true});
  }
  async function chunkInsert(tableName, rows, size=800){
    for(let i=0;i<rows.length;i+=size){
      const part=rows.slice(i,i+size);
      if(!part.length) continue;
      const {error}=await supa.from(tableName).insert(part);
      if(error) throw new Error(`${tableName}: ${error.message}`);
    }
  }
  function showApp(){ $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); }
  function showLogin(){ $('#loginView').classList.remove('hidden'); $('#appView').classList.add('hidden'); }
  function canAll(){ return ['admin','ketoan','lanhdao'].includes(currentProfile?.vai_tro); }
  async function getProfile(email){
    const {data}=await supa.from('users_app').select('*,diem(ten_diem)').eq('email',String(email).toLowerCase()).maybeSingle();
    return data || {email,ho_ten:email,vai_tro:'guest',active:false};
  }
  async function initAuth(){
    $('#frontVer').textContent=cfg.VERSION;
    $('#sessionDate').value=today();
    const {data:{session}}=await supa.auth.getSession();
    if(!session){ showLogin(); return; }
    currentUser=session.user; currentProfile=await getProfile(currentUser.email);
    showApp(); await bootstrap();
  }
  async function bootstrap(){
    $('#userPill').textContent=`${currentProfile.ho_ten||currentUser.email} · ${currentProfile.vai_tro}`;
    await loadVersion(); await loadDiem(); await loadSessions(); await loadDashboard(); await loadTables();
  }
  async function loadVersion(){
    const {data,error}=await supa.from('system_version').select('*').eq('id',1).maybeSingle();
    $('#sideStatus').textContent=error?'Supabase lỗi':'Supabase OK';
    $('#dbVer').textContent=data?.database_version||'Chưa có';
  }
  async function loadDiem(){
    const {data,error}=await supa.from('diem').select('*').eq('active',true).order('thu_tu');
    if(error) throw new Error(error.message);
    diemList=data||[];
    const opt=diemList.map(x=>`<option value="${x.id}">${esc(x.ten_diem)}</option>`).join('');
    $('#sessionDiem').innerHTML=opt;
    $('#diemTable').innerHTML=table(diemList,[{key:'id',label:'ID'},{key:'ten_diem',label:'Điểm'},{key:'ma_diem',label:'Mã'},{key:'active',label:'Hoạt động'}]);
  }
  async function loadSessions(){
    let q=supa.from('doisoat_session').select('*,diem(ten_diem,ma_diem)').order('id',{ascending:false}).limit(100);
    if(currentProfile?.vai_tro==='diem') q=q.eq('diem_id',currentProfile.diem_id);
    const {data,error}=await q; if(error) throw new Error(error.message);
    const rows=data||[];
    $('#sessionsTable').innerHTML=table(rows,[{key:'id',label:'ID'},{key:'ma_phien',label:'Mã phiên'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'ngay_doi_soat',label:'Ngày'},{key:'trang_thai',label:'Trạng thái',render:r=>`<span class="badge ${r.trang_thai==='closed'?'good':'warn'}">${esc(r.trang_thai)}</span>`},{key:'created_by',label:'Người tạo'}]);
    $('#recentSessions').innerHTML=$('#sessionsTable').innerHTML;
    $('#uploadSession').innerHTML=rows.map(r=>`<option value="${r.id}" data-diem="${r.diem_id}">${esc(r.ma_phien)} · ${esc(r.diem?.ten_diem||'')} · ${r.ngay_doi_soat}</option>`).join('');
  }
  async function loadDashboard(){
    const d=today();
    const [s,k,t,b]=await Promise.all([
      supa.from('doisoat_session').select('id', {count:'exact', head:true}).eq('ngay_doi_soat',d),
      supa.from('doisoat_result').select('id', {count:'exact', head:true}).eq('trang_thai','matched'),
      supa.from('task_xuly').select('id', {count:'exact', head:true}).neq('trang_thai','done'),
      supa.from('bank_unidentified').select('id', {count:'exact', head:true}).eq('trang_thai','pending')
    ]);
    $('#kpiSessions').textContent=s.count||0; $('#kpiMatched').textContent=k.count||0; $('#kpiReview').textContent=t.count||0; $('#kpiBankUnknown').textContent=b.count||0;
  }
  async function loadTables(){
    const [tasks,bank,inv,cases,users]=await Promise.all([
      supa.from('task_xuly').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(300),
      supa.from('bank_unidentified').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(300),
      supa.from('invoice_unidentified').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(300),
      supa.from('case_master').select('*,diem(ten_diem)').order('updated_at',{ascending:false}).limit(300),
      supa.from('users_app').select('*,diem(ten_diem)').order('id').limit(100)
    ]);
    $('#tasksTable').innerHTML=table(tasks.data||[],[{key:'loai_loi',label:'Loại lỗi'},{key:'ma_hoso',label:'Mã HS'},{key:'noi_dung',label:'Nội dung'},{key:'huong_xu_ly',label:'Hướng xử lý'},{key:'trang_thai',label:'Trạng thái'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')}]);
    $('#bankTable').innerHTML=table(bank.data||[],[{key:'ngay_giao_dich',label:'Ngày'},{key:'tham_chieu',label:'Tham chiếu'},{key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)},{key:'dien_giai',label:'Diễn giải'},{key:'trang_thai',label:'Trạng thái'}]);
    $('#invoiceTable').innerHTML=table(inv.data||[],[{key:'ngay_hoa_don',label:'Ngày HĐ'},{key:'so_hoa_don',label:'Số HĐ'},{key:'tong_tien',label:'Tổng tiền',render:r=>fmt(r.tong_tien)},{key:'aq',label:'AQ'},{key:'bp',label:'BP'},{key:'bu',label:'BU'}]);
    $('#casesTable').innerHTML=table(cases.data||[],[{key:'ma_hoso_goc',label:'Mã gốc'},{key:'ma_hoso_sach',label:'Mã sạch'},{key:'tong_thuphi',label:'Thu phí',render:r=>fmt(r.tong_thuphi)},{key:'tong_bidv',label:'BIDV',render:r=>fmt(r.tong_bidv)},{key:'tong_sinvoice',label:'SInvoice',render:r=>fmt(r.tong_sinvoice)},{key:'trang_thai_tong',label:'Trạng thái'}]);
    $('#usersTable').innerHTML=table(users.data||[],[{key:'email',label:'Email'},{key:'ho_ten',label:'Họ tên'},{key:'vai_tro',label:'Vai trò'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'active',label:'Hoạt động'}]);
  }
  async function createSession(){
    const diemId=Number($('#sessionDiem').value), ngay=$('#sessionDate').value, note=$('#sessionNote').value.trim();
    const diem=diemList.find(x=>x.id===diemId); if(!diem||!ngay) return msg($('#sessionMsg'),'Chọn điểm và ngày', 'err');
    const ma=`DS-${ngay.replaceAll('-','')}-${diem.ma_diem}-${Date.now().toString().slice(-5)}`;
    const row={ma_phien:ma,diem_id:diemId,ngay_doi_soat:ngay,trang_thai:'draft',created_by:currentUser.email,ghi_chu:note};
    const {error}=await supa.from('doisoat_session').insert(row); if(error) return msg($('#sessionMsg'),error.message,'err');
    msg($('#sessionMsg'),`Đã tạo phiên ${ma}`,'ok'); await loadSessions(); await loadDashboard();
  }
  function previewData(data){
    $('#previewCard').classList.remove('hidden');
    $('#previewKpi').innerHTML=`
      <div class="kpi"><span>Hồ sơ thu phí</span><strong>${fmt(data.summary.tong_ho_so)}</strong></div>
      <div class="kpi good"><span>Đã khớp</span><strong>${fmt(data.summary.so_khop)}</strong></div>
      <div class="kpi warn"><span>Cần xử lý</span><strong>${fmt(data.summary.so_lech)}</strong></div>
      <div class="kpi bad"><span>Tiền chưa xác định</span><strong>${fmt(data.summary.bank_unidentified)}</strong></div>`;
    $('#resultTable').innerHTML=table(data.ketqua.slice(0,300),[{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'don_vi',label:'Đơn vị'},{key:'ngay_thu',label:'Ngày'},{key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)},{key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)},{key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)},{key:'trang_thai',label:'Trạng thái',render:r=>`<span class="badge ${r.trang_thai==='matched'?'good':'bad'}">${r.trang_thai}</span>`},{key:'loai_loi',label:'Loại lỗi'}]);
  }
  async function handlePreview(){
    const file=$('#workbookFile').files[0]; if(!file) return msg($('#uploadMsg'),'Chưa chọn file','err');
    try{ currentFile=file; currentWorkbook=await readWorkbook(file); currentData=CN10_ENGINE.reconcileWorkbook(currentWorkbook); previewData(currentData); msg($('#uploadMsg'),'File đạt mẫu. Có thể chạy engine và lưu Supabase.','ok'); }
    catch(e){ console.error(e); msg($('#uploadMsg'),e.message,'err'); }
  }
  async function saveAll(){
    if(!currentData||!currentFile) return msg($('#uploadMsg'),'Chưa preview file','err');
    const sessionId=Number($('#uploadSession').value); if(!sessionId) return msg($('#uploadMsg'),'Chưa chọn phiên','err');
    const opt=$('#uploadSession').selectedOptions[0]; const diemId=Number(opt?.dataset?.diem||0);
    if(!diemId) return msg($('#uploadMsg'),'Phiên chưa có điểm','err');
    try{
      msg($('#uploadMsg'),'Đang lưu dữ liệu...', '');
      const fileHash=await sha256(currentFile); const signature=`${currentFile.name}|${currentFile.size}|${fileHash}`;
      const frow={session_id:sessionId,loai_file:'workbook',file_name:currentFile.name,file_hash:fileHash,file_size:currentFile.size,file_signature:signature,row_count:currentData.summary.tong_ho_so,uploaded_by:currentUser.email,upload_status:'imported'};
      const {data:fileIns,error:fileErr}=await supa.from('doisoat_file').insert(frow).select().single(); if(fileErr) throw fileErr;
      await supa.from('file_repository').insert({session_id:sessionId,diem_id:diemId,loai_file:'workbook',file_name:currentFile.name,file_hash:fileHash,file_signature:signature,file_size:currentFile.size,row_count:currentData.summary.tong_ho_so,total_amount:currentData.summary.tong_thuphi,uploaded_by:currentUser.email,trang_thai:'imported'});
      const addMeta=r=>({...r,session_id:sessionId,diem_id:diemId,source_file_id:fileIns.id});
      await chunkInsert('fee_raw', currentData.feeRaw.map(addMeta));
      await chunkInsert('bank_raw', currentData.bankRaw.map(addMeta));
      await chunkInsert('invoice_raw', currentData.invoiceRaw.map(addMeta));
      await chunkInsert('doisoat_result', currentData.ketqua.map(r=>({...r,session_id:sessionId,diem_id:diemId})));
      await chunkInsert('bank_unidentified', currentData.bankUnidentified.map(r=>({...r,session_id:sessionId,diem_id:diemId})));
      await chunkInsert('invoice_unidentified', currentData.invoiceUnidentified.map(r=>({...r,session_id:sessionId,diem_id:diemId})));
      await chunkInsert('task_xuly', currentData.tasks.map(r=>({...r,session_id:sessionId,diem_id:diemId,created_by:currentUser.email})));
      await rebuildCases(sessionId,diemId,currentData.ketqua);
      await supa.from('doisoat_session').update({trang_thai: currentData.summary.so_lech?'review':'reconciled'}).eq('id',sessionId);
      await supa.from('workflow_history').insert({session_id:sessionId,action:'RUN_ENGINE',created_by:currentUser.email,detail:currentData.summary});
      msg($('#uploadMsg'),'Đã chạy engine và lưu Supabase thành công.','ok'); await loadSessions(); await loadDashboard(); await loadTables();
    }catch(e){ console.error(e); msg($('#uploadMsg'),e.message,'err'); }
  }
  async function rebuildCases(sessionId,diemId,ketqua){
    for(const r of ketqua){
      const status = r.trang_thai==='matched'?'ready_accounting':'needs_review';
      const cm={ma_hoso_sach:r.ma_hoso_sach,ma_hoso_goc:r.ma_hoso_goc,diem_id:diemId,don_vi:r.don_vi,tong_thuphi:r.thuphi,tong_bidv:r.bidv,tong_sinvoice:r.sinvoice,thuphi_status:r.thuphi>0?'ok':'missing',bidv_status:r.bidv>0?'ok':'missing',invoice_status:r.sinvoice>0?'ok':'missing',accounting_status:status==='ready_accounting'?'ready':'pending',trang_thai_tong:status,last_session_id:sessionId,updated_at:new Date().toISOString()};
      const {data,error}=await supa.from('case_master').upsert(cm,{onConflict:'ma_hoso_sach'}).select('id').single();
      if(error) throw error;
      await supa.from('case_event').insert([{case_id:data.id,session_id:sessionId,event_type:'RECONCILE',event_source:'engine',amount:r.thuphi,ref_no:r.ma_hoso_sach,note:r.trang_thai,raw_data:r,created_by:currentUser.email}]);
    }
  }
  $$('.nav button').forEach(b=>b.addEventListener('click',()=>{$$('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active'));$('#'+b.dataset.view).classList.add('active');}));
  $('#loginBtn').addEventListener('click',async()=>{const email=$('#loginEmail').value.trim(),password=$('#loginPass').value; const {data,error}=await supa.auth.signInWithPassword({email,password}); if(error) return msg($('#loginMsg'),error.message,'err'); currentUser=data.user; currentProfile=await getProfile(email); showApp(); await bootstrap();});
  $('#logoutBtn').addEventListener('click',async()=>{await supa.auth.signOut(); location.reload();});
  $('#refreshBtn').addEventListener('click',bootstrap);
  $('#createSessionBtn').addEventListener('click',createSession);
  $('#previewBtn').addEventListener('click',handlePreview);
  $('#runEngineBtn').addEventListener('click',saveAll);
  initAuth().catch(e=>{console.error(e); alert(e.message);});
})();
