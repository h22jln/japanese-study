alter table public.documents
add column body_line_translations jsonb not null default '{}'::jsonb;

comment on column public.documents.body_line_translations is '본문 줄별 온디맨드 한국어 해석 캐시';
