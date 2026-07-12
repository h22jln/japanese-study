grant usage on schema public to service_role;

grant select, insert, update, delete on table public.documents to service_role;
grant select, insert, update, delete on table public.vocabulary to service_role;
grant select, insert, update, delete on table public.document_vocabulary to service_role;
grant select, insert, update, delete on table public.review_cards to service_role;
grant select, insert, update, delete on table public.grammar_points to service_role;
grant select, insert, update, delete on table public.profiles to service_role;

-- service_role은 서버 전용 키로만 사용하며 브라우저에 노출하지 않습니다.
