# ことばノート

일본어 PDF를 AI로 분석해 요약, 단어, 문법과 복습 카드를 만드는 서비스의 기본 프로젝트입니다.

## 시작하기

1. `.env.example`을 `.env.local`로 복사하고 Supabase/OpenAI/Trigger.dev 키를 입력합니다.
2. Supabase의 `supabase/migrations` 파일들을 번호순으로 적용합니다.
3. `pnpm supabase db reset` 또는 `pnpm supabase migration up`으로 마이그레이션을 적용합니다. 비공개 `documents` 버킷과 접근 정책도 자동 생성됩니다.
4. `pnpm dev`로 실행합니다.

## 주요 폴더

- `app/`: Next.js 화면과 API
- `components/`: 재사용 UI
- `lib/supabase/`: 브라우저/서버 Supabase 클라이언트
- `lib/ai/`: AI 응답 스키마와 분석 로직
- `supabase/migrations/`: 데이터베이스 스키마와 RLS 정책

현재는 랜딩, 아이디·비밀번호 회원가입/로그인, 보호된 대시보드, 사용자별 PDF 업로드, Next.js API 기반 OpenAI PDF 분석, 요약·단어·문법 저장까지 포함합니다. 아이디는 Supabase Auth 내부에서만 가상 이메일로 변환되며 사용자 화면에는 노출되지 않습니다.

AI 분석을 실행하려면 `.env.local`에 `OPENAI_API_KEY`와 `OPENAI_MODEL`을 설정하세요. 로컬에서는 `pnpm dev` 하나만 실행하면 됩니다.
