(function(){
  function cell(row, idx){ return row && row[idx] !== undefined ? row[idx] : ''; }
  function cleanCode(v){ return String(v ?? '').replace(/\./g,'').replace(/-/g,'').replace(/\s/g,'').replace(/\+/g,'').replace(/\u00A0/g,'').trim().toUpperCase(); }
  function money(v){ if(v==null || v==='') return 0; if(typeof v==='number') return Number.isFinite(v)?v:0; const n=Number(String(v).replace(/\./g,'').replace(/,/g,'').trim()); return Number.isFinite(n)?n:0; }
  function textDate(v){ if(v==null) return ''; if(v instanceof Date && !isNaN(v)) return v.toLocaleDateString('vi-VN'); if(typeof v==='number'){ const d=XLSX.SSF.parse_date_code(v); if(d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`; } return String(v).slice(0,10); }
  function addUnique(map,key,value){ value=String(value??'').trim(); if(!value) return; if(!map[key]) map[key]=value; else if(!(`;${map[key]};`).toLowerCase().includes(`;${value};`.toLowerCase())) map[key]+='; '+value; }
  function sheetRows(wb,name){ const ws=wb.Sheets[name]; if(!ws) throw new Error(`Thiếu sheet ${name}`); return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''}); }
  function findUnique(text, lengths, master){
    const s=cleanCode(text); if(!s.includes('H26')) return '';
    let p=s.indexOf('H26'), found='', count=0;
    while(p>=0){ for(const L of lengths){ const cand=s.slice(p,p+L); if(master[cand]!==undefined){ if(found!==cand){found=cand;count++;} break; } } if(count>1) return ''; p=s.indexOf('H26',p+1); }
    return count===1?found:'';
  }
  function monthInvoice(v){ const s=textDate(v); if(!s) return ''; if(s.includes('/')){ const a=s.split('/'); if(a.length===3) return `${a[1].padStart(2,'0')}/${a[2]}`;} return s.slice(0,7); }
  function classify(th,bidv,inv){
    if(th===bidv && th===inv) return {trang_thai:'Matched', loai_loi:'', huong_hach_toan:'Đủ điều kiện hạch toán'};
    if(th!==0 && bidv===0 && inv===0) return {trang_thai:'Needs Review', loai_loi:'THIEU_BIDV_VA_HOA_DON', huong_hach_toan:'Chờ tiền về và chờ hóa đơn'};
    if(th!==0 && bidv===0) return {trang_thai:'Needs Review', loai_loi:'THIEU_BIDV', huong_hach_toan:'Theo dõi chờ sao kê/người nộp'};
    if(th!==0 && inv===0) return {trang_thai:'Needs Review', loai_loi:'THIEU_HOA_DON', huong_hach_toan:'Đã có thu phí/tiền, cần xuất hoặc gắn hóa đơn'};
    return {trang_thai:'Needs Review', loai_loi:'SAI_TIEN', huong_hach_toan:'Không chốt, xác minh nguồn sai'};
  }
  function reconcileWorkbook(wb){
    const th=sheetRows(wb,'Doisoat'), ds=sheetRows(wb,'dscanbothuphi'), sk=sheetRows(wb,'saoke'), hd=sheetRows(wb,'sinvoid');
    const nk=wb.Sheets['nhatky_xuly']?sheetRows(wb,'nhatky_xuly'):[];
    const dictNgay={}, dictThu={}, dictBidv={}, dictHd={}, dictRef={}, dictSoHd={}, dictBoSung={};
    for(let i=1;i<nk.length;i++){ const loai=String(cell(nk[i],1)).trim().toLowerCase(); const ma=String(cell(nk[i],2)).trim(); const ref=String(cell(nk[i],3)).trim(); if(loai&&ma&&ref) dictBoSung[`${loai}|${ref}`]=ma; }
    const master=[]; const lenSet=new Set();
    for(let i=3;i<th.length;i++){ const goc=cell(th[i],2); const sach=cleanCode(goc); if(!sach) continue; lenSet.add(sach.length); master.push({don_vi:cell(th[i],1), ma_hoso_goc:goc, ma_hoso_sach:sach}); }
    const lens=[...lenSet].sort((a,b)=>b-a);
    for(let i=6;i<ds.length;i++){ const ma=cleanCode(cell(ds[i],4)); if(!ma) continue; if(dictNgay[ma]===undefined) dictNgay[ma]=textDate(cell(ds[i],5)); dictThu[ma]=(dictThu[ma]||0)+money(cell(ds[i],9)); }
    const skRec=new Set();
    for(let i=18;i<sk.length;i++){
      const ref=String(cell(sk[i],15)).trim(); let cand=dictBoSung[`saoke|${ref}`]?cleanCode(dictBoSung[`saoke|${ref}`]):findUnique(cell(sk[i],11), lens, dictThu);
      if(cand && dictThu[cand]!==undefined){ dictBidv[cand]=(dictBidv[cand]||0)+money(cell(sk[i],6))-money(cell(sk[i],5)); addUnique(dictRef,cand,ref); skRec.add(i); }
    }
    const hdRec=new Set();
    for(let i=8;i<hd.length;i++){
      const so=String(cell(hd[i],3)).trim(); let cand=dictBoSung[`sinvoid|${so}`]?cleanCode(dictBoSung[`sinvoid|${so}`]):findUnique(String(cell(hd[i],42))+String(cell(hd[i],67))+String(cell(hd[i],72)), lens, dictThu);
      if(cand && dictThu[cand]!==undefined){ dictHd[cand]=(dictHd[cand]||0)+money(cell(hd[i],32)); addUnique(dictSoHd,cand,so); hdRec.add(so); }
    }
    const ketqua=master.map(r=>{ const ma=r.ma_hoso_sach; const thuphi=dictThu[ma]||0, bidv=dictBidv[ma]||0, sinvoice=dictHd[ma]||0; const c=classify(thuphi,bidv,sinvoice); return {...r, ngay_thu:dictNgay[ma]||'', thuphi,bidv,sinvoice,...c, tham_chieu_bidv:dictRef[ma]||'', so_hoa_don:dictSoHd[ma]||''}; });
    const hoaDonChuaKhop=[]; for(let i=8;i<hd.length;i++){ const so=String(cell(hd[i],3)).trim(); if(so&&!hdRec.has(so)) hoaDonChuaKhop.push({ngay_hoa_don:textDate(cell(hd[i],4)),so_hoa_don:so,tong_tien:money(cell(hd[i],32)),aq:String(cell(hd[i],42)||''),bp:String(cell(hd[i],67)||''),bu:String(cell(hd[i],72)||''),ly_do:'Hóa đơn chưa nhận diện được đúng một mã hồ sơ'}); }
    const saokeChuaNhanDien=[]; for(let i=18;i<sk.length;i++){ const ref=String(cell(sk[i],15)).trim(); const dg=String(cell(sk[i],11)||''); const st=money(cell(sk[i],6))-money(cell(sk[i],5)); if((ref||dg||st)&&!skRec.has(i)) saokeChuaNhanDien.push({ngay_giao_dich:textDate(cell(sk[i],0)),dien_giai:dg,so_tien:st,tham_chieu:ref,ly_do:'Sao kê chưa nhận diện được đúng một mã hồ sơ'}); }
    const tkMap={}; for(let i=8;i<hd.length;i++){ const so=String(cell(hd[i],3)).trim(); if(!so) continue; const thang=monthInvoice(cell(hd[i],4)); const tien=money(cell(hd[i],32)); if(!thang) continue; if(!tkMap[thang]) tkMap[thang]={thang,tong_hd:0,tong_hoa_don:0,tong_tien:0,da_khop:0,tien_da_khop:0,chua_khop:0,tien_chua_khop:0}; const t=tkMap[thang]; t.tong_hd++;t.tong_hoa_don++;t.tong_tien+=tien; if(hdRec.has(so)){t.da_khop++;t.tien_da_khop+=tien}else{t.chua_khop++;t.tien_chua_khop+=tien};}
    const summary={tong_ho_so:ketqua.length, so_khop:ketqua.filter(x=>x.trang_thai==='Matched').length}; summary.so_lech=summary.tong_ho_so-summary.so_khop; summary.tong_thuphi=ketqua.reduce((s,x)=>s+x.thuphi,0); summary.tong_bidv=ketqua.reduce((s,x)=>s+x.bidv,0); summary.tong_sinvoice=ketqua.reduce((s,x)=>s+x.sinvoice,0);
    return {summary,ketqua,hoaDonChuaKhop,saokeChuaNhanDien,thongke:Object.values(tkMap)};
  }
  window.CN10_ENGINE={cleanCode,reconcileWorkbook};
})();