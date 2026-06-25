window.CN10_ENGINE = (function(){
  const cell=(r,i)=>r&&r[i]!==undefined?r[i]:'';
  function cleanCode(v){return String(v??'').replace(/\./g,'').replace(/-/g,'').replace(/\s/g,'').replace(/\+/g,'').replace(/\u00A0/g,'').trim().toUpperCase();}
  function money(v){if(v===null||v===undefined||v==='')return 0;if(typeof v==='number'&&Number.isFinite(v))return v;const s=String(v).trim().replace(/\./g,'').replace(/,/g,'');const n=Number(s);return Number.isFinite(n)?n:0;}
  function textDate(v){if(v===null||v===undefined)return '';if(v instanceof Date&&!isNaN(v))return v.toLocaleDateString('vi-VN');if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;}return String(v).slice(0,10);}
  function sheetToRows(wb,name){const ws=wb.Sheets[name];if(!ws)throw new Error(`Thiếu sheet ${name}`);return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});}
  function addUnique(map,key,value){value=String(value??'').trim();if(!value)return;if(!map[key])map[key]=value;else if(!(`;${map[key]};`).toLowerCase().includes(`;${value};`.toLowerCase()))map[key]+='; '+value;}
  function findUnique(noidung,lengths,dict){if(!noidung||!noidung.includes('H26'))return '';let p=noidung.indexOf('H26'),found='',count=0;while(p>=0){for(const L of lengths){const cand=noidung.slice(p,p+L);if(Object.prototype.hasOwnProperty.call(dict,cand)){if(found!==cand){count++;found=cand;}break;}}if(count>1)return '';p=noidung.indexOf('H26',p+1);}return count===1?found:'';}
  function monthSInvoice(v){const s=textDate(v);if(!s)return '';const d=s.slice(0,10);if(d.includes('/')){const a=d.split('/');if(a.length===3)return `${String(a[1]).padStart(2,'0')}/${a[2]}`;}return d;}
  function previewWorkbook(wb){
    const names=wb.SheetNames||[];
    const has=['Doisoat','dscanbothuphi','saoke','sinvoid'].every(x=>names.includes(x));
    if(!has) return {valid:false,message:'File phải có đủ sheet: Doisoat, dscanbothuphi, saoke, sinvoid', sheets:names};
    const th=sheetToRows(wb,'Doisoat'), ds=sheetToRows(wb,'dscanbothuphi'), sk=sheetToRows(wb,'saoke'), hd=sheetToRows(wb,'sinvoid');
    return {valid:true,message:'File đạt mẫu', sheets:names, counts:{doisoat:Math.max(0,th.length-3), thuphi:Math.max(0,ds.length-6), saoke:Math.max(0,sk.length-18), sinvoice:Math.max(0,hd.length-8)}};
  }
  function reconcileWorkbook(wb){
    const th=sheetToRows(wb,'Doisoat'), ds=sheetToRows(wb,'dscanbothuphi'), sk=sheetToRows(wb,'saoke'), hd=sheetToRows(wb,'sinvoid');
    const dictNgay={}, dictThuPhi={}, dictBIDV={}, dictGhiChu={}, dictHD={}, dictSoHD={};
    const thRows=[];
    for(let i=3;i<th.length;i++){
      const raw=String(cell(th[i],2)||'').trim(); const ma=cleanCode(raw); if(!ma||!ma.includes('H26'))continue;
      thRows.push({ma_hoso_goc:raw,ma_hoso_sach:ma,don_vi:String(cell(th[i],1)||'')});
    }
    const lengths=[...new Set(thRows.map(x=>x.ma_hoso_sach.length))].sort((a,b)=>b-a);
    for(let i=6;i<ds.length;i++){
      const ma=cleanCode(cell(ds[i],4)); if(!ma)continue;
      if(dictNgay[ma]===undefined)dictNgay[ma]=textDate(cell(ds[i],5));
      dictThuPhi[ma]=(dictThuPhi[ma]||0)+money(cell(ds[i],9));
    }
    const saokeRecognized=new Set();
    for(let i=18;i<sk.length;i++){
      const ref=String(cell(sk[i],15)).trim();
      const cand=findUnique(cleanCode(cell(sk[i],11)),lengths,dictThuPhi);
      if(cand&&Object.prototype.hasOwnProperty.call(dictThuPhi,cand)){
        dictBIDV[cand]=(dictBIDV[cand]||0)+money(cell(sk[i],6))-money(cell(sk[i],5));
        addUnique(dictGhiChu,cand,ref);saokeRecognized.add(i);
      }
    }
    const hdMatched=new Set();
    for(let i=8;i<hd.length;i++){
      const soHD=String(cell(hd[i],3)).trim();
      const text=cleanCode(String(cell(hd[i],42))+String(cell(hd[i],67))+String(cell(hd[i],72)));
      const cand=findUnique(text,lengths,dictThuPhi);
      if(cand&&Object.prototype.hasOwnProperty.call(dictThuPhi,cand)){
        dictHD[cand]=(dictHD[cand]||0)+money(cell(hd[i],32));
        addUnique(dictSoHD,cand,soHD);hdMatched.add(soHD);
      }
    }
    const ketqua=thRows.map(r=>{
      const ma=r.ma_hoso_sach, thuphi=dictThuPhi[ma]||0, bidv=dictBIDV[ma]||0, sinvoice=dictHD[ma]||0;
      let loai=''; if(thuphi!==bidv&&bidv===0)loai='Thiếu BIDV'; else if(thuphi!==sinvoice&&sinvoice===0)loai='Thiếu hóa đơn'; else if(thuphi!==bidv||thuphi!==sinvoice)loai='Sai tiền';
      return {...r,ngay_thu:dictNgay[ma]||'',thuphi,bidv,sinvoice,trang_thai:(thuphi===bidv&&thuphi===sinvoice?'matched':'review'),loai_loi:loai,tham_chieu_bidv:dictGhiChu[ma]||'',so_hoa_don:dictSoHD[ma]||''};
    });
    const bankUnidentified=[];
    for(let i=18;i<sk.length;i++){
      const ref=String(cell(sk[i],15)).trim(), dg=String(cell(sk[i],11)||''), st=money(cell(sk[i],6))-money(cell(sk[i],5));
      if((ref||dg||st)&&!saokeRecognized.has(i)) bankUnidentified.push({ngay_giao_dich:textDate(cell(sk[i],0)),dien_giai:dg,so_tien:st,tham_chieu:ref,trang_thai:'pending'});
    }
    const invoiceUnidentified=[];
    for(let i=8;i<hd.length;i++){
      const soHD=String(cell(hd[i],3)).trim();if(!soHD)continue;
      if(!hdMatched.has(soHD)) invoiceUnidentified.push({ngay_hoa_don:textDate(cell(hd[i],4)),so_hoa_don:soHD,tong_tien:money(cell(hd[i],32)),aq:String(cell(hd[i],42)||''),bp:String(cell(hd[i],67)||''),bu:String(cell(hd[i],72)||''),trang_thai:'pending'});
    }
    const summary={tong_ho_so:ketqua.length,so_khop:ketqua.filter(x=>x.trang_thai==='matched').length};
    summary.so_lech=summary.tong_ho_so-summary.so_khop;
    summary.tong_thuphi=ketqua.reduce((s,x)=>s+x.thuphi,0);
    summary.tong_bidv=ketqua.reduce((s,x)=>s+x.bidv,0);
    summary.tong_sinvoice=ketqua.reduce((s,x)=>s+x.sinvoice,0);
    return {ketqua,bankUnidentified,invoiceUnidentified,summary};
  }
  return {previewWorkbook,reconcileWorkbook,cleanCode,money,textDate};
})();