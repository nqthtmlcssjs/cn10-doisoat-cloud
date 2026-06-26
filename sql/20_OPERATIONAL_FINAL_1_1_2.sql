-- CN10 Enterprise Operational Final 1.1.2
-- Chạy sau khi đã có database Sprint 1-4A.
-- Mục tiêu: ổn định vận hành, tắt RLS giai đoạn chạy thử, bổ sung view/function cần thiết.

create extension if not exists pgcrypto;

-- Bổ sung cột an toàn
alter table if exists doisoat_session
  add column if not exists close_status text default 'open',
  add column if not exists close_note text,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

alter table if exists doisoat_file
  add column if not exists diem_id bigint references diem(id),
  add column if not exists file_size bigint,
  add column if not exists file_signature text,
  add column if not exists upload_status text default 'uploaded',
  add column if not exists note text;

alter table if exists doisoat_result
  add column if not exists accounting_code text,
  add column if not exists accounting_label text,
  add column if not exists huong_xu_ly text,
  add column if not exists xu_ly_status text default 'open',
  add column if not exists xu_ly_note text,
  add column if not exists updated_at timestamptz default now();

alter table if exists task_xuly
  add column if not exists updated_at timestamptz default now();

-- Index an toàn
create index if not exists idx_doisoat_result_accounting_code on doisoat_result(accounting_code);
create index if not exists idx_doisoat_result_session_status on doisoat_result(session_id, accounting_code);
create index if not exists idx_task_xuly_session_status on task_xuly(session_id, trang_thai);

-- View dashboard ngày
create or replace view v_dashboard_ngay as
select
  s.id as session_id,
  s.ma_phien,
  s.ngay_doi_soat,
  d.ten_diem,
  count(r.id) as tong_ho_so,
  count(*) filter (where r.accounting_code = 'A01') as du_dieu_kien_hach_toan,
  count(*) filter (where r.accounting_code = 'A02') as cho_bidv,
  count(*) filter (where r.accounting_code = 'A03') as cho_hoa_don,
  count(*) filter (where r.accounting_code = 'A04') as sai_tien,
  count(*) filter (where r.accounting_code = 'A99') as can_kiem_tra,
  sum(coalesce(r.thuphi,0)) as tong_thuphi,
  sum(coalesce(r.bidv,0)) as tong_bidv,
  sum(coalesce(r.sinvoice,0)) as tong_sinvoice
from doisoat_session s
left join diem d on d.id = s.diem_id
left join doisoat_result r on r.session_id = s.id
group by s.id, s.ma_phien, s.ngay_doi_soat, d.ten_diem, d.thu_tu
order by s.ngay_doi_soat desc, d.thu_tu;

-- View trung tâm lỗi chi tiết
create or replace view v_trung_tam_loi_chitiet as
select
  r.id,
  r.session_id,
  s.ma_phien,
  s.ngay_doi_soat,
  d.ten_diem,
  r.ma_hoso_goc,
  r.ma_hoso_sach,
  r.ngay_thu,
  r.thuphi,
  r.bidv,
  r.sinvoice,
  r.accounting_code,
  r.accounting_label,
  r.huong_xu_ly,
  r.xu_ly_status,
  r.xu_ly_note,
  case
    when r.accounting_code = 'A02' then 'Theo dõi sao kê BIDV / kiểm tra giao dịch'
    when r.accounting_code = 'A03' then 'Kiểm tra xuất hóa đơn bổ sung hoặc hóa đơn thay thế'
    when r.accounting_code = 'A04' then 'Đối chiếu lại số tiền giữa Thu phí, BIDV và SInvoice'
    when r.accounting_code = 'A99' then 'Kế toán kiểm tra thủ công'
    else 'Không cần xử lý'
  end as goi_y_xu_ly
from doisoat_result r
left join doisoat_session s on s.id = r.session_id
left join diem d on d.id = r.diem_id
where coalesce(r.accounting_code,'') <> 'A01'
order by s.ngay_doi_soat desc, d.thu_tu, r.accounting_code, r.id;

-- View tổng hợp lỗi
create or replace view v_tonghop_loi as
select
  s.ngay_doi_soat,
  d.ten_diem,
  r.accounting_code,
  coalesce(r.accounting_label, r.loai_loi, 'Chưa phân loại') as nhom_loi,
  count(*) as so_luong,
  sum(coalesce(r.thuphi,0)) as tong_thuphi,
  sum(coalesce(r.bidv,0)) as tong_bidv,
  sum(coalesce(r.sinvoice,0)) as tong_sinvoice
from doisoat_result r
left join doisoat_session s on s.id = r.session_id
left join diem d on d.id = r.diem_id
where coalesce(r.accounting_code,'') <> 'A01'
group by s.ngay_doi_soat, d.ten_diem, d.thu_tu, r.accounting_code, coalesce(r.accounting_label, r.loai_loi, 'Chưa phân loại')
order by s.ngay_doi_soat desc, d.thu_tu, r.accounting_code;

-- View điều kiện chốt ngày
create or replace view v_kiem_tra_chot_ngay as
select
  s.id as session_id,
  s.ma_phien,
  s.ngay_doi_soat,
  d.ten_diem,
  count(r.id) as tong_ho_so,
  count(*) filter (where r.accounting_code = 'A01') as du_dieu_kien,
  count(*) filter (where r.accounting_code = 'A02') as cho_bidv,
  count(*) filter (where r.accounting_code = 'A03') as cho_hoa_don,
  count(*) filter (where r.accounting_code = 'A04') as sai_tien,
  count(*) filter (where r.accounting_code = 'A99') as can_kiem_tra,
  case
    when count(*) filter (where r.accounting_code in ('A04','A99') and coalesce(r.xu_ly_status,'open') <> 'done') > 0 then false
    else true
  end as co_the_chot
from doisoat_session s
left join diem d on d.id = s.diem_id
left join doisoat_result r on r.session_id = s.id
group by s.id, s.ma_phien, s.ngay_doi_soat, d.ten_diem;

-- Hàm đóng task
create or replace function mark_task_done(
  p_task_id bigint,
  p_user text,
  p_note text default null
)
returns text
language plpgsql
as $$
declare
  v_session_id bigint;
  v_ma_hoso text;
  v_loai_loi text;
begin
  select session_id, ma_hoso, loai_loi
  into v_session_id, v_ma_hoso, v_loai_loi
  from task_xuly
  where id = p_task_id;

  if v_session_id is null then
    return 'TASK_NOT_FOUND';
  end if;

  update task_xuly
  set trang_thai = 'done', updated_at = now()
  where id = p_task_id;

  update doisoat_result
  set xu_ly_status = 'done', xu_ly_note = p_note, updated_at = now()
  where session_id = v_session_id
    and ma_hoso_sach = v_ma_hoso
    and accounting_code = v_loai_loi;

  insert into workflow_history(session_id, action, detail, created_by)
  values (
    v_session_id,
    'TASK_DONE',
    jsonb_build_object('task_id', p_task_id, 'ma_hoso', v_ma_hoso, 'loai_loi', v_loai_loi, 'note', p_note),
    p_user
  );

  return 'DONE';
end;
$$;

-- Hàm chốt ngày
create or replace function close_day_session(p_session_id bigint, p_user text)
returns text
language plpgsql
as $$
declare
  v_blocking int;
begin
  select count(*) into v_blocking
  from doisoat_result
  where session_id = p_session_id
    and accounting_code in ('A04','A99')
    and coalesce(xu_ly_status,'open') <> 'done';

  if v_blocking > 0 then
    return 'KHONG_THE_CHOT_CON_' || v_blocking || '_LOI';
  end if;

  update doisoat_session
  set trang_thai = 'closed', close_status = 'closed', closed_by = p_user, closed_at = now(), approved_by = p_user, approved_at = now()
  where id = p_session_id;

  insert into workflow_history(session_id, action, detail, created_by)
  values (p_session_id, 'CLOSE_DAY', jsonb_build_object('result','success'), p_user);

  return 'CHOT_THANH_CONG';
end;
$$;

-- Quyền chạy thử: tắt RLS và grant đầy đủ. Khi nghiệm thu xong sẽ bật RLS chuẩn.
alter table if exists doisoat_session disable row level security;
alter table if exists doisoat_file disable row level security;
alter table if exists doisoat_result disable row level security;
alter table if exists fee_raw disable row level security;
alter table if exists bank_raw disable row level security;
alter table if exists invoice_raw disable row level security;
alter table if exists file_repository disable row level security;
alter table if exists task_xuly disable row level security;
alter table if exists bank_unidentified disable row level security;
alter table if exists invoice_unidentified disable row level security;
alter table if exists case_master disable row level security;
alter table if exists case_event disable row level security;
alter table if exists accounting_status disable row level security;
alter table if exists workflow_history disable row level security;
alter table if exists audit_log disable row level security;
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

update system_version
set version_code='1.1.2-operational', database_version='1.1.2-operational', notes='Bản vận hành: Accounting Engine, Trung tâm lỗi, Chốt ngày, progress lưu', deployed_at=now()
where id=1;

notify pgrst, 'reload schema';
