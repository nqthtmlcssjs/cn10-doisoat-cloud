window.CN10 = window.CN10 || {};
(function(){
  const {$,msg}=window.CN10.ui;
  const wf={workbook:null,result:null,fileName:'',valid:false,tab:'all'};
  async function readWorkbook(file){ const buf=await file.arrayBuffer(); return XLSX.read(buf,{type:'array',cellDates:true}); }
  function copySheet(dst, srcWb, names){
    for(const n of names){ if(srcWb.Sheets[n]){ dst.Sheets[n]=srcWb.Sheets[n]; if(!dst.SheetNames.includes(n)) dst.SheetNames.push(n); return n; } }
    return null;
  }
  async function buildWorkbookFromInputs(){
    const mode=document.querySelector('input[name="uploadMode"]:checked')?.value || 'one';
    if(mode==='one'){
      const f=$('#fileWorkbook').files[0]; if(!f) throw new Error('Chưa chọn file tổng hợp VBA');
      wf.fileName=f.name; return readWorkbook(f);
    }
    const fThu=$('#fileThuPhi').files[0], fBidv=$('#fileBIDV').files[0], fInv=$('#fileSInvoice').files[0];
    if(!fThu || !fBidv || !fInv) throw new Error('Cần chọn đủ 3 file: Thu phí, BIDV, SInvoice');
    wf.fileName=`${fThu.name} + ${fBidv.name} + ${fInv.name}`;
    const [wbThu,wbBidv,wbInv]=await Promise.all([readWorkbook(fThu),readWorkbook(fBidv),readWorkbook(fInv)]);
    const wb={SheetNames:[],Sheets:{}};
    copySheet(wb,wbThu,['Doisoat','doisoat','Đối soát']);
    copySheet(wb,wbThu,['dscanbothuphi','DS cán bộ thu phí','thu_phi','thuphi']);
    copySheet(wb,wbBidv,['saoke','Sao kê','BIDV','bidv']);
    copySheet(wb,wbInv,['sinvoid','sinvoice','SInvoice','S-Invoice']);
    if(wbThu.Sheets['nhatky_xuly']) copySheet(wb,wbThu,['nhatky_xuly']);
    return wb;
  }
  function validateWorkbook(wb){
    const need=['Doisoat','dscanbothuphi','saoke','sinvoid'];
    const rows=[]; let ok=true;
    for(const n of need){
      const exists=!!wb.Sheets[n]; if(!exists) ok=false;
      rows.push({name:n,ok:exists,text:exists?`✅ Có sheet ${n}`:`❌ Thiếu sheet ${n}`});
    }
    return {ok,rows};
  }
  function renderChecklist(v){
    $('#fileChecklist').innerHTML=v.rows.map(r=>`<div class="check-item ${r.ok?'ok':'err'}">${r.text}</div>`).join('');
  }
  function renderResult(tab='all'){
    const ui=window.CN10.ui; const r=wf.result;
    if(!r){ $('#resultTable').innerHTML='<p class="empty-note">Chưa có kết quả.</p>'; return; }
    let rows=r.ketqua;
    if(tab==='review') rows=rows.filter(x=>x.trang_thai!=='Matched');
    const cols=[{key:'don_vi',label:'Đơn vị'},{key:'ma_hoso_goc',label:'Mã hồ sơ'},{key:'ngay_thu',label:'Ngày'},{key:'thuphi',label:'Thu phí',render:x=>ui.fmt(x.thuphi)},{key:'bidv',label:'BIDV',render:x=>ui.fmt(x.bidv)},{key:'sinvoice',label:'SInvoice',render:x=>ui.fmt(x.sinvoice)},{key:'trang_thai',label:'Trạng thái',render:x=>`<span class="${x.trang_thai==='Matched'?'status-ok':'status-review'}">${ui.escapeHtml(x.trang_thai)}</span>`},{key:'tham_chieu_bidv',label:'Tham chiếu'},{key:'so_hoa_don',label:'Số HĐ'}];
    if(tab==='hd') $('#resultTable').innerHTML=ui.table(r.hoaDonChuaKhop,[{key:'ngay_hoa_don',label:'Ngày'},{key:'so_hoa_don',label:'Số HĐ'},{key:'tong_tien',label:'Tiền',render:x=>ui.fmt(x.tong_tien)},{key:'ly_do',label:'Lý do'}]);
    else if(tab==='sk') $('#resultTable').innerHTML=ui.table(r.saokeChuaNhanDien,[{key:'ngay_giao_dich',label:'Ngày'},{key:'tham_chieu',label:'Tham chiếu'},{key:'so_tien',label:'Số tiền',render:x=>ui.fmt(x.so_tien)},{key:'dien_giai',label:'Diễn giải'},{key:'ly_do',label:'Lý do'}]);
    else $('#resultTable').innerHTML=ui.table(rows,cols);
  }
  wf.validate = async function(){
    wf.workbook=await buildWorkbookFromInputs();
    const v=validateWorkbook(wf.workbook); wf.valid=v.ok; renderChecklist(v);
    $('#runReconcileBtn').disabled=!v.ok || !window.CN10.appState.currentSession;
    msg($('#runMessage'), v.ok?'File đạt mẫu. Có thể chạy đối soát.':'File chưa đạt mẫu, kiểm tra lại sheet.', v.ok);
    window.CN10.ui.updateSteps(v.ok?3:2);
  };
  wf.run = function(){
    if(!wf.valid || !wf.workbook) throw new Error('Chưa kiểm tra file đạt mẫu');
    wf.result=window.CN10_ENGINE.reconcileWorkbook(wf.workbook);
    renderResult('all');
    $('#saveResultBtn').disabled=false; $('#exportResultBtn').disabled=false;
    const s=wf.result.summary;
    msg($('#runMessage'),`Đã chạy: ${window.CN10.ui.fmt(s.tong_ho_so)} hồ sơ, khớp ${window.CN10.ui.fmt(s.so_khop)}, cần kiểm tra ${window.CN10.ui.fmt(s.so_lech)}.`, true);
    window.CN10.ui.updateSteps(4);
  };
  wf.export = function(){
    if(!wf.result) return;
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wf.result.ketqua||[]),'KetQua');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wf.result.hoaDonChuaKhop||[]),'HoaDon_ChuaKhop');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wf.result.saokeChuaNhanDien||[]),'Saoke_ChuaNhanDien');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wf.result.thongke||[]),'ThongKe');
    XLSX.writeFile(wb,'ket_qua_doi_soat_CN10_V14.xlsx');
  };
  wf.renderResult=renderResult;
  window.CN10.workflow=wf;
})();
