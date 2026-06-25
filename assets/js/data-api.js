window.CN10 = window.CN10 || {};
(function(){
  const supa = window.CN10.supa;
  const api = {};
  api.profile=null; api.user=null; api.diem=[];
  api.canAll=()=> api.profile && ['admin','ketoan','lanhdao'].includes(api.profile.vai_tro);
  api.isAdmin=()=> api.profile && api.profile.vai_tro==='admin';
  api.currentDiemId=()=> api.profile?.diem_id || null;
  api.initAuth = async function(){
    const {data:{session}} = await supa.auth.getSession();
    api.user = session?.user || null;
    if(!api.user){ api.profile=null; return null; }
    const email=String(api.user.email||'').trim().toLowerCase();
    let {data,error}=await supa.from('users_app').select('id,email,ho_ten,vai_tro,diem_id,active').ilike('email', email).limit(1);
    if(error) console.warn(error.message);
    let p=Array.isArray(data)&&data.length?data[0]:null;
    if(!p && email==='admin@cn10.local') p={email,ho_ten:'Quản trị CN10',vai_tro:'admin',diem_id:null,active:true,_fallback:true};
    if(p && p.active!==false && p.diem_id){
      const d=await supa.from('diem').select('id,ten_diem').eq('id',p.diem_id).maybeSingle();
      if(!d.error) p.diem=d.data;
    }
    api.profile = p && p.active!==false ? p : {email,ho_ten:email,vai_tro:'guest'};
    return api.profile;
  };
  api.login = async(email,password)=> supa.auth.signInWithPassword({email,password});
  api.logout = async()=> supa.auth.signOut();
  api.loadDiem = async function(){
    let q=supa.from('diem').select('*');
    // Không phụ thuộc bắt buộc vào active/thu_tu; fallback nếu schema khác.
    let {data,error}=await q.order('thu_tu',{ascending:true});
    if(error){ ({data,error}=await supa.from('diem').select('*').order('id',{ascending:true})); }
    if(error) throw error;
    api.diem=(data||[]).filter(d=>d.active!==false).sort((a,b)=>(a.thu_tu||a.id||0)-(b.thu_tu||b.id||0));
    return api.diem;
  };
  api.getDbVersion = async function(){
    const {data,error}=await supa.from('system_version').select('*').eq('id',1).maybeSingle();
    if(error) return null; return data;
  };
  api.upsertVersion = async function(){
    return supa.from('system_version').upsert({id:1,version_code:window.CN10_VERSION,notes:'CN10 Official Stable',deployed_at:new Date().toISOString()});
  };
  api.createSession = async function({diem_id,ky_doisoat,ghi_chu}){
    const d=api.diem.find(x=>Number(x.id)===Number(diem_id));
    const ym=String(ky_doisoat||'').replace('-','');
    const ma=`DS-${ym}-${(d?.ma_diem||d?.ten_diem||'CN10').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/\W+/g,'_').toUpperCase()}-${Date.now().toString().slice(-4)}`;
    return supa.from('doisoat_session').insert({ma_phien:ma,diem_id:Number(diem_id),ky_doisoat,ghi_chu,trang_thai:'draft',created_by:api.profile?.email||api.user?.email||'web'}).select('*, diem(ten_diem)').single();
  };
  api.loadSessions = async function(){
    let q=supa.from('doisoat_session').select('*, diem(ten_diem)').order('id',{ascending:false}).limit(100);
    if(api.profile?.vai_tro==='diem' && api.profile.diem_id) q=q.eq('diem_id',api.profile.diem_id);
    return q;
  };
  api.log = async(action, detail={})=>{
    try{ await supa.from('audit_log').insert({action,email:api.profile?.email||api.user?.email||null,vai_tro:api.profile?.vai_tro||null,diem_id:detail.diem_id||api.profile?.diem_id||null,detail}); }catch(e){ console.warn('audit skipped',e.message); }
  };
  api.insertChunks = async function(tableName, rows){ if(!rows?.length) return; for(let i=0;i<rows.length;i+=500){ const {error}=await supa.from(tableName).insert(rows.slice(i,i+500)); if(error) throw error; } };
  api.saveResult = async function({session,result,file_name}){
    const payload={ngay_doisoat:new Date().toISOString().slice(0,10),diem_id:session.diem_id,nguoi_thuc_hien:api.profile?.ho_ten||api.profile?.email||'web',ghi_chu:session.ghi_chu||'',file_name,source_mode:'v14_session',created_by:api.profile?.email||'web',...result.summary};
    const {data:dot,error}=await supa.from('dot_doisoat').insert(payload).select('id').single(); if(error) throw error;
    const dotId=dot.id; const addDot=x=>({...x,dot_id:dotId,diem_id:session.diem_id});
    await api.insertChunks('ketqua_doisoat', result.ketqua.map(addDot));
    await api.insertChunks('hoa_don_chua_khop', result.hoaDonChuaKhop.map(addDot));
    await api.insertChunks('saoke_chua_nhan_dien', result.saokeChuaNhanDien.map(addDot));
    await api.insertChunks('thongke_sinvoice', result.thongke.map(x=>({...x,dot_id:dotId})));
    await supa.from('doisoat_session').update({dot_id:dotId,trang_thai:'review',updated_at:new Date().toISOString()}).eq('id',session.id);
    await api.log('SAVE_RECONCILE_RESULT',{session_id:session.id,dot_id:dotId,diem_id:session.diem_id});
    return dotId;
  };
  api.closeSession = async function(session){
    return supa.from('doisoat_session').update({trang_thai:'closed',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',session.id);
  };
  window.CN10.api=api;
})();
