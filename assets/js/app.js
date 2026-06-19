(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const fmt = (n)=>Number(n||0).toLocaleString('vi-VN');
  const supa = window.supabase.createClient(window.CN10_CONFIG.SUPABASE_URL, window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY);
  let lastResult=null, lastFileName='', currentTab='all', latestRuns=[];

  function msg(el, text, ok=true){ el.textContent=text; el.className='message ' + (ok?'ok':'err'); }
  function table(rows, cols, empty='Không có dữ liệu'){
    if(!rows || rows.length===0) return `<p class="empty-note">${empty}</p>`;
    const head = cols.map(c=>`<th>${c.label}</th>`).join('');
    const body = rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):escapeHtml(r[c.key]??'')}</td>`).join('')}</tr>`).join('');
    return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }
  function escapeHtml(v){ return String(v).replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function moneyCell(k){ return {key:k,label:k,render:r=>fmt(r[k])}; }

  function showView(id){ $$('.view').forEach(v=>v.classList.remove('active-view')); $('#'+id).classList.add('active-view'); $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===id)); if(id==='history') loadHistory(); if(id==='journal') loadJournal(); if(id==='admin') loadDiem(); if(id==='dashboard') loadDashboard(); }
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $('#refreshBtn').addEventListener('click',()=>{loadDashboard(); loadHistory();});

  function updateKPI(s, runId='-'){
    $('#kpiTotal').textContent=fmt(s?.tong_ho_so||0); $('#kpiMatched').textContent=fmt(s?.so_khop||0); $('#kpiReview').textContent=fmt(s?.so_lech||0);
    $('#kpiThuPhi').textContent=fmt(s?.tong_thuphi||0); $('#kpiBidv').textContent=fmt(s?.tong_bidv||0); $('#kpiSinvoice').textContent=fmt(s?.tong_sinvoice||0); $('#kpiRunId').textContent=runId;
  }

  async function checkConnection(){
    try{ const {error}=await supa.from('dot_doisoat').select('id').limit(1); if(error) throw error; $('#connectionStatus').textContent='Supabase OK'; }
    catch(e){ $('#connectionStatus').textContent='Lỗi Supabase'; console.error(e); }
  }

  async function loadDashboard(){
    const {data,error}=await supa.from('dot_doisoat').select('*').order('id',{ascending:false}).limit(5);
    if(error){ console.error(error); return; }
    latestRuns=data||[];
    if(latestRuns[0]) updateKPI(latestRuns[0], latestRuns[0].id);
    $('#latestRuns').innerHTML = renderRuns(latestRuns.slice(0,5));
  }
  function renderRuns(rows){
    return table(rows,[
      {key:'id',label:'ID'}, {key:'ngay_doisoat',label:'Ngày'}, {key:'file_name',label:'File'},
      {key:'tong_ho_so',label:'Hồ sơ',render:r=>fmt(r.tong_ho_so)}, {key:'so_khop',label:'Khớp',render:r=>fmt(r.so_khop)}, {key:'so_lech',label:'Lệch',render:r=>fmt(r.so_lech)},
      {key:'tong_thuphi',label:'Thu phí',render:r=>fmt(r.tong_thuphi)},
      {key:'act',label:'Xem',render:r=>`<button class="mini-btn" onclick="CN10_APP.openRun(${r.id})">Chi tiết</button>`}
    ]);
  }
  async function loadHistory(){
    const {data,error}=await supa.from('dot_doisoat').select('*').order('id',{ascending:false}).limit(100);
    if(error){ $('#historyTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#historyTable').innerHTML = renderRuns(data||[]);
  }

  async function openRun(id){
    const [d,k,h,s,t] = await Promise.all([
      supa.from('dot_doisoat').select('*').eq('id',id).single(),
      supa.from('ketqua_doisoat').select('*').eq('dot_id',id).limit(20000),
      supa.from('hoa_don_chua_khop').select('*').eq('dot_id',id).limit(20000),
      supa.from('saoke_chua_nhan_dien').select('*').eq('dot_id',id).limit(20000),
      supa.from('thongke_sinvoice').select('*').eq('dot_id',id).limit(1000)
    ]);
    if(d.error){ alert(d.error.message); return; }
    const run=d.data; updateKPI(run, run.id); showView('history');
    const matched=(k.data||[]).filter(x=>x.trang_thai==='Matched').length;
    $('#historyDetail').classList.remove('hidden');
    $('#historyDetail').innerHTML = `<div class="section-head"><div><h2>Chi tiết lần chạy #${id}</h2><p>${run.ngay_doisoat||''} - ${escapeHtml(run.file_name||'')}</p></div><button class="ghost-btn" onclick="CN10_APP.exportRun(${id})">⬇️ Xuất Excel</button></div>
      <div class="kpi-grid compact"><div class="kpi-card"><span>Hồ sơ</span><strong>${fmt(run.tong_ho_so)}</strong></div><div class="kpi-card ok"><span>Khớp</span><strong>${fmt(matched)}</strong></div><div class="kpi-card warn"><span>Lệch</span><strong>${fmt(run.so_lech)}</strong></div></div>
      <details open class="panel"><summary>Kết quả đối soát</summary>${renderResultTable(k.data||[])}</details>
      <details class="panel"><summary>Hóa đơn chưa khớp (${(h.data||[]).length})</summary>${renderHD(h.data||[])}</details>
      <details class="panel"><summary>Sao kê chưa nhận diện (${(s.data||[]).length})</summary>${renderSaoke(s.data||[])}</details>
      <details class="panel"><summary>Thống kê SInvoice</summary>${renderThongKe(t.data||[])}</details>`;
    window._currentRunData={run, ketqua:k.data||[], hd:h.data||[], saoke:s.data||[], thongke:t.data||[]};
  }

  $('#workbookInput').addEventListener('change', e=>{ const f=e.target.files[0]; lastFileName=f?f.name:''; $('#fileName').textContent=lastFileName||'Chưa chọn file'; });
  $('#runDate').valueAsDate = new Date();
  $('#runBtn').addEventListener('click', async()=>{
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
  $('#saveBtn').addEventListener('click', saveSupabase);
  $('#exportBtn').addEventListener('click', ()=>exportData(lastResult));
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
    return table(rows,[{key:'don_vi',label:'Đơn vị'}, {key:'ma_hoso_goc',label:'Mã hồ sơ'}, {key:'ngay_thu',label:'Ngày'}, {key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)}, {key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)}, {key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)}, {key:'trang_thai',label:'Trạng thái',render:r=>`<span class="${r.trang_thai==='Matched'?'status-ok':'status-review'}">${r.trang_thai}</span>`}, {key:'tham_chieu_bidv',label:'Tham chiếu'}, {key:'so_hoa_don',label:'Số HĐ'}]);
  }
  function renderHD(rows){ return table(rows,[{key:'ngay_hoa_don',label:'Ngày'}, {key:'so_hoa_don',label:'Số hóa đơn'}, {key:'tong_tien',label:'Tổng tiền',render:r=>fmt(r.tong_tien)}, {key:'aq',label:'AQ'}, {key:'bp',label:'BP'}, {key:'bu',label:'BU'}, {key:'ly_do',label:'Lý do'}]); }
  function renderSaoke(rows){ return table(rows,[{key:'ngay_giao_dich',label:'Ngày'}, {key:'tham_chieu',label:'Tham chiếu'}, {key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)}, {key:'dien_giai',label:'Diễn giải'}, {key:'ly_do',label:'Lý do'}]); }
  function renderThongKe(rows){ return table(rows,[{key:'thang',label:'Tháng'}, {key:'tong_hd',label:'Tổng HĐ',render:r=>fmt(r.tong_hd||r.tong_hoa_don)}, {key:'tong_tien',label:'Tổng tiền',render:r=>fmt(r.tong_tien)}, {key:'da_khop',label:'Đã khớp',render:r=>fmt(r.da_khop)}, {key:'tien_da_khop',label:'Tiền đã khớp',render:r=>fmt(r.tien_da_khop)}, {key:'chua_khop',label:'Chưa khớp',render:r=>fmt(r.chua_khop)}, {key:'tien_chua_khop',label:'Tiền chưa khớp',render:r=>fmt(r.tien_chua_khop)}]); }

  async function saveSupabase(){
    if(!lastResult){ msg($('#runMessage'),'Chưa có kết quả để lưu',false); return; }
    try{
      msg($('#runMessage'),'Đang lưu Supabase...');
      const runDate=$('#runDate').value || new Date().toISOString().slice(0,10);
      const payload={ngay_doisoat:runDate, diem_id:null, nguoi_thuc_hien:'CN10', ghi_chu:'', file_name:lastFileName, source_mode:'workbook', created_by:'web', ...lastResult.summary};
      const {data:dot,error}=await supa.from('dot_doisoat').insert(payload).select('id').single(); if(error) throw error;
      const dotId=dot.id;
      const addDot=(x)=>({...x,dot_id:dotId,diem_id:null});
      await insertChunks('ketqua_doisoat', lastResult.ketqua.map(addDot));
      await insertChunks('hoa_don_chua_khop', lastResult.hoaDonChuaKhop.map(addDot));
      await insertChunks('saoke_chua_nhan_dien', lastResult.saokeChuaNhanDien.map(addDot));
      await insertChunks('thongke_sinvoice', lastResult.thongke.map(x=>({...x,dot_id:dotId})));
      msg($('#runMessage'),`Đã lưu Supabase. Mã lần chạy: ${dotId}`); $('#saveBtn').disabled=true; await loadDashboard();
    }catch(e){ console.error(e); msg($('#runMessage'),e.message,false); }
  }
  async function insertChunks(tableName, rows){
    if(!rows || rows.length===0) return;
    for(let i=0;i<rows.length;i+=500){ const {error}=await supa.from(tableName).insert(rows.slice(i,i+500)); if(error) throw error; }
  }

  $('#lookupBtn').addEventListener('click', lookup);
  $('#lookupInput').addEventListener('keydown',e=>{if(e.key==='Enter') lookup();});
  async function lookup(){
    const raw=$('#lookupInput').value.trim(); if(!raw){ $('#lookupResult').innerHTML='<p class="empty-note">Nhập mã hồ sơ cần tìm.</p>'; return; }
    const ma=window.CN10_ENGINE.cleanCode(raw);
    const {data,error}=await supa.from('ketqua_doisoat').select('*, dot_doisoat(ngay_doisoat,file_name)').eq('ma_hoso_sach',ma).order('id',{ascending:false}).limit(200);
    if(error){ $('#lookupResult').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#lookupResult').innerHTML=table(data||[],[{key:'ma_hoso_goc',label:'Mã hồ sơ'}, {key:'ngay_thu',label:'Ngày thu'}, {key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)}, {key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)}, {key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)}, {key:'trang_thai',label:'Trạng thái'}, {key:'tham_chieu_bidv',label:'Tham chiếu'}, {key:'so_hoa_don',label:'Số HĐ'}, {key:'dot_id',label:'Lần chạy'}]);
  }

  $('#journalSaveBtn').addEventListener('click', async()=>{
    const row={loai:$('#journalType').value, tham_chieu:$('#journalRef').value.trim(), ma_hoso:$('#journalMa').value.trim(), ghi_chu:$('#journalNote').value.trim(), created_by:'web'};
    if(!row.tham_chieu || !row.ma_hoso){ msg($('#journalMessage'),'Cần nhập tham chiếu và mã hồ sơ',false); return; }
    const {error}=await supa.from('nhatky_xuly').insert(row); if(error){ msg($('#journalMessage'),error.message,false); return; }
    msg($('#journalMessage'),'Đã lưu nhật ký xử lý'); $('#journalRef').value=''; $('#journalMa').value=''; $('#journalNote').value=''; loadJournal();
  });
  async function loadJournal(){
    const {data,error}=await supa.from('nhatky_xuly').select('*').order('id',{ascending:false}).limit(300);
    if(error){ $('#journalTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#journalTable').innerHTML=table(data||[],[{key:'loai',label:'Loại'}, {key:'tham_chieu',label:'Tham chiếu'}, {key:'ma_hoso',label:'Mã hồ sơ'}, {key:'ghi_chu',label:'Ghi chú'}, {key:'created_at',label:'Ngày tạo'}]);
  }
  async function loadDiem(){
    const {data,error}=await supa.from('diem').select('*').order('thu_tu'); if(error){ $('#diemTable').innerHTML=`<p class="empty-note">${escapeHtml(error.message)}</p>`; return; }
    $('#diemTable').innerHTML=table(data||[],[{key:'ma_diem',label:'Mã điểm'}, {key:'ten_diem',label:'Tên điểm'}, {key:'thu_tu',label:'Thứ tự'}, {key:'active',label:'Hoạt động'}]);
  }

  async function exportRun(id){ if(window._currentRunData) exportData({ketqua:window._currentRunData.ketqua, hoaDonChuaKhop:window._currentRunData.hd, saokeChuaNhanDien:window._currentRunData.saoke, thongke:window._currentRunData.thongke}, `doi_soat_lan_${id}.xlsx`); }
  function exportData(data, name='ket_qua_doi_soat_cn10.xlsx'){
    if(!data) return;
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.ketqua||[]), 'KetQua');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.hoaDonChuaKhop||[]), 'HoaDon_ChuaKhop');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.saokeChuaNhanDien||[]), 'Saoke_ChuaNhanDien');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.thongke||[]), 'ThongKe_SInvoice');
    XLSX.writeFile(wb, name);
  }
  window.CN10_APP={openRun, exportRun};
  checkConnection(); loadDashboard();
})();
