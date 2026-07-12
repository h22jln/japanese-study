alter table public.documents
add column body_text text;

comment on column public.documents.body_text is 'AI가 PDF에서 추출한 일본어 본문 원문';
