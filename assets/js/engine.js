(function(){
  const C={THU:'dscanbothuphi',SK:'saoke',HD:'sinvoid',DS:'Doisoat'};
  function cell(r,i){return r&&r[i]!==undefined?r[i]:''}
  function clean(v){return String(v??'').replace(/[\.\-\s\+\u00A0]/g,'').trim().toUpperCase()}
  function money(v){if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v).trim().replace(/\./g,'').replace(/,/g,''));return Number.isFinite(n)?n:0}
  function textDate(v){if(v instanceof Date&&!isNaN(v))return v.toLocaleDateString('vi-VN');if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`}return String(v??'').slice(0,10)}
  function rows(wb,n){const ws=wb.Sheets[n];if(!ws)throw new Error('Thiếu sheet '+n);return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''})}
  function addUnique(m,k,v){v=String(v??'').trim();if(!v)return;if(!m[k])m[k]=v;else if(!(';'+m[k]+';').toLowerCase().includes(';'+v.toLowerCase()+';'))m[k]+='; '+v}
  function findUnique(s,lens,dict){s=clean(s);if(!s.includes('H26'))return'';let p=s.indexOf('H26'),found='',cnt=0;while(p>=0){for(const L of lens){const c=s.slice(p,p+L);if(dict[c]!==undefined){if(found!==c){found=c;cnt++}break}}if(cnt>1)return'';p=s.indexOf('H26',p+1)}return cnt===1?found:''}
  function validateWorkbook(wb){const missing=[C.THU,C.SK,C.HD,C.DS].filter(x=>!wb.Sheets[x]);return{ok:missing.length===0,message:missing.length?'Thiếu sheet: '+missing.join(', '):'File tổng hợp đạt mẫu'}}
  function validateSplit(wbs){const miss=[];if(!wbs.thu||!wbs.thu.Sheets[C.THU])miss.push('Thu phí');if(!wbs.bidv||!wbs.bidv.Sheets[C.SK])miss.push('BIDV');if(!wbs.inv||!wbs.inv.Sheets[C.HD])miss.push('SInvoice');return{ok:miss.length===0,message:miss.length?'Thiếu/sai file: '+miss.join(', '):'3 file riêng đạt mẫu'}}
  function mergeSplit(wbs){const out=XLSX.utils.book_new();for(const [src,name] of [[wbs.thu,C.THU],[wbs.bidv,C.SK],[wbs.inv,C.HD]]){XLSX.utils.book_append_sheet(out,src.Sheets[name],name)}if(wbs.thu.Sheets[C.DS])XLSX.utils.book_append_sheet(out,wbs.thu.Sheets[C.DS],C.DS);else throw new Error('File thu phí phải có sheet Doisoat để làm danh sách mã chuẩn');return out}
  function reconcileWorkbook(wb){
    const th=rows(wb,C.DS), ds=rows(wb,C.THU), sk=rows(wb,C.SK), hd=rows(wb,C.HD), nk=wb.Sheets.nhatky_xuly?rows(wb,'nhatky_xuly'):[];
    const dictNgay={},dictThu={},dictB={},dictH={},dictRef={},dictSoHD={},dictBo={};
    for(let i=1;i<nk.length;i++){const loai=String(cell(nk[i],1)).trim().toLowerCase(),ma=cell(nk[i],2),ref=String(cell(nk[i],3)).trim();if(loai&&ma&&ref)dictBo[`${loai}|${ref}`]=ma}
    const thRows=[],lens=new Set();
    for(let i=3;i<th.length;i++){const g=cell(th[i],2),m=clean(g);if(!m)continue;lens.add(m.length);thRows.push({don_vi:cell(th[i],1),ma_hoso_goc:g,ma_hoso_sach:m})}
    const lengths=[...lens].sort((a,b)=>b-a);
    for(let i=6;i<ds.length;i++){const m=clean(cell(ds[i],4));if(!m)continue;if(dictNgay[m]===undefined)dictNgay[m]=textDate(cell(ds[i],5));dictThu[m]=(dictThu[m]||0)+money(cell(ds[i],9))}
    const skRec=new Set();
    for(let i=18;i<sk.length;i++){const ref=String(cell(sk[i],15)).trim();let m=dictBo[`saoke|${ref}`]?clean(dictBo[`saoke|${ref}`]):findUnique(cell(sk[i],11),lengths,dictThu);if(m&&dictThu[m]!==undefined){dictB[m]=(dictB[m]||0)+money(cell(sk[i],6))-money(cell(sk[i],5));addUnique(dictRef,m,ref);skRec.add(i)}}
    const hdRec=new Set();
    for(let i=8;i<hd.length;i++){const so=String(cell(hd[i],3)).trim();let m=dictBo[`sinvoid|${so}`]?clean(dictBo[`sinvoid|${so}`]):findUnique(String(cell(hd[i],42))+String(cell(hd[i],67))+String(cell(hd[i],72)),lengths,dictThu);if(m&&dictThu[m]!==undefined){dictH[m]=(dictH[m]||0)+money(cell(hd[i],32));addUnique(dictSoHD,m,so);hdRec.add(so)}}
    function loai(th,b,h){if(th===b&&th===h)return'Khớp';if(th&&b===0&&h===0)return'Thiếu BIDV + hóa đơn';if(th&&b===0)return'Thiếu BIDV';if(th&&h===0)return'Thiếu hóa đơn';if(th!==b||th!==h)return'Sai tiền';return'Cần kiểm tra'}
    const ketqua=thRows.map(r=>{const m=r.ma_hoso_sach,thp=dictThu[m]||0,b=dictB[m]||0,h=dictH[m]||0,l=loai(thp,b,h);return{...r,ngay_thu:dictNgay[m]||'',thuphi:thp,bidv:b,sinvoice:h,trang_thai:l==='Khớp'?'Matched':'Needs Review',loai_loi:l,huong_xu_ly:l==='Khớp'?'Đủ điều kiện hạch toán':'Kiểm tra và xử lý theo nhóm lỗi',tham_chieu_bidv:dictRef[m]||'',so_hoa_don:dictSoHD[m]||''}})
    const hoaDonChuaKhop=[];for(let i=8;i<hd.length;i++){const so=String(cell(hd[i],3)).trim();if(so&&!hdRec.has(so))hoaDonChuaKhop.push({ngay_hoa_don:textDate(cell(hd[i],4)),so_hoa_don:so,tong_tien:money(cell(hd[i],32)),aq:String(cell(hd[i],42)||''),bp:String(cell(hd[i],67)||''),bu:String(cell(hd[i],72)||''),ly_do:'Hóa đơn chưa nhận diện được mã hồ sơ chuẩn'})}
    const saokeChuaNhanDien=[];for(let i=18;i<sk.length;i++){const ref=String(cell(sk[i],15)).trim(),dg=String(cell(sk[i],11)||''),st=money(cell(sk[i],6))-money(cell(sk[i],5));if((ref||dg||st)&&!skRec.has(i))saokeChuaNhanDien.push({ngay_giao_dich:textDate(cell(sk[i],0)),dien_giai:dg,so_tien:st,tham_chieu:ref,ly_do:'Sao kê chưa nhận diện được duy nhất một mã hồ sơ'})}
    const summary={tong_ho_so:ketqua.length,so_khop:ketqua.filter(x=>x.trang_thai==='Matched').length};summary.so_lech=summary.tong_ho_so-summary.so_khop;summary.tong_thuphi=ketqua.reduce((s,x)=>s+x.thuphi,0);summary.tong_bidv=ketqua.reduce((s,x)=>s+x.bidv,0);summary.tong_sinvoice=ketqua.reduce((s,x)=>s+x.sinvoice,0);
    return{summary,ketqua,hoaDonChuaKhop,saokeChuaNhanDien,thongke:[]}
  }
  window.CN10_ENGINE={validateWorkbook,validateSplit,mergeSplit,reconcileWorkbook,cleanCode:clean};
})();
