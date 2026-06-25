(function(){
  const cfg=window.CN10_CONFIG;
  const supa=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
  const $=s=>document.querySelector(s);
  let currentUser=null,currentProfile=null,diemList=[],currentWb=null,currentPreview=null,currentResult=null;

  function fmt(n){return Number(n||0).toLocaleString('vi-VN');}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function msg(el,text,ok=true){if(!el)return;el.textContent=text||'';el.className='message '+(ok?'ok':'err');}
  function today(){return new Date().toISOString().slice(0,10);}
  function table(rows,cols){if(!rows||!rows.length)return '<p class="empty">Không có dữ liệu</p>';return `<table class="data-table"><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
  function show(view){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('#'+view)?.classList.add('active');document.querySelectorAll('.menu button').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); if(view==='dashboard')loadDashboard(); if(view==='sessions')loadSessions(); if(view==='tasks')loadTasks(); if(view==='bank')loadBank(); if(view==='cases')loadCases(); if(view==='admin')loadUsers();}
  document.querySelectorAll('.menu button').forEach(b=>b.onclick=()=>show(b.dataset.view));
  $('#reloadBtn').onclick=()=>location.reload();

  async function init(){
    $('#sessionDate').value=today();
    const {data:{session}}=await supa.auth.getSession();
    if(session?.user){currentUser=session.user;await afterLogin();} else {$('#loginView').classList.remove('hidden');$('#mainViews').classList.add('hidden');}
  }
  $('#loginBtn').onclick=async()=>{
    const email=$('#emailInput').value.trim(), password=$('#passwordInput').value;
    const {data,error}=await supa.auth.signInWithPassword({email,password});
    if(error){msg($('#loginMsg'),error.message,false);return;}
    currentUser=data.user; await afterLogin();
  };
  $('#logoutBtn').onclick=async()=>{await supa.auth.signOut();location.reload();};

  async function afterLogin(){
    $('#loginView').classList.add('hidden');$('#mainViews').classList.remove('hidden');$('#logoutBtn').classList.remove('hidden');
    currentProfile=await getProfile(currentUser.email);
    $('#userBadge').textContent=`${currentProfile?.ho_ten||currentUser.email} · ${currentProfile?.vai_tro||'guest'}`;
    await Promise.all([loadDiem(),loadSystem()]);
    await loadDashboard(); await loadSessions();
  }
  async function getProfile(email){
    const {data,error}=await supa.from('users_app').select('*').eq('email',email.toLowerCase()).eq('active',true).maybeSingle();
    if(error)console.warn(error.message);
    return data||{email,vai_tro:'guest',ho_ten:email};
  }
  function canAll(){return ['admin','ketoan','lanhdao'].includes(currentProfile?.vai_tro);}
  async function loadDiem(){
    const {data,error}=await supa.from('diem').select('*').eq('active',true).order('thu_tu');
    if(error){alert('Không tải được điểm: '+error.message);return;}
    diemList=data||[];
    const opts='<option value="">-- Chọn điểm --</option>'+diemList.map(d=>`<option value="${d.id}">${esc(d.ten_diem)}</option>`).join('');
    ['#sessionDiem','#adminDiem'].forEach(id=>{const el=$(id); if(el)el.innerHTML=opts;});
    await loadSessionOptions();
  }
  async function loadSystem(){
    const {data}=await supa.from('system_version').select('*').eq('id',1).maybeSingle();
    $('#sbStatus').textContent='Supabase OK'; $('#sbVersion').textContent=`Frontend ${cfg.FRONTEND_VERSION}`;
    $('#systemInfo').innerHTML=`<p><b>Frontend:</b> ${esc(cfg.FRONTEND_VERSION)}</p><p><b>Database:</b> ${esc(data?.database_version||data?.version_code||'chưa rõ')}</p><p><b>Project:</b> ${esc(cfg.SUPABASE_URL)}</p>`;
  }

  async function loadDashboard(){
    const todayStr=today();
    const [s,r,b]=await Promise.all([
      supa.from('doisoat_session').select('*').gte('ngay_doi_soat',todayStr).lte('ngay_doi_soat',todayStr),
      supa.from('doisoat_result').select('trang_thai,thuphi').limit(50000),
      supa.from('doisoat_session').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(10)
    ]);
    const res=r.data||[];
    $('#kpiSessions').textContent=(s.data||[]).length;
    $('#kpiMatched').textContent=res.filter(x=>x.trang_thai==='matched').length;
    $('#kpiReview').textContent=res.filter(x=>x.trang_thai!=='matched').length;
    $('#kpiMoney').textContent=fmt(res.reduce((sum,x)=>sum+Number(x.thuphi||0),0));
    $('#recentSessions').innerHTML=table(b.data||[],[
      {key:'ma_phien',label:'Mã phiên'},
      {key:'ngay_doi_soat',label:'Ngày'},
      {key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},
      {key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill">${esc(r.trang_thai)}</span>`},
      {key:'created_by',label:'Người tạo'}
    ]);
  }

  async function createSession(){
    const diem_id=Number($('#sessionDiem').value), ngay=$('#sessionDate').value, note=$('#sessionNote').value.trim();
    if(!diem_id||!ngay){msg($('#sessionMsg'),'Chọn điểm và ngày',false);return;}
    const diem=diemList.find(d=>d.id===diem_id);
    const ma=`DS-${ngay.replaceAll('-','')}-${diem.ma_diem}-${Date.now().toString().slice(-4)}`;
    const {error}=await supa.from('doisoat_session').insert({ma_phien:ma,diem_id,ngay_doi_soat:ngay,ghi_chu:note,created_by:currentUser.email,trang_thai:'draft'});
    if(error){msg($('#sessionMsg'),error.message,false);return;}
    msg($('#sessionMsg'),'Đã tạo phiên '+ma); await loadSessions(); await loadSessionOptions(); show('upload');
  }
  $('#createSessionBtn').onclick=createSession;

  async function loadSessions(){
    const {data,error}=await supa.from('doisoat_session').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(200);
    if(error){$('#sessionTable').innerHTML=error.message;return;}
    $('#sessionTable').innerHTML=table(data||[],[
      {key:'ma_phien',label:'Mã phiên'},
      {key:'ngay_doi_soat',label:'Ngày'},
      {key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},
      {key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill">${esc(r.trang_thai)}</span>`},
      {key:'ghi_chu',label:'Ghi chú'}
    ]);
  }
  async function loadSessionOptions(){
    const {data}=await supa.from('doisoat_session').select('id,ma_phien,ngay_doi_soat,diem(ten_diem)').neq('trang_thai','closed').order('id',{ascending:false}).limit(100);
    const opts='<option value="">-- Chọn phiên --</option>'+(data||[]).map(s=>`<option value="${s.id}">${esc(s.ma_phien)} · ${esc(s.diem?.ten_diem||'')}</option>`).join('');
    $('#uploadSession').innerHTML=opts;
  }

  async function readWorkbook(file){
    const buf=await file.arrayBuffer();
    return XLSX.read(buf,{type:'array',cellDates:true});
  }
  $('#previewBtn').onclick=async()=>{
    const f=$('#workbookFile').files[0];
    if(!$('#uploadSession').value){msg($('#uploadMsg'),'Chọn phiên trước',false);return;}
    if(!f){msg($('#uploadMsg'),'Chọn file Excel',false);return;}
    try{
      currentWb=await readWorkbook(f); currentPreview=CN10_ENGINE.previewWorkbook(currentWb);
      $('#previewBox').innerHTML=`<div class="box"><b>File</b><p>${esc(f.name)}</p></div><div class="box"><b>Doisoat</b><p>${fmt(currentPreview.counts?.doisoat||0)} dòng</p></div><div class="box"><b>Sao kê</b><p>${fmt(currentPreview.counts?.saoke||0)} dòng</p></div><div class="box"><b>SInvoice</b><p>${fmt(currentPreview.counts?.sinvoice||0)} dòng</p></div>`;
      msg($('#uploadMsg'),currentPreview.message,currentPreview.valid);
      $('#runEngineBtn').disabled=!currentPreview.valid;
    }catch(e){msg($('#uploadMsg'),e.message,false);}
  };
  $('#runEngineBtn').onclick=()=>{
    try{
      currentResult=CN10_ENGINE.reconcileWorkbook(currentWb);
      $('#resultTabs').classList.remove('hidden');
      renderResult('all');
      $('#saveResultBtn').disabled=false;$('#exportResultBtn').disabled=false;
      msg($('#uploadMsg'),`Đã chạy engine: ${fmt(currentResult.summary.tong_ho_so)} hồ sơ, ${fmt(currentResult.summary.so_lech)} cần xử lý`);
    }catch(e){msg($('#uploadMsg'),e.message,false);}
  };
  document.querySelectorAll('#resultTabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#resultTabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderResult(b.dataset.tab);});
  function renderResult(tab){
    if(!currentResult)return;
    if(tab==='bank'){$('#resultTable').innerHTML=table(currentResult.bankUnidentified,[{key:'ngay_giao_dich',label:'Ngày'},{key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)},{key:'tham_chieu',label:'Tham chiếu'},{key:'dien_giai',label:'Diễn giải'}]);return;}
    if(tab==='invoice'){$('#resultTable').innerHTML=table(currentResult.invoiceUnidentified,[{key:'ngay_hoa_don',label:'Ngày HĐ'},{key:'so_hoa_don',label:'Số HĐ'},{key:'tong_tien',label:'Tổng tiền',render:r=>fmt(r.tong_tien)},{key:'aq',label:'AQ'},{key:'bp',label:'BP'},{key:'bu',label:'BU'}]);return;}
    let rows=currentResult.ketqua;if(tab==='review')rows=rows.filter(x=>x.trang_thai!=='matched');
    $('#resultTable').innerHTML=table(rows.slice(0,1000),[{key:'don_vi',label:'Đơn vị'},{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'ngay_thu',label:'Ngày'},{key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)},{key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)},{key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)},{key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill ${r.trang_thai==='matched'?'ok':'warn'}">${r.trang_thai}</span>`},{key:'loai_loi',label:'Loại lỗi'}]);
  }
  $('#saveResultBtn').onclick=async()=>{
    const session_id=Number($('#uploadSession').value), f=$('#workbookFile').files[0]; if(!session_id||!currentResult)return;
    const session=(await supa.from('doisoat_session').select('*').eq('id',session_id).single()).data;
    const diem_id=session.diem_id;
    try{
      const fileIns=await supa.from('doisoat_file').insert({session_id,diem_id,loai_file:'workbook',file_name:f.name,row_count:currentResult.summary.tong_ho_so,uploaded_by:currentUser.email}).select('id').single();
      if(fileIns.error)throw fileIns.error;
      const file_id=fileIns.data.id;
      await supa.from('doisoat_result').delete().eq('session_id',session_id);
      await supa.from('bank_unidentified').delete().eq('session_id',session_id);
      await supa.from('invoice_unidentified').delete().eq('session_id',session_id);
      await supa.from('task_xuly').delete().eq('session_id',session_id);
      await supa.from('case_event').delete().eq('session_id',session_id);
      const kq=currentResult.ketqua.map(x=>({...x,session_id,diem_id}));
      for(let i=0;i<kq.length;i+=500){const {error}=await supa.from('doisoat_result').insert(kq.slice(i,i+500)); if(error)throw error;}
      const bu=currentResult.bankUnidentified.map(x=>({...x,session_id,diem_id}));
      if(bu.length) for(let i=0;i<bu.length;i+=500){const {error}=await supa.from('bank_unidentified').insert(bu.slice(i,i+500)); if(error)throw error;}
      const iu=currentResult.invoiceUnidentified.map(x=>({...x,session_id,diem_id}));
      if(iu.length) for(let i=0;i<iu.length;i+=500){const {error}=await supa.from('invoice_unidentified').insert(iu.slice(i,i+500)); if(error)throw error;}
      const tasks=kq.filter(x=>x.trang_thai!=='matched').map(x=>({session_id,diem_id,ma_hoso:x.ma_hoso_sach,loai_loi:x.loai_loi||'Cần kiểm tra',noi_dung:`${x.ma_hoso_goc}: Thu phí ${fmt(x.thuphi)}, BIDV ${fmt(x.bidv)}, HĐ ${fmt(x.sinvoice)}`,huong_xu_ly:'Kiểm tra nguồn thu phí/BIDV/SInvoice',created_by:currentUser.email}));
      if(tasks.length) for(let i=0;i<tasks.length;i+=500){const {error}=await supa.from('task_xuly').insert(tasks.slice(i,i+500)); if(error)throw error;}
      // case_master upsert one by one for reliability
      for(const x of kq){
        await supa.from('case_master').upsert({
          ma_hoso_sach:x.ma_hoso_sach,ma_hoso_goc:x.ma_hoso_goc,diem_id,don_vi:x.don_vi,ngay_phat_sinh:session.ngay_doi_soat,
          tong_thuphi:x.thuphi,tong_bidv:x.bidv,tong_sinvoice:x.sinvoice,
          thuphi_status:x.thuphi>0?'ok':'missing',bidv_status:x.bidv>0?'ok':'missing',invoice_status:x.sinvoice>0?'ok':'missing',
          accounting_status:x.trang_thai==='matched'?'ready':'pending',trang_thai_tong:x.trang_thai,last_session_id:session_id,updated_at:new Date().toISOString()
        },{onConflict:'ma_hoso_sach'});
      }
      await supa.from('doisoat_session').update({trang_thai: currentResult.summary.so_lech?'review':'reconciled'}).eq('id',session_id);
      await supa.from('workflow_history').insert({session_id,action:'SAVE_RESULT',created_by:currentUser.email,detail:currentResult.summary});
      msg($('#uploadMsg'),'Đã lưu kết quả, task lỗi và case master vào Supabase');
      await loadDashboard(); await loadSessions();
    }catch(e){console.error(e);msg($('#uploadMsg'),e.message,false);}
  };
  $('#exportResultBtn').onclick=()=>{if(!currentResult)return;const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(currentResult.ketqua),'KetQua');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(currentResult.bankUnidentified),'Bank_Unidentified');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(currentResult.invoiceUnidentified),'Invoice_Unidentified');XLSX.writeFile(wb,'cn10_ket_qua_doi_soat.xlsx');};

  async function loadTasks(){const {data,error}=await supa.from('task_xuly').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(500);if(error){$('#tasksTable').innerHTML=error.message;return;}$('#tasksTable').innerHTML=table(data||[],[{key:'loai_loi',label:'Loại lỗi'},{key:'ma_hoso',label:'Mã hồ sơ'},{key:'noi_dung',label:'Nội dung'},{key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill warn">${esc(r.trang_thai)}</span>`},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')}]);}
  async function loadBank(){const {data,error}=await supa.from('bank_unidentified').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(500);if(error){$('#bankTable').innerHTML=error.message;return;}$('#bankTable').innerHTML=table(data||[],[{key:'ngay_giao_dich',label:'Ngày'},{key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)},{key:'tham_chieu',label:'Tham chiếu'},{key:'dien_giai',label:'Diễn giải'},{key:'trang_thai',label:'Trạng thái'}]);}
  async function loadCases(){const {data,error}=await supa.from('case_master').select('*,diem(ten_diem)').order('updated_at',{ascending:false}).limit(500);if(error){$('#caseTable').innerHTML=error.message;return;}$('#caseTable').innerHTML=table(data||[],[{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'tong_thuphi',label:'Thu phí',render:r=>fmt(r.tong_thuphi)},{key:'tong_bidv',label:'BIDV',render:r=>fmt(r.tong_bidv)},{key:'tong_sinvoice',label:'HĐ',render:r=>fmt(r.tong_sinvoice)},{key:'trang_thai_tong',label:'Trạng thái'}]);}
  async function loadUsers(){const {data,error}=await supa.from('users_app').select('*,diem(ten_diem)').order('id');if(error){$('#usersTable').innerHTML=error.message;return;}$('#usersTable').innerHTML=table(data||[],[{key:'email',label:'Email'},{key:'ho_ten',label:'Họ tên'},{key:'vai_tro',label:'Vai trò'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'active',label:'Hoạt động'}]);}
  $('#saveUserBtn').onclick=async()=>{const row={email:$('#adminEmail').value.trim().toLowerCase(),ho_ten:$('#adminName').value.trim(),vai_tro:$('#adminRole').value,diem_id:$('#adminDiem').value?Number($('#adminDiem').value):null,active:true};if(!row.email){msg($('#adminMsg'),'Nhập email',false);return;}if(row.vai_tro!=='diem')row.diem_id=null;const {error}=await supa.from('users_app').upsert(row,{onConflict:'email'});if(error){msg($('#adminMsg'),error.message,false);return;}msg($('#adminMsg'),'Đã lưu quyền');loadUsers();};

  window.CN10={loadDashboard,loadTasks,loadBank,loadCases};
  init();
})();