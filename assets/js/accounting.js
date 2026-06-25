window.CN10 = window.CN10 || {};
(function(){
  const supa=window.CN10.supa, ui=window.CN10.ui;
  async function loadAccounting(){
    const {data,error}=await supa.from('accounting_status').select('*').limit(500);
    if(error){ document.querySelector('#accountingTable').innerHTML='<p class="empty-note">'+ui.escapeHtml(error.message)+'</p>'; return; }
    const rows=data||[];
    document.querySelector('#accWaitingBank').textContent=ui.fmt(rows.filter(x=>x.accounting_status==='CHO_TIEN_VE').length);
    document.querySelector('#accWaitingInvoice').textContent=ui.fmt(rows.filter(x=>x.accounting_status==='CHO_HOA_DON').length);
    document.querySelector('#accReady').textContent=ui.fmt(rows.filter(x=>x.accounting_status==='DU_DIEU_KIEN_HACH_TOAN').length);
    document.querySelector('#accDone').textContent=ui.fmt(rows.filter(x=>x.accounting_status==='DA_HACH_TOAN').length);
    document.querySelector('#accountingTable').innerHTML=ui.table(rows,[{key:'ma_hoso',label:'Mã hồ sơ'},{key:'thu_phi_status',label:'Thu phí'},{key:'bidv_status',label:'BIDV'},{key:'invoice_status',label:'Hóa đơn'},{key:'accounting_status',label:'Hạch toán'},{key:'accounting_date',label:'Ngày HT'}]);
  }
  async function loadBank(){
    const {data,error}=await supa.from('bank_unidentified').select('*').order('id',{ascending:false}).limit(500);
    if(error){ document.querySelector('#bankTable').innerHTML='<p class="empty-note">'+ui.escapeHtml(error.message)+'</p>'; return; }
    document.querySelector('#bankTable').innerHTML=ui.table(data||[],[{key:'ngay_giao_dich',label:'Ngày'},{key:'so_tien',label:'Số tiền',render:x=>ui.fmt(x.so_tien)},{key:'tham_chieu',label:'Tham chiếu'},{key:'dien_giai',label:'Diễn giải'},{key:'trang_thai',label:'Trạng thái'}]);
  }
  window.CN10.accounting={loadAccounting,loadBank};
})();
