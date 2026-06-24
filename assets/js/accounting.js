(function(){
  const $=(s)=>document.querySelector(s);
  const fmt=(n)=>Number(n||0).toLocaleString('vi-VN');
  const supa=window.supabase.createClient(window.CN10_CONFIG.SUPABASE_URL, window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY);
  let profile=null, accRows=[];

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function table(rows,cols,empty='Không có dữ liệu'){
    if(!rows||!rows.length)return `<p class="empty-note">${empty}</p>`;
    return `<table class="data-table"><thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):esc(r[c.key]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function statusLabel(s){return ({
    DU_DIEU_KIEN_HACH_TOAN:'Đủ điều kiện hạch toán', DA_HACH_TOAN:'Đã hạch toán', CHO_TIEN_VE:'Chờ tiền về', CHO_HOA_DON:'Chờ hóa đơn', CHO_NHAN_DIEN:'Chờ nhận diện', CHO_XU_LY:'Chờ xử lý'
  })[s]||s||''}
  function msg(el,text,ok=true){if(!el)return;el.textContent=text||'';el.className='message '+(ok?'ok':'err')}
  function monthRange(ym){const val=ym||new Date().toISOString().slice(0,7); const start=val+'-01'; const d=new Date(start+'T00:00:00'); d.setMonth(d.getMonth()+1); return {label:val,start,end:d.toISOString().slice(0,10)}}
  async function getProfile(){
    const {data:{session}}=await supa.auth.getSession();
    const email=session?.user?.email?.toLowerCase(); if(!email){profile=null; return null}
    const {data}=await supa.from('users_app').select('*').ilike('email',email).limit(1);
    profile=data&&data[0]?data[0]:{email, vai_tro:'guest'}; return profile;
  }
  function canAll(){return profile && ['admin','ketoan','lanhdao'].includes(profile.vai_tro)}
  function canWrite(){return profile && ['admin','ketoan','diem'].includes(profile.vai_tro)}
  function currentDiem(){return profile?.diem_id||null}
  function selected(sel){const v=$(sel)?.value; return (!v||v==='all')?null:Number(v)}
  function scope(q,sel){if(profile?.vai_tro==='diem'&&profile.diem_id)return q.eq('diem_id',profile.diem_id); const d=selected(sel); if(canAll()&&d)return q.eq('diem_id',d); return q}
  async function loadDiemSelects(){
    const {data}=await supa.from('diem').select('*').order('thu_tu',{ascending:true});
    const all='<option value="all">Toàn chi nhánh</option>'+ (data||[]).map(d=>`<option value="${d.id}">${esc(d.ten_diem)}</option>`).join('');
    ['#accDiem','#bankDiem','#closeDiem'].forEach(s=>{const el=$(s); if(el)el.innerHTML=all});
    if(profile?.diem_id){['#accDiem','#bankDiem','#closeDiem'].forEach(s=>{const el=$(s); if(el){el.value=profile.diem_id; el.disabled=true}})}
  }
  function computeStatus(r){
    const th=Number(r.thuphi||0), b=Number(r.bidv||0), inv=Number(r.sinvoice||0);
    if(th>0 && th===b && th===inv) return 'DU_DIEU_KIEN_HACH_TOAN';
    if(th>0 && b===0) return 'CHO_TIEN_VE';
    if(th>0 && b===th && inv===0) return 'CHO_HOA_DON';
    if(th===0 && (b>0 || inv>0)) return 'CHO_NHAN_DIEN';
    return 'CHO_XU_LY';
  }
  async function upsertAccounting(rows){
    if(!rows.length)return;
    const payload=rows.map(r=>{
      const st=computeStatus(r);
      return {dot_id:r.dot_id, diem_id:r.diem_id, ma_hoso_goc:r.ma_hoso_goc, ma_hoso_sach:r.ma_hoso_sach, thuphi:r.thuphi||0, bidv:r.bidv||0, sinvoice:r.sinvoice||0, bidv_ref:r.tham_chieu_bidv||'', so_hoa_don:r.so_hoa_don||'', thu_phi_status:Number(r.thuphi||0)>0?'OK':'MISSING', bidv_status:Number(r.bidv||0)>0?'OK':'MISSING', invoice_status:Number(r.sinvoice||0)>0?'OK':'MISSING', accounting_status:st, updated_at:new Date().toISOString()}
    });
    for(let i=0;i<payload.length;i+=500){await supa.from('accounting_status').upsert(payload.slice(i,i+500),{onConflict:'dot_id,ma_hoso_sach'});}
  }
  async function loadAccounting(){
    await getProfile(); await loadDiemSelects();
    const ym=$('#accMonth')?.value||new Date().toISOString().slice(0,7); const {start,end}=monthRange(ym);
    let q=supa.from('ketqua_doisoat').select('*, dot_doisoat!inner(ngay_doisoat)').gte('dot_doisoat.ngay_doisoat',start).lt('dot_doisoat.ngay_doisoat',end).limit(50000);
    q=scope(q,'#accDiem');
    const {data,error}=await q;
    if(error){$('#accTable').innerHTML=`<p class="empty-note">${esc(error.message)}</p>`;return}
    await upsertAccounting(data||[]);
    let q2=supa.from('accounting_status').select('*').order('id',{ascending:false}).limit(50000);
    q2=scope(q2,'#accDiem');
    const st=$('#accStatus')?.value||'all'; if(st!=='all')q2=q2.eq('accounting_status',st);
    const {data:rows,error:e2}=await q2;
    if(e2){$('#accTable').innerHTML=`<p class="empty-note">${esc(e2.message)}</p>`;return}
    accRows=rows||[];
    const sum=(status)=>accRows.filter(x=>x.accounting_status===status).length;
    $('#accKpis').innerHTML=`<div class="kpi-card ok"><span>Đủ ĐK hạch toán</span><strong>${fmt(sum('DU_DIEU_KIEN_HACH_TOAN'))}</strong></div><div class="kpi-card"><span>Đã hạch toán</span><strong>${fmt(sum('DA_HACH_TOAN'))}</strong></div><div class="kpi-card warn"><span>Chờ hóa đơn</span><strong>${fmt(sum('CHO_HOA_DON'))}</strong></div><div class="kpi-card danger"><span>Chờ xử lý</span><strong>${fmt(sum('CHO_XU_LY')+sum('CHO_NHAN_DIEN')+sum('CHO_TIEN_VE'))}</strong></div>`;
    $('#accTable').innerHTML=table(accRows,[{key:'pick',label:'Chọn',render:r=>`<input type="checkbox" class="acc-pick" value="${r.id}" ${r.accounting_status==='DU_DIEU_KIEN_HACH_TOAN'?'':'disabled'}>`},{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)},{key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)},{key:'sinvoice',label:'Hóa đơn',render:r=>fmt(r.sinvoice)},{key:'accounting_status',label:'Trạng thái hạch toán',render:r=>statusLabel(r.accounting_status)},{key:'bidv_ref',label:'Tham chiếu'},{key:'so_hoa_don',label:'Số HĐ'}]);
  }
  async function markAccounted(){
    if(!canWrite()){msg($('#accMessage'),'Bạn cần đăng nhập tài khoản được phân quyền.',false);return}
    const ids=Array.from(document.querySelectorAll('.acc-pick:checked')).map(x=>Number(x.value));
    if(!ids.length){msg($('#accMessage'),'Chọn các hồ sơ đủ điều kiện hạch toán trước.',false);return}
    const {error}=await supa.from('accounting_status').update({accounting_status:'DA_HACH_TOAN', accounting_date:new Date().toISOString().slice(0,10), nguoi_hach_toan:profile.email, updated_at:new Date().toISOString()}).in('id',ids);
    if(error){msg($('#accMessage'),error.message,false);return}
    msg($('#accMessage'),`Đã đánh dấu hạch toán ${ids.length} hồ sơ.`); loadAccounting();
  }
  async function syncBank(){
    await getProfile();
    let q=supa.from('saoke_chua_nhan_dien').select('*').limit(50000); q=scope(q,'#bankDiem');
    const {data,error}=await q; if(error){msg($('#bankMessage'),error.message,false);return}
    const rows=(data||[]).map(x=>{const key=[x.tham_chieu||'',x.so_tien||0,x.ngay_giao_dich||'',x.dot_id||''].join('|'); return {dot_id:x.dot_id,diem_id:x.diem_id,ngay_giao_dich:x.ngay_giao_dich,so_tien:x.so_tien||0,dien_giai:x.dien_giai,tham_chieu:x.tham_chieu,trang_thai:'pending',created_by:profile?.email||'web',dedup_key:key};});
    for(let i=0;i<rows.length;i+=500){await supa.from('bank_unidentified').upsert(rows.slice(i,i+500),{onConflict:'dedup_key'});}
    msg($('#bankMessage'),`Đã đồng bộ ${rows.length} dòng từ sao kê chưa nhận diện.`); loadBank();
  }
  async function loadBank(){
    await getProfile(); await loadDiemSelects();
    let q=supa.from('bank_unidentified').select('*').order('id',{ascending:false}).limit(5000); q=scope(q,'#bankDiem');
    const st=$('#bankStatus')?.value||'pending'; if(st!=='all')q=q.eq('trang_thai',st);
    const {data,error}=await q; if(error){$('#bankTable').innerHTML=`<p class="empty-note">${esc(error.message)}</p>`;return}
    let rows=data||[]; const kw=$('#bankKeyword')?.value?.trim().toLowerCase(); if(kw)rows=rows.filter(r=>String(r.tham_chieu||'').toLowerCase().includes(kw)||String(r.dien_giai||'').toLowerCase().includes(kw)||String(r.so_tien||'').includes(kw));
    const total=rows.reduce((s,x)=>s+Number(x.so_tien||0),0);
    $('#bankKpis').innerHTML=`<div class="kpi-card warn"><span>Giao dịch</span><strong>${fmt(rows.length)}</strong></div><div class="kpi-card danger"><span>Tiền chưa xác định</span><strong>${fmt(total)}</strong></div>`;
    $('#bankTable').innerHTML=table(rows,[{key:'ngay_giao_dich',label:'Ngày'},{key:'tham_chieu',label:'Tham chiếu'},{key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)},{key:'dien_giai',label:'Diễn giải'},{key:'trang_thai',label:'Trạng thái'},{key:'act',label:'Xử lý',render:r=>`<button class="mini-btn" onclick="CN10_ACC.identifyBank(${r.id})">Gắn mã</button> <button class="mini-btn danger-mini" onclick="CN10_ACC.ignoreBank(${r.id})">Không thuộc kỳ</button>`}]);
  }
  async function identifyBank(id){const ma=prompt('Nhập mã hồ sơ xác định cho giao dịch này:'); if(!ma)return; const {error}=await supa.from('bank_unidentified').update({trang_thai:'identified',ma_hoso_gan:ma,updated_at:new Date().toISOString()}).eq('id',id); if(error)alert(error.message); else loadBank()}
  async function ignoreBank(id){const note=prompt('Lý do bỏ qua/không thuộc kỳ:', 'Không thuộc kỳ đối soát'); const {error}=await supa.from('bank_unidentified').update({trang_thai:'ignored',ghi_chu:note||'',updated_at:new Date().toISOString()}).eq('id',id); if(error)alert(error.message); else loadBank()}
  async function checkClose(){
    await getProfile(); await loadDiemSelects();
    const ym=$('#closeMonth')?.value||new Date().toISOString().slice(0,7); const {start,end}=monthRange(ym);
    let bq=supa.from('bank_unidentified').select('*').eq('trang_thai','pending').limit(5000); bq=scope(bq,'#closeDiem');
    let aq=supa.from('accounting_status').select('*').neq('accounting_status','DA_HACH_TOAN').limit(50000); aq=scope(aq,'#closeDiem');
    const [b,a]=await Promise.all([bq,aq]);
    const pendingBank=b.data||[], pendingAcc=(a.data||[]).filter(x=>['CHO_XU_LY','CHO_NHAN_DIEN','CHO_TIEN_VE','CHO_HOA_DON'].includes(x.accounting_status));
    const canClose=pendingBank.length===0 && pendingAcc.length===0;
    $('#closeResult').innerHTML=`<div class="kpi-grid compact"><div class="kpi-card ${pendingBank.length?'danger':'ok'}"><span>Tiền chưa xác định</span><strong>${fmt(pendingBank.length)}</strong></div><div class="kpi-card ${pendingAcc.length?'danger':'ok'}"><span>Hồ sơ còn vướng</span><strong>${fmt(pendingAcc.length)}</strong></div><div class="kpi-card ${canClose?'ok':'warn'}"><span>Điều kiện chốt</span><strong>${canClose?'ĐẠT':'CHƯA ĐẠT'}</strong></div></div>`;
    return {canClose,pendingBank,pendingAcc,ym};
  }
  async function closeMonth(){
    if(!canWrite()){msg($('#closeMessage'),'Bạn cần đăng nhập tài khoản được phân quyền.',false);return}
    const rs=await checkClose(); if(!rs.canClose){msg($('#closeMessage'),'Chưa đủ điều kiện chốt tháng. Cần xử lý hết tiền chưa xác định và hồ sơ còn vướng.',false);return}
    const diem=selected('#closeDiem')||currentDiem(); if(!diem){msg($('#closeMessage'),'Chọn điểm cần chốt tháng.',false);return}
    const {error}=await supa.from('accounting_month_close').upsert({thang:rs.ym,diem_id:diem,trang_thai:'closed',closed_by:profile.email,closed_at:new Date().toISOString()},{onConflict:'thang,diem_id'});
    if(error){msg($('#closeMessage'),error.message,false);return}
    msg($('#closeMessage'),'Đã chốt tháng hạch toán.');
  }
  function bind(){
    if($('#accMonth'))$('#accMonth').value=new Date().toISOString().slice(0,7); if($('#closeMonth'))$('#closeMonth').value=new Date().toISOString().slice(0,7);
    $('#accLoadBtn')?.addEventListener('click',loadAccounting); $('#accMarkBtn')?.addEventListener('click',markAccounted); ['#accDiem','#accMonth','#accStatus'].forEach(s=>$(s)?.addEventListener('change',loadAccounting));
    $('#bankLoadBtn')?.addEventListener('click',loadBank); $('#bankSyncBtn')?.addEventListener('click',syncBank); ['#bankDiem','#bankStatus'].forEach(s=>$(s)?.addEventListener('change',loadBank)); $('#bankKeyword')?.addEventListener('input',()=>setTimeout(loadBank,100));
    $('#closeCheckBtn')?.addEventListener('click',checkClose); $('#closeMonthBtn')?.addEventListener('click',closeMonth); ['#closeDiem','#closeMonth'].forEach(s=>$(s)?.addEventListener('change',checkClose));
    document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{setTimeout(()=>{if(b.dataset.view==='accounting')loadAccounting(); if(b.dataset.view==='unidentified')loadBank(); if(b.dataset.view==='monthclose')checkClose();},250)}));
  }
  window.CN10_ACC={loadAccounting,loadBank,syncBank,identifyBank,ignoreBank,checkClose,closeMonth};
  document.addEventListener('DOMContentLoaded',async()=>{await getProfile(); await loadDiemSelects(); bind();});
})();
