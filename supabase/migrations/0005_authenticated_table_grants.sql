grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.vocabulary to authenticated;
grant select, insert, update, delete on table public.document_vocabulary to authenticated;
grant select, insert, update, delete on table public.review_cards to authenticated;
grant select, update on table public.profiles to authenticated;

-- 권한(grant)은 테이블 접근 자체를 허용하고,
-- 각 테이블의 RLS 정책이 실제로 접근 가능한 사용자 행을 제한합니다.
