(function(){
  function cell(row, idx){ return row && row[idx] !== undefined ? row[idx] : ''; }
  function cleanCode(v){ return String(v ?? '').replace(/\./g,'').replace(/-/g,'').replace(/\s/g,'').replace(/\+/g,'').replace(/\u00A0/g,'').trim().toUpperCase(); }
  function money(v){
    if(v === null || v === undefined || v === '') return 0;
    if(typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v).trim().replace(/\./g,'').replace(/,/g,'');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function textDate(v){
    if(v === null || v === undefined) return '';
    if(v instanceof Date && !isNaN(v)) return v.toLocaleDateString('vi-VN');
    if(typeof v === 'number'){
      const d = XLSX.SSF.parse_date_code(v);
      if(d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
    }
    return String(v).slice(0,10);
  }
  function addUnique(map, key, value){
    value = String(value ?? '').trim(); if(!value) return;
    if(!map[key]) map[key] = value;
    else if(!(`;${map[key]};`).toLowerCase().includes(`;${value};`.toLowerCase())) map[key] += '; ' + value;
  }
  function findUnique(noiDung, lengths, dictThuPhi){
    if(!noiDung || !noiDung.includes('H26')) return '';
    let p = noiDung.indexOf('H26'); let foundMa = ''; let foundCount = 0;
    while(p >= 0){
      for(const L of lengths){
        if(p + L <= noiDung.length){
          const cand = noiDung.slice(p, p + L);
          if(Object.prototype.hasOwnProperty.call(dictThuPhi, cand)){
            if(foundMa !== cand){ foundCount++; foundMa = cand; }
            break;
          }
        }
      }
      if(foundCount > 1) return '';
      p = noiDung.indexOf('H26', p + 1);
    }
    return foundCount === 1 ? foundMa : '';
  }
  function sheetToRows(wb, name){
    const ws = wb.Sheets[name];
    if(!ws) throw new Error(`Thiếu sheet ${name}`);
    return XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''});
  }
  function sheetOpt(wb, name){
    const ws = wb.Sheets[name];
    return ws ? XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''}) : [];
  }
  function classify(thuphi,bidv,sinvoice){
    if(thuphi===bidv && thuphi===sinvoice) return {trang_thai:'matched', loai_loi:''};
    if(thuphi>0 && bidv===0 && sinvoice>0) return {trang_thai:'needs_review', loai_loi:'THIEU_BIDV'};
    if(thuphi>0 && bidv>0 && sinvoice===0) return {trang_thai:'needs_review', loai_loi:'THIEU_HOA_DON'};
    if(thuphi!==bidv || thuphi!==sinvoice) return {trang_thai:'needs_review', loai_loi:'SAI_TIEN'};
    return {trang_thai:'needs_review', loai_loi:'CAN_KIEM_TRA'};
  }
  function reconcileWorkbook(wb){
    const th = sheetToRows(wb,'Doisoat');
    const ds = sheetToRows(wb,'dscanbothuphi');
    const sk = sheetToRows(wb,'saoke');
    const hd = sheetToRows(wb,'sinvoid');
    const nk = sheetOpt(wb,'nhatky_xuly');
    const dictBoSung = {};
    for(let i=1;i<nk.length;i++){
      const loai=String(cell(nk[i],1)||'').trim().toLowerCase();
      const ref=String(cell(nk[i],2)||'').trim();
      const ma=cleanCode(cell(nk[i],3));
      if(loai && ref && ma) dictBoSung[`${loai}|${ref}`]=ma;
    }
    const thRows=[]; const lengthsSet=new Set();
    for(let i=3;i<th.length;i++){
      const raw=String(cell(th[i],2)||'').trim();
      const ma=cleanCode(raw); if(!ma || !ma.includes('H26')) continue;
      lengthsSet.add(ma.length);
      thRows.push({ma_hoso_goc:raw, ma_hoso_sach:ma, don_vi:String(cell(th[i],1)||'').trim()});
    }
    const lengths=Array.from(lengthsSet).sort((a,b)=>b-a);
    const dictNgay={}, dictThuPhi={};
    const feeRaw=[];
    for(let i=6;i<ds.length;i++){
      const raw=String(cell(ds[i],4)||'').trim();
      const ma=cleanCode(raw); if(!ma) continue;
      const st=money(cell(ds[i],9));
      if(dictNgay[ma] === undefined) dictNgay[ma] = textDate(cell(ds[i],5));
      if(dictThuPhi[ma] === undefined) dictThuPhi[ma] = 0;
      dictThuPhi[ma] += st;
      feeRaw.push({ma_hoso_goc:raw, ma_hoso_sach:ma, don_vi:String(cell(ds[i],1)||''), ngay_thu:textDate(cell(ds[i],5)), so_tien:st, raw_data:{row:i+1}});
    }
    const dictBIDV={}, dictGhiChu={}; const saokeRecognized = new Set(); const bankRaw=[];
    for(let i=18;i<sk.length;i++){
      const ref=String(cell(sk[i],15)).trim();
      const dg=String(cell(sk[i],11)||'');
      const st=money(cell(sk[i],6))-money(cell(sk[i],5));
      const key=`saoke|${ref}`; let cand='';
      if(dictBoSung[key]) cand = cleanCode(dictBoSung[key]);
      else cand = findUnique(cleanCode(dg), lengths, dictThuPhi);
      if(cand && Object.prototype.hasOwnProperty.call(dictThuPhi,cand)){
        dictBIDV[cand] = (dictBIDV[cand] || 0) + st;
        addUnique(dictGhiChu, cand, ref);
        saokeRecognized.add(i);
      }
      if(ref || dg || st) bankRaw.push({ngay_giao_dich:textDate(cell(sk[i],0)), tham_chieu:ref, dien_giai:dg, so_tien:st, ma_hoso_detected:cand, raw_data:{row:i+1}});
    }
    const dictHD={}, dictSoHD={}; const hdMatched = new Set(); const invoiceRaw=[];
    for(let i=8;i<hd.length;i++){
      const soHD = String(cell(hd[i],3)).trim();
      const aq=String(cell(hd[i],42)||''), bp=String(cell(hd[i],67)||''), bu=String(cell(hd[i],72)||'');
      const key=`sinvoid|${soHD}`; let cand='';
      if(dictBoSung[key]) cand = cleanCode(dictBoSung[key]);
      else cand = findUnique(cleanCode(aq + bp + bu), lengths, dictThuPhi);
      const tien=money(cell(hd[i],32));
      if(cand && Object.prototype.hasOwnProperty.call(dictThuPhi,cand)){
        dictHD[cand] = (dictHD[cand] || 0) + tien;
        addUnique(dictSoHD, cand, soHD);
        hdMatched.add(soHD);
      }
      if(soHD) invoiceRaw.push({ngay_hoa_don:textDate(cell(hd[i],4)), so_hoa_don:soHD, tong_tien:tien, aq,bp,bu, ma_hoso_detected:cand, raw_data:{row:i+1}});
    }
    const ketqua = thRows.map(r=>{
      const ma=r.ma_hoso_sach;
      const thuphi=dictThuPhi[ma]||0, bidv=dictBIDV[ma]||0, sinvoice=dictHD[ma]||0;
      const c=classify(thuphi,bidv,sinvoice);
      return {...r, ngay_thu:dictNgay[ma]||'', thuphi,bidv,sinvoice, ...c, tham_chieu_bidv:dictGhiChu[ma]||'', so_hoa_don:dictSoHD[ma]||''};
    });
    const bankUnidentified=[];
    for(const b of bankRaw){ if((b.tham_chieu||b.dien_giai||b.so_tien) && !b.ma_hoso_detected) bankUnidentified.push({...b, trang_thai:'pending'}); }
    const invoiceUnidentified=[];
    for(const inv of invoiceRaw){ if(inv.so_hoa_don && !hdMatched.has(inv.so_hoa_don)) invoiceUnidentified.push({...inv, trang_thai:'pending'}); }
    const tasks = ketqua.filter(x=>x.trang_thai!=='matched').map(x=>({ma_hoso:x.ma_hoso_sach, loai_loi:x.loai_loi, noi_dung:`${x.ma_hoso_goc}: Thu phí ${x.thuphi}, BIDV ${x.bidv}, SInvoice ${x.sinvoice}`, huong_xu_ly: x.loai_loi==='THIEU_BIDV'?'Kiểm tra sao kê/chờ tiền về':x.loai_loi==='THIEU_HOA_DON'?'Kiểm tra xuất hóa đơn':'Xác minh số tiền từng nguồn', trang_thai:'open'}));
    const summary={
      tong_ho_so:ketqua.length,
      so_khop:ketqua.filter(x=>x.trang_thai==='matched').length,
      so_lech:ketqua.filter(x=>x.trang_thai!=='matched').length,
      tong_thuphi:ketqua.reduce((s,x)=>s+x.thuphi,0),
      tong_bidv:ketqua.reduce((s,x)=>s+x.bidv,0),
      tong_sinvoice:ketqua.reduce((s,x)=>s+x.sinvoice,0),
      bank_unidentified:bankUnidentified.length,
      invoice_unidentified:invoiceUnidentified.length,
      fee_raw:feeRaw.length,
      bank_raw:bankRaw.length,
      invoice_raw:invoiceRaw.length
    };
    return {summary, ketqua, feeRaw, bankRaw, invoiceRaw, bankUnidentified, invoiceUnidentified, tasks};
  }
  window.CN10_ENGINE={cleanCode,money,textDate,reconcileWorkbook};
})();
