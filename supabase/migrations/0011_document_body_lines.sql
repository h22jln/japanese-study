alter table public.documents
add column body_lines jsonb;

comment on column public.documents.body_lines is 'AI가 정리한 본문 줄별 원문 및 한국어 해석';
