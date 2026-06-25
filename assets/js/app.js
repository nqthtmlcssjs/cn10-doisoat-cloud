(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const fmt=n=>Number(n||0).toLocaleString('vi-VN');
  const supa=window.supabase.createClient(window.CN10_CONFIG.SUPABASE_URL, window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY);
  let currentUser=null,currentProfile=null,diemList=[],currentSession=null,lastResult=null,lastFileName='';

  function msg(id,text,ok=true){ const el=$(id); if(el){el.textContent=text||''; el.className='msg '+(ok?'ok':'err');}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function table(rows,cols,empty='Không có dữ liệu'){ if(!rows||!rows.length) return `<p>${empty}</p>`; return `<table class="data"><thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
  const canAll=()=>currentProfile&&['admin','ketoan','lanhdao'].includes(currentProfile.vai_tro);
  const isAdmin=()=>currentProfile&&currentProfile.vai_tro==='admin';
  const diemId=()=>canAll()?Number($('#sessionDiem')?.value||0):(currentProfile?.diem_id||0);

  function show(id){ $$('.view').forEach(v=>v.classList.remove('active')); $('#'+id)?.classList.add('active'); $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); if(id==='dashboard') loadDashboard(); if(id==='sessions') loadSessions(); if(id==='issues') loadIssues(); if(id==='money') loadMoney(); if(id==='accounting') loadAccounting(); if(id==='admin') loadAdmin(); }
  $$('.nav button').forEach(b=>b.onclick=()=>show(b.dataset.view));
  $('#refreshBtn').onclick=()=>loadAll();

  async function init(){
    await initAuth(); await loadDiem(); await loadVersion(); await loadAll();
  }
  async function initAuth(){
    const {data:{session}}=await supa.auth.getSession();
    currentUser=session?.user||null;
    if(!currentUser){ currentProfile=null; $('#userBadge').textContent='Chưa đăng nhập'; $('#loginBox').classList.remove('hidden'); $('#logoutBtn').classList.add('hidden'); return; }
    const email=currentUser.email.toLowerCase();
    const {data,error}=await supa.from('users_app').select('*,diem(ten_diem)').ilike('email',email).maybeSingle();
    if(error) console.error(error);
    currentProfile=data||{email,ho_ten:email,vai_tro:'guest'};
    $('#userBadge').textContent=`${currentProfile.ho_ten||email} · ${currentProfile.vai_tro}${currentProfile.diem?.ten_diem?' · '+currentProfile.diem.ten_diem:''}`;
    $('#loginBox').classList.add('hidden'); $('#logoutBtn').classList.remove('hidden');
  }
  $('#loginBtn').onclick=async()=>{ const email=$('#loginEmail').value.trim(), password=$('#loginPassword').value; const {error}=await supa.auth.signInWithPassword({email,password}); if(error) return alert(error.message); await init(); };
  $('#logoutBtn').onclick=async()=>{ await supa.auth.signOut(); location.reload(); };

  async function loadVersion(){ const {data}=await supa.from('system_version').select('*').eq('id',1).maybeSingle(); $('#dbVersion').textContent=data?.version_code||'DB chưa cài'; }
  async function loadDiem(){
    const {data,error}=await supa.from('diem').select('*').eq('active',true).order('thu_tu');
    if(error){ $('#connectionStatus').textContent='Lỗi Supabase'; console.error(error); return; }
    $('#connectionStatus').textContent='Supabase OK';
    diemList=data||[];
    const opts='<option value="">Chọn điểm</option>'+diemList.map(d=>`<option value="${d.id}">${esc(d.ten_diem)}</option>`).join('');
    ['#sessionDiem','#filterDiem','#userDiem'].forEach(s=>{const el=$(s); if(el) el.innerHTML=opts;});
  }
  async function loadAll(){ loadDashboard(); loadSessions(); }

  async function createSession(){
    if(!currentProfile||currentProfile.vai_tro==='guest') return alert('Bạn cần đăng nhập tài khoản đã phân quyền');
    const d=diemId(), ky=$('#sessionKy').value.trim();
    if(!d||!ky) return msg('#sessionMsg','Chọn điểm và nhập kỳ đối soát',false);
    const dd=diemList.find(x=>x.id===d); const suffix=Date.now().toString().slice(-5);
    const ma=`DS-${ky.replace(/[^0-9]/g,'')}-${dd.ma_diem}-${suffix}`;
    const payload={ma_phien:ma,diem_id:d,ky_doisoat:ky,ngay_bat_dau:$('#dateFrom').value||null,ngay_ket_thuc:$('#dateTo').value||null,created_by:currentProfile.email||currentUser.email,trang_thai:'draft',ghi_chu:$('#sessionNote').value||''};
    const {data,error}=await supa.from('doisoat_session').insert(payload).select('*,diem(ten_diem)').single();
    if(error) return msg('#sessionMsg',error.message,false);
    currentSession=data; msg('#sessionMsg','Đã tạo phiên: '+ma); $('#currentSession').textContent=ma; await loadSessions();
  }
  $('#createSessionBtn').onclick=createSession;

  $('#workbookInput').onchange=e=>{lastFileName=e.target.files[0]?.name||''; $('#fileName').textContent=lastFileName||'Chưa chọn file';};
  $('#runBtn').onclick=async()=>{
    const f=$('#workbookInput').files[0]; if(!currentSession) return msg('#runMsg','Phải tạo phiên trước khi chạy',false); if(!f) return msg('#runMsg','Chọn file Excel trước',false);
    try{ msg('#runMsg','Đang chạy đối soát...'); const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true}); lastResult=window.CN10_ENGINE.reconcileWorkbook(wb); renderResult(); msg('#runMsg',`Đã chạy: ${fmt(lastResult.summary.tong_ho_so)} hồ sơ, lệch ${fmt(lastResult.summary.so_lech)}. Bấm Lưu Supabase.`); $('#saveBtn').disabled=false; }
    catch(e){ console.error(e); msg('#runMsg',e.message,false); }
  };
  $('#saveBtn').onclick=saveResult;

  async function saveResult(){
    if(!currentSession||!lastResult) return;
    try{
      const d=currentSession.diem_id;
      const {data:dot,error}=await supa.from('dot_doisoat').insert({session_id:currentSession.id,diem_id:d,file_name:lastFileName,source_mode:'workbook',created_by:currentProfile.email,nguoi_thuc_hien:currentProfile.ho_ten||currentProfile.email,...lastResult.summary}).select('id').single();
      if(error) throw error;
      const dotId=dot.id, add=x=>({...x,dot_id:dotId,session_id:currentSession.id,diem_id:d});
      await chunks('ketqua_doisoat',lastResult.ketqua.map(add));
      await chunks('hoa_don_chua_khop',lastResult.hoaDonChuaKhop.map(add));
      await chunks('saoke_chua_nhan_dien',lastResult.saokeChuaNhanDien.map(add));
      await chunks('thongke_sinvoice',lastResult.thongke.map(x=>({...x,dot_id:dotId,session_id:currentSession.id})));
      await supa.from('doisoat_session').update({trang_thai:lastResult.summary.so_lech?'review':'completed'}).eq('id',currentSession.id);
      await createTasksFromIssues(dotId,d);
      msg('#runMsg','Đã lưu Supabase. Mã lần chạy: '+dotId); $('#saveBtn').disabled=true; loadAll();
    }catch(e){console.error(e); msg('#runMsg',e.message,false);}
  }
  async function chunks(t,rows){ for(let i=0;i<rows.length;i+=500){ const {error}=await supa.from(t).insert(rows.slice(i,i+500)); if(error) throw error; } }
  async function createTasksFromIssues(dotId,d){
    const rows=lastResult.ketqua.filter(x=>x.trang_thai!=='Matched').slice(0,1000).map(x=>({session_id:currentSession.id,dot_id:dotId,diem_id:d,ma_hoso:x.ma_hoso_goc,loai_loi:x.loai_loi,noi_dung:`${x.loai_loi}: ${x.ma_hoso_goc}`,huong_xu_ly:x.huong_hach_toan,created_by:currentProfile.email}));
    if(rows.length) await chunks('tasks',rows);
  }

  function renderResult(){ const s=lastResult.summary; $('#kpiTotal').textContent=fmt(s.tong_ho_so); $('#kpiMatched').textContent=fmt(s.so_khop); $('#kpiReview').textContent=fmt(s.so_lech); $('#kpiMoney').textContent=fmt(s.tong_thuphi); $('#resultTable').innerHTML=table(lastResult.ketqua.slice(0,500),[
    {key:'ma_hoso_goc',label:'Mã hồ sơ'}, {key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)}, {key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)}, {key:'sinvoice',label:'Hóa đơn',render:r=>fmt(r.sinvoice)}, {key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill ${r.trang_thai==='Matched'?'p-ok':'p-warn'}">${esc(r.trang_thai)}</span>`}, {key:'loai_loi',label:'Loại lỗi'}, {key:'huong_hach_toan',label:'Hướng hạch toán'}
  ]); }

  async function loadDashboard(){
    const {data}=await supa.from('dot_doisoat').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(5);
    $('#latestRuns').innerHTML=table(data||[],[{key:'id',label:'ID'},{key:'ngay_doisoat',label:'Ngày'},{key:'diem',label:'Điểm',render:r=>r.diem?.ten_diem||''},{key:'tong_ho_so',label:'Hồ sơ',render:r=>fmt(r.tong_ho_so)},{key:'so_lech',label:'Cần xử lý',render:r=>fmt(r.so_lech)}]);
  }
  async function loadSessions(){
    const {data,error}=await supa.from('doisoat_session').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(200);
    if(error){$('#sessionTable').innerHTML='<p>'+esc(error.message)+'</p>'; return;}
    $('#sessionTable').innerHTML=table(data||[],[{key:'ma_phien',label:'Mã phiên'},{key:'diem',label:'Điểm',render:r=>r.diem?.ten_diem||''},{key:'ky_doisoat',label:'Kỳ'},{key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill p-warn">${r.trang_thai}</span>`},{key:'created_at',label:'Ngày tạo'}]);
  }
  async function loadIssues(){
    const {data,error}=await supa.from('tasks').select('*,diem(ten_diem)').neq('trang_thai','done').order('id',{ascending:false}).limit(500);
    if(error){$('#issueTable').innerHTML='<p>'+esc(error.message)+'</p>'; return;}
    $('#issueTable').innerHTML=table(data||[],[{key:'loai_loi',label:'Loại lỗi'},{key:'ma_hoso',label:'Mã hồ sơ'},{key:'diem',label:'Điểm',render:r=>r.diem?.ten_diem||''},{key:'huong_xu_ly',label:'Hướng xử lý'},{key:'trang_thai',label:'Trạng thái'}]);
  }
  async function loadMoney(){
    const {data,error}=await supa.from('bank_unidentified').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(500);
    $('#moneyTable').innerHTML= error?'<p>'+esc(error.message)+'</p>':table(data||[],[{key:'ngay_giao_dich',label:'Ngày'},{key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)},{key:'tham_chieu',label:'Tham chiếu'},{key:'dien_giai',label:'Diễn giải'},{key:'trang_thai',label:'Trạng thái'}]);
  }
  async function loadAccounting(){
    const {data,error}=await supa.from('accounting_status').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(500);
    $('#accountingTable').innerHTML= error?'<p>'+esc(error.message)+'</p>':table(data||[],[{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'amount_thuphi',label:'Thu phí',render:r=>fmt(r.amount_thuphi)},{key:'amount_bidv',label:'BIDV',render:r=>fmt(r.amount_bidv)},{key:'amount_invoice',label:'HĐ',render:r=>fmt(r.amount_invoice)},{key:'accounting_status',label:'Trạng thái'}]);
  }
  async function loadAdmin(){
    if(!isAdmin()) return;
    const {data}=await supa.from('users_app').select('*,diem(ten_diem)').order('id'); $('#usersTable').innerHTML=table(data||[],[{key:'email',label:'Email'},{key:'ho_ten',label:'Họ tên'},{key:'vai_tro',label:'Vai trò'},{key:'diem',label:'Điểm',render:r=>r.diem?.ten_diem||''},{key:'active',label:'Active'}]);
  }
  $('#userSaveBtn').onclick=async()=>{ if(!isAdmin()) return alert('Chỉ admin'); const role=$('#userRole').value; const row={email:$('#userEmail').value.trim().toLowerCase(),ho_ten:$('#userName').value.trim(),vai_tro:role,diem_id:role==='diem'?Number($('#userDiem').value):null,active:true}; if(!row.email) return msg('#userMsg','Nhập email',false); const {error}=await supa.from('users_app').upsert(row,{onConflict:'email'}); if(error) return msg('#userMsg',error.message,false); msg('#userMsg','Đã lưu quyền'); loadAdmin(); };

  window.CN10_APP={show}; init();
})();