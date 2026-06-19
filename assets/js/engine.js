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
  function monthSInvoice(v){
    const s = textDate(v); if(!s) return '';
    const d = s.slice(0,10);
    if(d.includes('/')){ const a=d.split('/'); if(a.length===3) return `${String(a[1]).padStart(2,'0')}/${a[2]}`; }
    return d;
  }
  function reconcileWorkbook(wb){
    const th = sheetToRows(wb,'Doisoat');
    const ds = sheetToRows(wb,'dscanbothuphi');
    const sk = sheetToRows(wb,'saoke');
    const hd = sheetToRows(wb,'sinvoid');
    const nk = wb.Sheets['nhatky_xuly'] ? sheetToRows(wb,'nhatky_xuly') : [];

    const dictNgay={}, dictThuPhi={}, dictBIDV={}, dictHD={}, dictGhiChu={}, dictSoHD={}, dictBoSung={};
    for(let i=1;i<nk.length;i++){
      const loai=String(cell(nk[i],1)).trim().toLowerCase();
      const ma=String(cell(nk[i],2));
      const ref=String(cell(nk[i],3)).trim();
      if(loai && ma && ref) dictBoSung[`${loai}|${ref}`]=ma;
    }
    const thRows=[]; const lenSet = new Set();
    for(let i=3;i<th.length;i++){
      const maGoc = cell(th[i],2); const maSach = cleanCode(maGoc); if(!maSach) continue;
      lenSet.add(maSach.length);
      thRows.push({don_vi:cell(th[i],1), ma_hoso_goc:maGoc, ma_hoso_sach:maSach});
    }
    const lengths = Array.from(lenSet).sort((a,b)=>b-a);

    for(let i=6;i<ds.length;i++){
      const ma=cleanCode(cell(ds[i],4)); if(!ma) continue;
      if(dictNgay[ma] === undefined) dictNgay[ma] = textDate(cell(ds[i],5));
      if(dictThuPhi[ma] === undefined) dictThuPhi[ma] = 0;
      dictThuPhi[ma] += money(cell(ds[i],9));
    }

    const saokeRecognized = new Set();
    for(let i=18;i<sk.length;i++){
      const ref=String(cell(sk[i],15)).trim(); const key=`saoke|${ref}`; let cand='';
      if(dictBoSung[key]) cand = cleanCode(dictBoSung[key]);
      else cand = findUnique(cleanCode(cell(sk[i],11)), lengths, dictThuPhi);
      if(cand && Object.prototype.hasOwnProperty.call(dictThuPhi,cand)){
        dictBIDV[cand] = (dictBIDV[cand] || 0) + money(cell(sk[i],6)) - money(cell(sk[i],5));
        addUnique(dictGhiChu, cand, ref);
        saokeRecognized.add(i);
      }
    }

    const hdMatched = new Set();
    for(let i=8;i<hd.length;i++){
      const soHD = String(cell(hd[i],3)).trim(); const key=`sinvoid|${soHD}`; let cand='';
      if(dictBoSung[key]) cand = cleanCode(dictBoSung[key]);
      else cand = findUnique(cleanCode(String(cell(hd[i],42)) + String(cell(hd[i],67)) + String(cell(hd[i],72))), lengths, dictThuPhi);
      if(cand && Object.prototype.hasOwnProperty.call(dictThuPhi,cand)){
        dictHD[cand] = (dictHD[cand] || 0) + money(cell(hd[i],32));
        addUnique(dictSoHD, cand, soHD);
        hdMatched.add(soHD);
      }
    }

    const ketqua = thRows.map(r=>{
      const ma=r.ma_hoso_sach;
      const thuphi=dictThuPhi[ma]||0, bidv=dictBIDV[ma]||0, sinvoice=dictHD[ma]||0;
      return {...r, ngay_thu:dictNgay[ma]||'', thuphi,bidv,sinvoice, trang_thai:(thuphi===bidv && thuphi===sinvoice?'Matched':'Needs Review'), tham_chieu_bidv:dictGhiChu[ma]||'', so_hoa_don:dictSoHD[ma]||''};
    });

    const hoaDonChuaKhop=[];
    for(let i=8;i<hd.length;i++){
      const soHD=String(cell(hd[i],3)).trim(); if(!soHD) continue;
      if(!hdMatched.has(soHD)) hoaDonChuaKhop.push({ngay_hoa_don:textDate(cell(hd[i],4)), so_hoa_don:soHD, tong_tien:money(cell(hd[i],32)), aq:String(cell(hd[i],42)||''), bp:String(cell(hd[i],67)||''), bu:String(cell(hd[i],72)||''), ly_do:'Số hóa đơn không nhận diện được mã hồ sơ'});
    }

    const saokeChuaNhanDien=[];
    for(let i=18;i<sk.length;i++){
      const ref=String(cell(sk[i],15)).trim(); const dg=String(cell(sk[i],11)||''); const st=money(cell(sk[i],6))-money(cell(sk[i],5));
      if((ref||dg||st) && !saokeRecognized.has(i)) saokeChuaNhanDien.push({ngay_giao_dich:textDate(cell(sk[i],0)), dien_giai:dg, so_tien:st, tham_chieu:ref, ly_do:'Không nhận diện duy nhất một mã hồ sơ'});
    }

    const tkMap={};
    for(let i=8;i<hd.length;i++){
      const soHD=String(cell(hd[i],3)).trim(); if(!soHD) continue;
      const thang=monthSInvoice(cell(hd[i],4)); const tien=money(cell(hd[i],32)); if(!thang) continue;
      if(!tkMap[thang]) tkMap[thang]={thang,tong_hd:0,tong_hoa_don:0,tong_tien:0,da_khop:0,tien_da_khop:0,chua_khop:0,tien_chua_khop:0};
      const t=tkMap[thang]; t.tong_hd++; t.tong_hoa_don++; t.tong_tien += tien;
      if(hdMatched.has(soHD)){ t.da_khop++; t.tien_da_khop += tien; } else { t.chua_khop++; t.tien_chua_khop += tien; }
    }
    const thongke = Object.values(tkMap);
    const summary={tong_ho_so:ketqua.length, so_khop:ketqua.filter(x=>x.trang_thai==='Matched').length};
    summary.so_lech = summary.tong_ho_so - summary.so_khop;
    summary.tong_thuphi = ketqua.reduce((s,x)=>s+x.thuphi,0);
    summary.tong_bidv = ketqua.reduce((s,x)=>s+x.bidv,0);
    summary.tong_sinvoice = ketqua.reduce((s,x)=>s+x.sinvoice,0);
    return {summary, ketqua, hoaDonChuaKhop, saokeChuaNhanDien, thongke};
  }
  window.CN10_ENGINE = {reconcileWorkbook, cleanCode, money};
})();
