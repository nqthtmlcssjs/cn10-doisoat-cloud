(function(){
  const $=s=>document.querySelector(s); const $$=s=>Array.from(document.querySelectorAll(s));
  const supa=window.supabase.createClient(window.CN10_CONFIG.SUPABASE_URL, window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY);
  const fmt=n=>Number(n||0).toLocaleString('vi-VN');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const msg=(el,t,ok=true)=>{ if(!el)return; el.textContent=t||''; el.className='msg '+(ok?'good':'bad'); };
  let user=null, profile=null, diemList=[], currentPreview=null, importedData=null;

  function clean(v){return String(v??'').replace(/\./g,'').replace(/-/g,'').replace(/\s/g,'').replace(/\+/g,'').replace(/\u00A0/g,'').trim().toUpperCase();}
  function money(v){ if(v==null||v==='')return 0; if(typeof v==='number'&&isFinite(v))return v; const n=Number(String(v).replace(/\./g,'').replace(/,/g,'').trim()); return isFinite(n)?n:0; }
  function textDate(v){ if(v instanceof Date&&!isNaN(v))return v.toLocaleDateString('vi-VN'); if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v); if(d)return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;} return String(v??'').slice(0,10);}
  function cell(r,i){return r&&r[i]!==undefined?r[i]:'';}
  function rows(wb,name){ const ws=wb.Sheets[name]||wb.Sheets[wb.SheetNames[0]]; if(!ws)throw new Error('Không đọc được sheet '+name); return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''}); }
  function table(data,cols,empty='Không có dữ liệu'){ if(!data||!data.length)return `<p>${empty}</p>`; return `<table class="table"><thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${data.map(r=>`<tr>${cols.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
  async function sha256(file){ const buf=await file.arrayBuffer(); const h=await crypto.subtle.digest('SHA-256',buf); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); }

  $$('.nav button').forEach(b=>b.onclick=()=>show(b.dataset.view));
  function show(id){ $$('.view').forEach(v=>v.classList.remove('active')); $('#'+id).classList.add('active'); $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); if(id==='dashboard')loadDashboard(); if(id==='session')loadSessions(); if(id==='upload')loadSessionOptions(); if(id==='result')loadResultOptions(); if(id==='tasks')loadTasks(); if(id==='cash')loadCash(); if(id==='cases')loadCases(); if(id==='admin')loadAdmin(); }

  async function init(){
    $('#sessionDate').valueAsDate=new Date();
    await initAuth(); await loadDiem(); await checkDb(); await loadDashboard(); bind();
  }
  async function checkDb(){ const {error}=await supa.from('system_version').select('*').limit(1); $('#dbStatus').textContent=error?'Supabase lỗi':'Supabase OK'; if(error)console.error(error); }
  async function initAuth(){ const {data:{session}}=await supa.auth.getSession(); user=session?.user||null; if(user){ const email=user.email.toLowerCase(); const {data}=await supa.from('users_app').select('*').ilike('email',email).limit(1); profile=data&&data[0]?data[0]:{email,vai_tro:'guest'}; $('#userBadge').textContent=`${profile.ho_ten||email} · ${profile.vai_tro}`; $('#loginEmail').classList.add('hidden'); $('#loginPassword').classList.add('hidden'); $('#loginBtn').classList.add('hidden'); $('#logoutBtn').classList.remove('hidden'); } else { profile=null; $('#userBadge').textContent='Chưa đăng nhập'; }}
  async function login(){ const email=$('#loginEmail').value.trim(), password=$('#loginPassword').value; if(!email||!password){alert('Nhập email và mật khẩu');return;} const {error}=await supa.auth.signInWithPassword({email,password}); if(error){alert(error.message);return;} await initAuth(); await loadDashboard(); }
  async function logout(){ await supa.auth.signOut(); location.reload(); }

  async function loadDiem(){ const {data,error}=await supa.from('diem').select('*').eq('active',true).order('thu_tu'); if(error){console.error(error);return;} diemList=data||[]; const opt='<option value="">Chọn điểm</option>'+diemList.map(d=>`<option value="${d.id}">${esc(d.ten_diem)}</option>`).join(''); $('#sessionDiem').innerHTML=opt; }
  async function loadSessionOptions(){ const {data}=await supa.from('doisoat_session').select('id,ma_phien,ngay_doi_soat,diem(ten_diem)').order('id',{ascending:false}).limit(100); const opt='<option value="">Chọn phiên</option>'+((data||[]).map(s=>`<option value="${s.id}">${esc(s.ma_phien)} · ${esc(s.diem?.ten_diem||'')}</option>`).join('')); $('#uploadSession').innerHTML=opt; }
  async function loadResultOptions(){ const {data}=await supa.from('doisoat_session').select('id,ma_phien,diem(ten_diem)').order('id',{ascending:false}).limit(100); const opt='<option value="">Chọn phiên</option>'+((data||[]).map(s=>`<option value="${s.id}">${esc(s.ma_phien)} · ${esc(s.diem?.ten_diem||'')}</option>`).join('')); $('#resultSession').innerHTML=opt; if((data||[])[0]){$('#resultSession').value=data[0].id; loadResults();} }

  function bind(){
    $('#loginBtn').onclick=login; $('#logoutBtn').onclick=logout;
    $('#createSessionBtn').onclick=createSession; $('#loadSessionsBtn').onclick=loadSessions;
    $('#uploadMode').onchange=()=>{ const sep=$('#uploadMode').value==='separate'; $('#uploadSeparateBox').classList.toggle('hidden',!sep); $('#uploadWorkbookBox').classList.toggle('hidden',sep); currentPreview=null; $('#importBtn').disabled=true; $('#runEngineBtn').disabled=true; $('#previewBox').innerHTML=''; };
    [['#fileWorkbook','#nameWorkbook'],['#fileFee','#nameFee'],['#fileBank','#nameBank'],['#fileInvoice','#nameInvoice']].forEach(([i,n])=>$(i).onchange=e=>{$(n).textContent=e.target.files[0]?.name||'Chưa chọn';});
    $('#previewBtn').onclick=previewFiles; $('#importBtn').onclick=importRaw; $('#runEngineBtn').onclick=runEngine;
    $('#resultSession').onchange=loadResults; $('#caseKeyword').oninput=()=>loadCases();
  }

  async function createSession(){
    if(!user){msg($('#sessionMsg'),'Cần đăng nhập để tạo phiên',false);return;}
    const diem_id=Number($('#sessionDiem').value), date=$('#sessionDate').value, note=$('#sessionNote').value.trim();
    if(!diem_id||!date){msg($('#sessionMsg'),'Chọn điểm và ngày đối soát',false);return;}
    const d=diemList.find(x=>x.id===diem_id); const ma=`DS-${date.replaceAll('-','')}-${d.ma_diem}-${Date.now().toString().slice(-4)}`;
    const {error}=await supa.from('doisoat_session').insert({ma_phien:ma,diem_id,ngay_doi_soat:date,ghi_chu:note,created_by:profile?.email||user.email,trang_thai:'draft'});
    if(error){msg($('#sessionMsg'),error.message,false);return;} msg($('#sessionMsg'),'Đã tạo phiên '+ma); await loadSessions(); await loadSessionOptions();
  }
  async function loadSessions(){ const {data,error}=await supa.from('doisoat_session').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(200); if(error){$('#sessionTable').innerHTML=error.message;return;} $('#sessionTable').innerHTML=table(data,[{key:'ma_phien',label:'Mã phiên'},{key:'ngay_doi_soat',label:'Ngày'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'trang_thai',label:'Trạng thái'},{key:'created_by',label:'Người tạo'}]); }

  async function readWb(file){ const buf=await file.arrayBuffer(); return XLSX.read(buf,{type:'array',cellDates:true}); }
  async function previewFiles(){
    try{
      const sessionId=Number($('#uploadSession').value); if(!sessionId)throw new Error('Chọn phiên trước');
      const mode=$('#uploadMode').value; let files={};
      if(mode==='workbook'){ const f=$('#fileWorkbook').files[0]; if(!f)throw new Error('Chọn file tổng hợp'); const wb=await readWb(f); files.workbook={file:f, wb}; }
      else { const f1=$('#fileFee').files[0], f2=$('#fileBank').files[0], f3=$('#fileInvoice').files[0]; if(!f1||!f2||!f3)throw new Error('Chọn đủ 3 file'); files.fee={file:f1,wb:await readWb(f1)}; files.bank={file:f2,wb:await readWb(f2)}; files.invoice={file:f3,wb:await readWb(f3)}; }
      currentPreview=parseAll(files,mode); currentPreview.sessionId=sessionId; currentPreview.files=files; $('#previewBox').innerHTML=renderPreview(currentPreview); $('#importBtn').disabled=false; $('#runEngineBtn').disabled=true; msg($('#uploadMsg'),'Preview đạt. Bấm Import raw để lưu dữ liệu.',true);
    }catch(e){console.error(e); msg($('#uploadMsg'),e.message,false);}
  }
  function parseAll(files,mode){ let feeRows,bankRows,invRows, fileMeta=[]; if(mode==='workbook'){ const wb=files.workbook.wb; feeRows=rows(wb,'dscanbothuphi'); bankRows=rows(wb,'saoke'); invRows=rows(wb,'sinvoid'); fileMeta.push({type:'workbook',file:files.workbook.file}); }
    else { feeRows=rows(files.fee.wb,'dscanbothuphi'); bankRows=rows(files.bank.wb,'saoke'); invRows=rows(files.invoice.wb,'sinvoid'); fileMeta=[{type:'thuphi',file:files.fee.file},{type:'bidv',file:files.bank.file},{type:'sinvoice',file:files.invoice.file}]; }
    const fee=parseFee(feeRows); const bank=parseBank(bankRows); const inv=parseInvoice(invRows); return {fee,bank,inv,fileMeta}; }
  function parseFee(r){ const out=[]; for(let i=6;i<r.length;i++){ const ma=cell(r[i],4); const ms=clean(ma); if(!ms)continue; out.push({ma_hoso_goc:ma,ma_hoso_sach:ms,ngay_thu:textDate(cell(r[i],5)),so_tien:money(cell(r[i],9)),don_vi:cell(r[i],1),raw_data:{row:i+1}}); } return out; }
  function parseBank(r){ const out=[]; for(let i=18;i<r.length;i++){ const st=money(cell(r[i],6))-money(cell(r[i],5)); const ref=String(cell(r[i],15)||'').trim(); const dg=String(cell(r[i],11)||''); if(ref||dg||st) out.push({ngay_giao_dich:textDate(cell(r[i],0)),tham_chieu:ref,dien_giai:dg,so_tien:st,raw_data:{row:i+1}}); } return out; }
  function parseInvoice(r){ const out=[]; for(let i=8;i<r.length;i++){ const so=String(cell(r[i],3)||'').trim(); if(!so)continue; out.push({ngay_hoa_don:textDate(cell(r[i],4)),so_hoa_don:so,tong_tien:money(cell(r[i],32)),aq:String(cell(r[i],42)||''),bp:String(cell(r[i],67)||''),bu:String(cell(r[i],72)||''),raw_data:{row:i+1}}); } return out; }
  function renderPreview(p){ const rows=[{loai:'Thu phí',dong:p.fee.length,tien:p.fee.reduce((s,x)=>s+x.so_tien,0)},{loai:'BIDV',dong:p.bank.length,tien:p.bank.reduce((s,x)=>s+x.so_tien,0)},{loai:'SInvoice',dong:p.inv.length,tien:p.inv.reduce((s,x)=>s+x.tong_tien,0)}]; return table(rows,[{key:'loai',label:'Nguồn'},{key:'dong',label:'Số dòng',render:r=>fmt(r.dong)},{key:'tien',label:'Tổng tiền',render:r=>fmt(r.tien)}]); }

  async function importRaw(){
    try{ if(!currentPreview)throw new Error('Chưa preview'); const sessionId=currentPreview.sessionId; const {data:sess,error:se}=await supa.from('doisoat_session').select('*,diem(*)').eq('id',sessionId).single(); if(se)throw se; const diem_id=sess.diem_id;
      const sourceIds={}; for(const fm of currentPreview.fileMeta){ const hash=await sha256(fm.file); const sig=`${diem_id}|${sess.ngay_doi_soat}|${fm.type}|${hash}`; const payload={session_id:sessionId,loai_file:fm.type,file_name:fm.file.name,file_hash:hash,file_signature:sig,file_size:fm.file.size,row_count:0,uploaded_by:profile?.email||user?.email||'web'}; const {data,error}=await supa.from('doisoat_file').insert(payload).select('id').single(); if(error&&String(error.message).includes('duplicate')) throw new Error('File đã upload trùng: '+fm.file.name); if(error)throw error; sourceIds[fm.type]=data.id; await supa.from('file_repository').insert({session_id:sessionId,diem_id,loai_file:fm.type,file_name:fm.file.name,file_hash:hash,file_signature:sig,file_size:fm.file.size,uploaded_by:payload.uploaded_by}); }
      await insertChunks('fee_raw', currentPreview.fee.map(x=>({...x,session_id:sessionId,diem_id,source_file_id:sourceIds.thuphi||sourceIds.workbook})));
      await insertChunks('bank_raw', currentPreview.bank.map(x=>({...x,session_id:sessionId,diem_id,source_file_id:sourceIds.bidv||sourceIds.workbook})));
      await insertChunks('invoice_raw', currentPreview.inv.map(x=>({...x,session_id:sessionId,diem_id,source_file_id:sourceIds.sinvoice||sourceIds.workbook})));
      await supa.from('doisoat_session').update({trang_thai:'uploaded'}).eq('id',sessionId); importedData={sessionId,diem_id}; $('#runEngineBtn').disabled=false; $('#importBtn').disabled=true; msg($('#uploadMsg'),'Đã import raw. Có thể chạy engine.',true);
    }catch(e){console.error(e); msg($('#uploadMsg'),e.message,false);} }
  async function insertChunks(tbl,arr){ for(let i=0;i<arr.length;i+=500){ const {error}=await supa.from(tbl).insert(arr.slice(i,i+500)); if(error)throw error; } }

  function findUnique(text,lengths,dict){ const nd=clean(text); let p=nd.indexOf('H26'), found='', count=0; while(p>=0){ for(const L of lengths){ const cand=nd.slice(p,p+L); if(dict[cand]!==undefined){ if(found!==cand){found=cand; count++;} break; } } if(count>1)return ''; p=nd.indexOf('H26',p+1); } return count===1?found:''; }
  function classify(r){ const th=Number(r.thuphi||0), b=Number(r.bidv||0), inv=Number(r.sinvoice||0); if(th===b&&th===inv)return {status:'Matched',loai:'OK'}; if(th&&b===0&&inv===0)return {status:'Needs Review',loai:'Thiếu BIDV + hóa đơn'}; if(th&&b===0)return {status:'Needs Review',loai:'Thiếu BIDV'}; if(th&&inv===0)return {status:'Needs Review',loai:'Thiếu hóa đơn'}; return {status:'Needs Review',loai:'Sai tiền'}; }
  async function runEngine(){
    try{ const sessionId=Number($('#uploadSession').value); if(!sessionId)throw new Error('Chọn phiên'); const {data:sess}=await supa.from('doisoat_session').select('*').eq('id',sessionId).single(); const diem_id=sess.diem_id;
      const [feeRes,bankRes,invRes]=await Promise.all([supa.from('fee_raw').select('*').eq('session_id',sessionId).limit(100000),supa.from('bank_raw').select('*').eq('session_id',sessionId).limit(100000),supa.from('invoice_raw').select('*').eq('session_id',sessionId).limit(100000)]);
      for(const r of [feeRes,bankRes,invRes]) if(r.error)throw r.error; const fee=feeRes.data||[], bank=bankRes.data||[], inv=invRes.data||[];
      const dict={}; fee.forEach(x=>{ if(!dict[x.ma_hoso_sach])dict[x.ma_hoso_sach]={goc:x.ma_hoso_goc,ngay:x.ngay_thu,don_vi:x.don_vi,thuphi:0,bidv:0,sinvoice:0,refs:[],hds:[]}; dict[x.ma_hoso_sach].thuphi+=Number(x.so_tien||0); });
      const lengths=[...new Set(Object.keys(dict).map(x=>x.length))].sort((a,b)=>b-a);
      const bankUn=[]; bank.forEach(x=>{ const ma=findUnique((x.dien_giai||'')+' '+(x.tham_chieu||''),lengths,dict); if(ma){ dict[ma].bidv+=Number(x.so_tien||0); if(x.tham_chieu)dict[ma].refs.push(x.tham_chieu); } else bankUn.push({...x}); });
      const invUn=[]; inv.forEach(x=>{ const ma=findUnique((x.aq||'')+(x.bp||'')+(x.bu||''),lengths,dict); if(ma){ dict[ma].sinvoice+=Number(x.tong_tien||0); if(x.so_hoa_don)dict[ma].hds.push(x.so_hoa_don); } else invUn.push({...x}); });
      await Promise.all(['doisoat_result','task_xuly','accounting_status','bank_unidentified','invoice_unidentified'].map(t=>supa.from(t).delete().eq('session_id',sessionId)));
      const results=Object.entries(dict).map(([ma,x])=>{ const c=classify(x); return {session_id:sessionId,diem_id,ma_hoso_goc:x.goc,ma_hoso_sach:ma,don_vi:x.don_vi,ngay_thu:x.ngay,thuphi:x.thuphi,bidv:x.bidv,sinvoice:x.sinvoice,trang_thai:c.status,loai_loi:c.loai,tham_chieu_bidv:[...new Set(x.refs)].join('; '),so_hoa_don:[...new Set(x.hds)].join('; ')}; });
      await insertChunks('doisoat_result',results);
      await insertChunks('bank_unidentified',bankUn.map(x=>({session_id:sessionId,diem_id,ngay_giao_dich:x.ngay_giao_dich,tham_chieu:x.tham_chieu,dien_giai:x.dien_giai,so_tien:x.so_tien})));
      await insertChunks('invoice_unidentified',invUn.map(x=>({session_id:sessionId,diem_id,ngay_hoa_don:x.ngay_hoa_don,so_hoa_don:x.so_hoa_don,tong_tien:x.tong_tien,aq:x.aq,bp:x.bp,bu:x.bu})));
      const tasks=results.filter(x=>x.trang_thai!=='Matched').map(x=>({session_id:sessionId,diem_id,ma_hoso:x.ma_hoso_sach,loai_loi:x.loai_loi,noi_dung:`${x.ma_hoso_goc||x.ma_hoso_sach}: ${x.loai_loi}`,huong_xu_ly:suggest(x.loai_loi),created_by:profile?.email||user?.email||'web'}));
      tasks.push(...bankUn.map(x=>({session_id:sessionId,diem_id,loai_loi:'Sao kê chưa nhận diện',noi_dung:`${x.tham_chieu||''} - ${fmt(x.so_tien)} - ${String(x.dien_giai||'').slice(0,80)}`,huong_xu_ly:'Kiểm tra diễn giải, nếu xác định đúng hồ sơ thì bổ sung nhật ký xử lý',created_by:profile?.email||user?.email||'web'})));
      tasks.push(...invUn.map(x=>({session_id:sessionId,diem_id,loai_loi:'Hóa đơn chưa nhận diện',noi_dung:`${x.so_hoa_don||''} - ${fmt(x.tong_tien)}`,huong_xu_ly:'Kiểm tra AQ/BP/BU, hóa đơn thay thế hoặc bổ sung mã hồ sơ',created_by:profile?.email||user?.email||'web'})));
      await insertChunks('task_xuly',tasks);
      await insertChunks('accounting_status',results.map(x=>({session_id:sessionId,diem_id,ma_hoso:x.ma_hoso_sach,thuphi_status:x.thuphi?'ok':'missing',bidv_status:x.bidv?'ok':'missing',invoice_status:x.sinvoice?'ok':'missing',accounting_status:x.trang_thai==='Matched'?'ready':'pending'})));
      for(const r of results){ const {data:cm,error}=await supa.from('case_master').upsert({ma_hoso_sach:r.ma_hoso_sach,ma_hoso_goc:r.ma_hoso_goc,diem_id,don_vi:r.don_vi,tong_thuphi:r.thuphi,tong_bidv:r.bidv,tong_sinvoice:r.sinvoice,thuphi_status:r.thuphi?'ok':'missing',bidv_status:r.bidv?'ok':'missing',invoice_status:r.sinvoice?'ok':'missing',accounting_status:r.trang_thai==='Matched'?'ready':'pending',trang_thai_tong:r.trang_thai,last_session_id:sessionId,updated_at:new Date().toISOString()},{onConflict:'ma_hoso_sach'}).select('id').single(); if(!error&&cm){ await supa.from('case_event').insert({case_id:cm.id,session_id:sessionId,event_type:'RECONCILE',event_source:'engine',amount:r.thuphi,ref_no:r.ma_hoso_sach,note:r.trang_thai}); } }
      await supa.from('workflow_history').insert({session_id:sessionId,action:'RUN_ENGINE',created_by:profile?.email||user?.email||'web',detail:{result:results.length,tasks:tasks.length,bank_unidentified:bankUn.length,invoice_unidentified:invUn.length}});
      await supa.from('doisoat_session').update({trang_thai:tasks.length?'review':'reconciled'}).eq('id',sessionId); msg($('#uploadMsg'),`Đã chạy engine: ${results.length} hồ sơ, cần xử lý ${tasks.length}.`,true); await loadDashboard(); show('result'); $('#resultSession').value=sessionId; await loadResults();
    }catch(e){console.error(e); msg($('#uploadMsg'),e.message,false);} }
  function suggest(loai){ if(loai.includes('BIDV'))return 'Kiểm tra sao kê, giao dịch về muộn hoặc sai diễn giải'; if(loai.includes('hóa đơn'))return 'Kiểm tra SInvoice, xuất bổ sung hoặc xử lý hóa đơn thay thế'; if(loai.includes('Sai tiền'))return 'Đối chiếu thu phí, BIDV và hóa đơn để xác định nguồn sai'; return 'Kiểm tra và cập nhật nhật ký xử lý'; }

  async function loadDashboard(){ const today=new Date().toISOString().slice(0,10); const [s,r,t]=await Promise.all([supa.from('doisoat_session').select('*').eq('ngay_doi_soat',today),supa.from('doisoat_result').select('*').limit(100000),supa.from('task_xuly').select('*').neq('trang_thai','done').limit(100000)]); $('#kpiSessions').textContent=s.data?.length||0; $('#kpiCases').textContent=r.data?.length||0; $('#kpiMatched').textContent=(r.data||[]).filter(x=>x.trang_thai==='Matched').length; $('#kpiReview').textContent=t.data?.length||0; const {data}=await supa.from('doisoat_session').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(10); $('#recentSessions').innerHTML=table(data,[{key:'ma_phien',label:'Mã phiên'},{key:'ngay_doi_soat',label:'Ngày'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'trang_thai',label:'Trạng thái'}]); }
  async function loadResults(){ const sid=Number($('#resultSession').value); if(!sid){$('#resultBox').innerHTML='<p>Chọn phiên</p>';return;} const {data,error}=await supa.from('doisoat_result').select('*').eq('session_id',sid).limit(100000); if(error){$('#resultBox').innerHTML=error.message;return;} $('#resultBox').innerHTML=table(data,[{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'thuphi',label:'Thu phí',render:r=>fmt(r.thuphi)},{key:'bidv',label:'BIDV',render:r=>fmt(r.bidv)},{key:'sinvoice',label:'SInvoice',render:r=>fmt(r.sinvoice)},{key:'trang_thai',label:'Trạng thái',render:r=>`<span class="pill ${r.trang_thai==='Matched'?'ok':'warn'}">${esc(r.trang_thai)}</span>`},{key:'loai_loi',label:'Loại lỗi'},{key:'tham_chieu_bidv',label:'Tham chiếu'},{key:'so_hoa_don',label:'Số HĐ'}]); }
  async function loadTasks(){ const {data}=await supa.from('task_xuly').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(500); $('#taskBox').innerHTML=table(data,[{key:'loai_loi',label:'Loại lỗi'},{key:'ma_hoso',label:'Mã hồ sơ'},{key:'noi_dung',label:'Nội dung'},{key:'huong_xu_ly',label:'Hướng xử lý'},{key:'trang_thai',label:'Trạng thái'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')}]); }
  async function loadCash(){ const {data}=await supa.from('bank_unidentified').select('*,diem(ten_diem)').order('id',{ascending:false}).limit(500); $('#cashBox').innerHTML=table(data,[{key:'ngay_giao_dich',label:'Ngày'},{key:'tham_chieu',label:'Tham chiếu'},{key:'so_tien',label:'Số tiền',render:r=>fmt(r.so_tien)},{key:'dien_giai',label:'Diễn giải'},{key:'trang_thai',label:'Trạng thái'}]); }
  async function loadCases(){ const kw=$('#caseKeyword').value.trim(); let q=supa.from('case_master').select('*,diem(ten_diem)').order('updated_at',{ascending:false}).limit(500); if(kw) q=q.ilike('ma_hoso_sach','%'+clean(kw)+'%'); const {data}=await q; $('#caseBox').innerHTML=table(data,[{key:'ma_hoso_goc',label:'Mã gốc'},{key:'ma_hoso_sach',label:'Mã sạch'},{key:'diem',label:'Điểm',render:r=>esc(r.diem?.ten_diem||'')},{key:'tong_thuphi',label:'Thu phí',render:r=>fmt(r.tong_thuphi)},{key:'tong_bidv',label:'BIDV',render:r=>fmt(r.tong_bidv)},{key:'tong_sinvoice',label:'SInvoice',render:r=>fmt(r.tong_sinvoice)},{key:'trang_thai_tong',label:'Trạng thái'}]); }
  async function loadAdmin(){ const [v,d,u]=await Promise.all([supa.from('system_version').select('*'),supa.from('diem').select('*').order('thu_tu'),supa.from('users_app').select('*').order('id')]); $('#adminBox').innerHTML='<h3>Version</h3>'+table(v.data,[{key:'version_code',label:'Version'},{key:'database_version',label:'Database'},{key:'frontend_version',label:'Frontend'},{key:'notes',label:'Ghi chú'}])+'<h3>Điểm</h3>'+table(d.data,[{key:'id',label:'ID'},{key:'ten_diem',label:'Tên điểm'},{key:'ma_diem',label:'Mã'}])+'<h3>Người dùng</h3>'+table(u.data,[{key:'email',label:'Email'},{key:'ho_ten',label:'Họ tên'},{key:'vai_tro',label:'Vai trò'},{key:'diem_id',label:'Điểm'}]); }
  window.APP={loadDashboard,loadResults,loadTasks,loadCash,loadCases,loadAdmin};
  init();
})();
