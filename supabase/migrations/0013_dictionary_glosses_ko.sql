alter table public.dictionary_entries
add column glosses_ko text[] not null default '{}';

comment on column public.dictionary_entries.glosses_ko is 'JMdict 영어 gloss를 한국어로 번역해 캐시한 값';
