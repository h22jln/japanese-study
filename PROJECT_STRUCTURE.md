# 프로젝트 구조

## 1. 프로젝트 개요

**またね！(Matane!)**는 일본어 PDF 학습 자료를 AI로 분석해 한국어 요약, 단어, 문법, 복습 카드를 만드는 서비스입니다.

현재 저장소에는 다음 범위가 구현되어 있습니다.

- 랜딩, 로그인, 대시보드 화면
- Supabase 이메일 OTP(Magic Link) 인증
- 문서·단어·복습 카드용 데이터베이스 스키마와 RLS 정책
- AI 분석 결과의 Zod 스키마
- Trigger.dev 비동기 분석 작업의 골격
- 서비스 상태 확인 API

PDF 업로드, OpenAI 호출, 분석 결과 저장 및 실제 복습 기능은 아직 구현 전입니다.

## 2. Java·Spring·JSP 개발자를 위한 빠른 이해

이 프로젝트를 가장 간단히 표현하면 **Spring MVC의 Controller와 JSP 화면을 Next.js의 `app/` 디렉터리 안에서 함께 관리하는 구조**입니다. React 컴포넌트가 JSP의 역할을 대신하고, Next.js의 파일 경로가 `@RequestMapping` 역할을 합니다.

Spring 프로젝트에서 흔히 사용하는 `Controller → Service → Repository → DB` 계층이 이 프로젝트에 완성된 상태로 존재하는 것은 아닙니다. 현재는 초기 골격이므로 화면, 인증 클라이언트, DB 스키마, 백그라운드 작업만 나뉘어 있습니다. 기능이 커지면 `lib/` 아래에 서비스와 데이터 접근 계층을 추가하는 방식으로 발전시킬 수 있습니다.

### 2.1 개념 대응표

| Java·Spring·JSP | 이 프로젝트의 대응 개념 | 차이점 |
| --- | --- | --- |
| JSP | React 컴포넌트(`.tsx`) | HTML 템플릿 안에 Java 코드를 넣는 대신 JSX와 TypeScript로 UI를 선언합니다. |
| JSP 공통 레이아웃 또는 Tiles | `app/layout.tsx` | 하위 페이지를 `children`으로 감쌉니다. |
| Spring MVC `@Controller` + View 반환 | `app/**/page.tsx` | 파일 위치가 URL을 결정하며 컴포넌트가 화면을 직접 반환합니다. |
| `@RestController` / `@GetMapping` | `app/**/route.ts`의 `GET`, `POST` 함수 | 별도 어노테이션 없이 HTTP 메서드 이름의 함수를 export합니다. |
| `@RequestMapping("/login")` | `app/login/page.tsx` | 디렉터리 구조가 `/login` 경로가 됩니다. |
| Servlet Filter / Interceptor | Next.js Middleware | 현재 프로젝트에는 아직 없습니다. 대시보드 인증 보호도 미구현입니다. |
| `HttpSession` / Spring Security Context | Supabase Auth 세션 쿠키 | 인증 제공자가 세션을 발급하고 Next.js 서버가 쿠키를 읽습니다. |
| DTO + Bean Validation | TypeScript 타입 + Zod 스키마 | TypeScript는 컴파일 시 타입을, Zod는 실행 중 데이터 유효성을 검사합니다. |
| Service 클래스 | 보통 `lib/` 또는 별도 `services/` 함수 | 현재 분석 Service는 아직 구현되지 않았습니다. |
| Repository / DAO / MyBatis Mapper | Supabase 클라이언트를 호출하는 함수 | Supabase SDK가 SQL API와 인증을 제공합니다. 현재 전용 Repository 계층은 없습니다. |
| JPA Entity / DB DDL | `supabase/migrations/*.sql` | ORM Entity가 아니라 SQL 마이그레이션이 스키마의 기준입니다. |
| Spring Security 접근 제어 | Supabase RLS 정책 | 애플리케이션뿐 아니라 DB가 사용자별 행 접근을 직접 제한합니다. |
| `application.yml` | `.env.local` 및 각 `*.config.ts` | 비밀값은 환경 변수에, 도구 설정은 TypeScript 설정 파일에 둡니다. |
| Maven / Gradle | pnpm + `package.json` | 의존성, 실행 명령, 프로젝트 메타데이터를 관리합니다. |
| `@Scheduled` / Spring Batch / 비동기 Worker | Trigger.dev 작업 | 웹 요청과 분리된 장시간 작업을 실행하고 재시도합니다. |
| WAR/JAR 빌드 | `pnpm build` 결과인 `.next/` | Next.js 서버 또는 지원되는 호스팅 환경에 배포합니다. |

### 2.2 JSP와 React 컴포넌트의 차이

JSP에서는 서버가 JSP를 실행해 완성된 HTML을 내려주는 방식이 익숙합니다. Next.js에서도 서버 렌더링이 가능하지만, 컴포넌트는 두 종류로 나뉩니다.

- **Server Component**: 기본값입니다. 서버에서 실행되며 DB 조회나 비밀값을 사용하는 로직에 적합합니다. `app/page.tsx`, `app/dashboard/page.tsx` 등이 현재 이 방식입니다.
- **Client Component**: 파일 첫 줄에 `"use client"`를 선언합니다. 브라우저에서 상태, 이벤트, 브라우저 API를 사용할 때 필요합니다. `components/auth/login-form.tsx`가 해당합니다.

예를 들어 JSP의 폼 전송은 보통 Controller로 새 HTTP 요청을 보내지만, 현재 로그인 폼은 브라우저에서 `onSubmit` 이벤트를 처리하고 Supabase SDK를 직접 호출합니다. React의 `useState`는 화면에 표시할 메시지 상태를 보관하며, 값이 바뀌면 해당 UI가 다시 렌더링됩니다.

```tsx
// JSP의 폼 처리 결과를 Model에 담는 것과 비슷한 목적의 화면 상태
const [message, setMessage] = useState("");
```

Client Component를 모든 파일에 붙이는 것은 권장되지 않습니다. 서버에서 처리할 수 있는 조회와 렌더링은 Server Component에 두고, 클릭·입력·상태처럼 브라우저 동작이 필요한 작은 영역만 Client Component로 만드는 방식이 일반적입니다.

### 2.3 URL이 만들어지는 방식

Spring에서는 Controller에 URL을 선언하지만 Next.js App Router에서는 폴더와 특수 파일명이 URL을 만듭니다.

```text
app/page.tsx                  → GET /
app/login/page.tsx            → GET /login
app/dashboard/page.tsx        → GET /dashboard
app/api/health/route.ts       → GET /api/health
app/auth/callback/route.ts    → GET /auth/callback
```

- `page.tsx`: 브라우저에 표시할 페이지입니다. Spring Controller가 View 이름을 반환하고 JSP가 렌더링되는 부분을 하나로 합친 개념에 가깝습니다.
- `layout.tsx`: 여러 페이지에 공통으로 적용되는 바깥 레이아웃입니다.
- `route.ts`: JSON 응답, 리다이렉트 등 HTTP 요청을 직접 처리합니다. `@RestController`에 더 가깝습니다.
- `globals.css`: 모든 화면에 적용되는 전역 CSS입니다.

예를 들어 현재 Health API는 다음 Spring 코드와 개념적으로 같습니다.

```java
@GetMapping("/api/health")
public Map<String, Object> health() {
    return Map.of("ok", true, "service", "matane");
}
```

Next.js에서는 다음처럼 작성합니다.

```ts
// app/api/health/route.ts
export function GET() {
  return Response.json({ ok: true, service: "matane" });
}
```

### 2.4 이 프로젝트의 요청 처리 흐름

일반 화면 요청은 다음과 같이 이해할 수 있습니다.

```text
브라우저가 /dashboard 요청
  → Next.js가 app/dashboard/page.tsx 선택
  → Server Component 실행
  → React UI를 HTML로 렌더링
  → 브라우저에 응답
```

이는 대략 다음 Spring MVC 흐름에 대응합니다.

```text
브라우저 요청
  → DispatcherServlet
  → Controller
  → Model 구성
  → JSP View 렌더링
  → 브라우저 응답
```

차이는 Next.js에서 `page.tsx`가 URL 매핑, 화면 로직, View 구조를 한 파일에서 표현할 수 있다는 점입니다. 데이터 처리가 복잡해지면 페이지에 모두 작성하지 않고 `lib/`의 서비스 함수를 호출하도록 분리해야 합니다.

### 2.5 인증을 Spring Security 관점에서 보기

현재 인증은 애플리케이션이 비밀번호를 직접 검증하지 않고 Supabase Auth에 맡깁니다.

```text
로그인 폼(Client Component)
  → Supabase에 이메일 Magic Link 요청
  → 사용자가 이메일 링크 클릭
  → /auth/callback의 Route Handler 실행
  → 인증 code를 Supabase 세션으로 교환
  → 세션 쿠키 저장
  → /dashboard로 리다이렉트
```

`lib/supabase/client.ts`는 브라우저용 클라이언트이고 `lib/supabase/server.ts`는 서버용 클라이언트입니다. Spring에 비유하면 하나는 브라우저 JavaScript용 인증 SDK이고, 다른 하나는 Controller나 Service에서 현재 세션을 확인하기 위한 서버 측 도우미입니다.

주의할 점은 현재 `/dashboard`가 세션을 확인하지 않는다는 것입니다. Spring Security의 `authenticated()` 설정이나 인증 Interceptor가 없는 상태와 같아서 누구나 URL에 접근할 수 있습니다.

### 2.6 DB 접근과 RLS

이 프로젝트는 JPA Entity나 MyBatis XML 대신 Supabase의 PostgreSQL과 SDK를 사용합니다. 테이블 정의는 `supabase/migrations/0001_initial.sql`에 있으며, 이 SQL 파일이 현재 DB 구조의 기준입니다.

Supabase의 중요한 특징은 **RLS(Row Level Security)**입니다. 예를 들어 `documents` 테이블 정책은 현재 로그인한 사용자의 ID와 행의 `user_id`가 같은 경우만 접근을 허용합니다. Spring Service에서 매번 `WHERE user_id = ?`를 확인하는 것에 더해, DB 자체가 한 번 더 접근을 차단하는 구조입니다.

```text
Server Component 또는 Route Handler
  → Supabase 클라이언트 호출
  → PostgreSQL API
  → RLS가 세션 사용자와 user_id 확인
  → 허용된 행만 반환
```

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회할 수 있는 강한 서버 권한에 사용될 예정입니다. 이는 브라우저에 전달하면 안 되며, Spring의 관리자 DB 자격 증명처럼 서버나 Trigger.dev 작업에서만 다뤄야 합니다.

### 2.7 Trigger.dev를 배치 작업 관점에서 보기

PDF 분석은 파일 다운로드와 AI 호출 때문에 일반 웹 요청 안에서 끝내기에는 오래 걸릴 수 있습니다. 따라서 `trigger/analyze-document.ts`의 별도 작업으로 분리합니다.

Spring 기준으로는 Controller가 요청을 받은 뒤 작업 ID를 큐에 넣고, 별도의 Worker나 Spring Batch Job이 처리하는 구조와 비슷합니다. Trigger.dev가 작업 실행, 로그, 최대 3회 재시도, 최대 실행 시간 관리를 담당합니다.

```text
웹 요청: PDF 저장 + documents 상태를 queued로 기록
  → Trigger.dev 작업 시작
  → Worker: PDF 다운로드 → OpenAI 호출 → DB 저장
  → documents 상태를 completed 또는 failed로 변경
```

현재 Worker는 입력을 로그로 남기고 `stub`만 반환하므로 실제 분석 로직은 아직 없습니다.

### 2.8 TypeScript 파일을 읽는 최소 문법

| 문법 | 의미 | Java와 비교 |
| --- | --- | --- |
| `export default function Home()` | 다른 파일에서 기본으로 가져올 함수 선언 | public 메서드/클래스 공개와 유사하지만 모듈 단위 |
| `export function GET()` | 이름 있는 함수를 외부에 공개 | public static 메서드에 가까운 사용 방식 |
| `import X from "..."` | 다른 모듈 가져오기 | `import`와 유사 |
| `type Props = {...}` | 타입 구조 선언 | DTO 또는 interface와 유사 |
| `value?: string` | 값이 없을 수도 있는 선택 필드 | nullable 필드와 유사 |
| `async` / `await` | 비동기 작업의 완료를 기다림 | `CompletableFuture`보다 동기 코드처럼 읽기 쉬운 비동기 문법 |
| `const` | 재할당할 수 없는 변수 | `final` 지역 변수와 유사 |
| `array.map(...)` | 배열을 변환하며 UI 등을 생성 | Java Stream의 `map()`과 유사 |
| `@/lib/...` | 프로젝트 루트 기준 import 경로 | Java 패키지의 절대 경로 import와 유사 |

### 2.9 기능을 추가할 때 권장되는 계층

Spring식 계층 분리에 익숙하다면 기능이 커질 때 다음처럼 구성하면 이해하기 쉽습니다. 아래 구조는 권장 방향이며 현재 모두 존재하는 것은 아닙니다.

```text
app/                         # Controller + View 진입점
├── documents/page.tsx       # 화면 요청 처리
└── api/documents/route.ts   # REST API 요청 처리

components/                  # JSP fragment 또는 재사용 View 컴포넌트

lib/
├── services/                # Service 계층: 업무 규칙과 작업 조합
│   └── document-service.ts
├── repositories/            # Repository/DAO 계층: Supabase 쿼리 격리
│   └── document-repository.ts
├── ai/                      # AI 연동과 응답 DTO/검증
└── supabase/                # DB 클라이언트 생성과 세션 연결

trigger/                     # 비동기 Worker 또는 Batch Job
supabase/migrations/         # DB DDL과 보안 정책
```

권장 의존 방향은 다음과 같습니다.

```text
page.tsx 또는 route.ts
  → service 함수
  → repository 함수 / 외부 API 클라이언트
  → Supabase·OpenAI·Trigger.dev
```

React 컴포넌트 안에 복잡한 DB 쿼리나 업무 규칙을 계속 추가하면 JSP에 Java 로직을 직접 넣는 것과 비슷한 문제가 생깁니다. 페이지는 입력과 출력 조립에 집중시키고, 업무 규칙은 서비스 함수로 분리하는 편이 유지보수에 유리합니다.

## 3. 기술 구성

| 영역 | 기술 | 역할 |
| --- | --- | --- |
| 웹 애플리케이션 | Next.js, React, TypeScript | App Router 기반 화면 및 Route Handler 제공 |
| 스타일 | Tailwind CSS | 유틸리티 클래스와 전역 디자인 토큰 관리 |
| 아이콘 | Lucide React | 화면 아이콘 제공 |
| 인증·DB·Storage | Supabase | 사용자 인증, PostgreSQL 데이터, PDF 파일 저장 |
| AI | OpenAI SDK, Zod | 문서 분석 및 분석 결과 구조 검증 예정 |
| 백그라운드 작업 | Trigger.dev | 시간이 오래 걸리는 PDF 분석 작업 실행 예정 |
| 패키지 관리 | pnpm | 의존성 및 스크립트 관리 |

## 4. 디렉터리 구조

빌드 결과물인 `.next/`, 설치 의존성인 `node_modules/`는 아래 구조에서 제외했습니다.

```text
.
├── app/
│   ├── api/
│   │   └── health/route.ts       # 서비스 상태 확인 API
│   ├── auth/
│   │   └── callback/route.ts     # Supabase 로그인 콜백 처리
│   ├── dashboard/page.tsx        # 학습 자료 대시보드
│   ├── login/page.tsx            # 로그인 화면
│   ├── globals.css               # 전역 스타일과 색상 변수
│   ├── layout.tsx                # 루트 레이아웃과 메타데이터
│   └── page.tsx                  # 랜딩 페이지
├── components/
│   └── auth/
│       └── login-form.tsx        # 이메일 OTP 로그인 폼
├── lib/
│   ├── ai/
│   │   └── analysis-schema.ts    # AI 분석 결과 Zod 스키마
│   └── supabase/
│       ├── client.ts             # 브라우저용 Supabase 클라이언트
│       └── server.ts             # 서버용 Supabase 클라이언트
├── supabase/
│   └── migrations/
│       └── 0001_initial.sql      # 초기 DB 스키마, 인덱스, RLS 정책
├── trigger/
│   └── analyze-document.ts       # 문서 분석 비동기 작업 골격
├── .env.example                  # 필요한 환경 변수 목록
├── eslint.config.mjs             # ESLint 설정
├── next.config.ts                # Next.js 설정
├── package.json                  # 의존성과 실행 명령
├── pnpm-workspace.yaml           # pnpm 워크스페이스 및 빌드 설정
├── postcss.config.mjs            # Tailwind PostCSS 플러그인 설정
├── trigger.config.ts             # Trigger.dev 프로젝트 설정
└── tsconfig.json                 # TypeScript 및 `@/*` 경로 별칭 설정
```

## 5. 애플리케이션 영역

### `app/`: 화면과 서버 엔드포인트

Next.js App Router의 라우트가 위치합니다.

| URL | 파일 | 설명 |
| --- | --- | --- |
| `/` | `app/page.tsx` | 서비스 소개, 기능 안내, 로그인·대시보드 이동 링크를 표시합니다. |
| `/login` | `app/login/page.tsx` | 이메일 로그인 폼을 표시합니다. |
| `/dashboard` | `app/dashboard/page.tsx` | 분석 자료, 저장 단어, 연속 학습 통계의 빈 상태를 표시합니다. 현재 실제 데이터는 조회하지 않습니다. |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase가 전달한 인증 코드를 세션으로 교환하고 대시보드로 이동시킵니다. |
| `/api/health` | `app/api/health/route.ts` | `{ ok: true, service: "matane" }`를 반환합니다. |

`app/layout.tsx`는 모든 페이지를 감싸는 루트 레이아웃이며 서비스 제목과 설명 메타데이터를 선언합니다. `app/globals.css`는 Tailwind를 불러오고 배경색, 글자색, 강조색 등의 CSS 변수를 정의합니다.

### `components/`: 재사용 UI

현재 재사용 컴포넌트는 `components/auth/login-form.tsx` 하나입니다. 브라우저에서 동작하는 Client Component이며 다음 순서로 로그인 요청을 처리합니다.

1. 사용자가 이메일을 입력합니다.
2. 브라우저용 Supabase 클라이언트를 생성합니다.
3. `signInWithOtp()`로 이메일 로그인 링크를 요청합니다.
4. 링크를 누르면 `/auth/callback`으로 돌아옵니다.
5. 성공 또는 오류 메시지를 폼 아래에 표시합니다.

Supabase 공개 환경 변수가 없으면 외부 요청을 보내지 않고 설정 안내 메시지를 표시합니다.

### `lib/supabase/`: Supabase 클라이언트

- `client.ts`: Client Component에서 사용하는 브라우저 클라이언트를 만듭니다.
- `server.ts`: Server Component 또는 Route Handler에서 사용하는 서버 클라이언트를 만듭니다. Next.js 쿠키 저장소를 Supabase 세션 쿠키와 연결합니다.

두 함수 모두 필수 공개 환경 변수가 없으면 `null`을 반환하므로, 호출하는 쪽에서 설정 누락을 처리해야 합니다.

### `lib/ai/`: AI 분석 결과 계약

`analysis-schema.ts`는 OpenAI가 반환할 분석 결과의 형태를 Zod로 정의합니다.

- 문서 제목과 한국어 요약
- 단어의 표기, 사전형, 읽기, 한국어 의미, 품사
- 선택적인 예문, JLPT 급수, 출처 페이지
- 문법 패턴, 한국어 의미와 설명, 선택적인 예문

`AnalysisResult` 타입은 이 스키마에서 추론되므로, 런타임 검증 형식과 TypeScript 타입을 함께 유지할 수 있습니다.

### `trigger/`: 비동기 문서 분석

`analyze-document.ts`에는 `analyze-japanese-document` 작업이 등록되어 있습니다. 입력은 `documentId`와 `userId`이며 최대 3회 재시도하도록 설정되어 있습니다.

현재 작업은 로그를 남기고 `stub` 상태만 반환합니다. 최종적으로는 다음 처리가 이 작업에 들어갈 예정입니다.

1. Supabase Storage에서 PDF 다운로드
2. OpenAI Responses API로 문서 분석
3. `analysisSchema`로 응답 검증
4. 문서 요약, 단어, 문서-단어 연결, 복습 카드 저장
5. 문서 처리 상태 갱신 또는 오류 기록

`trigger.config.ts`는 작업 디렉터리, Node.js 런타임, 최대 실행 시간 900초를 설정합니다.

## 6. 데이터베이스 구조

`supabase/migrations/0001_initial.sql`에 초기 스키마가 정의되어 있습니다.

| 테이블 | 역할 | 주요 관계 |
| --- | --- | --- |
| `documents` | 업로드 문서, 처리 상태, 요약, 오류 저장 | `auth.users`에 종속 |
| `vocabulary` | 사용자별 단어 기본 정보 저장 | `auth.users`에 종속, 사용자·사전형·읽기 조합은 유일 |
| `document_vocabulary` | 문서와 단어 연결 및 문맥 정보 저장 | `documents`와 `vocabulary`의 다대다 연결 |
| `review_cards` | 단어별 다음 복습 시점과 학습 성과 저장 | 사용자와 단어 조합은 유일 |

문서 상태는 `queued`, `processing`, `completed`, `failed` 중 하나입니다. 모든 테이블에는 Row Level Security가 활성화되어 있으며, 로그인한 사용자는 본인 소유 데이터만 관리할 수 있습니다.

PDF는 Supabase Storage의 비공개 `documents` 버킷에 `{user_id}/{document_id}.pdf` 경로로 저장하는 것을 전제로 합니다. 버킷 생성과 Storage 정책은 마이그레이션에 포함되어 있지 않으므로 Supabase에서 별도로 설정해야 합니다.

## 7. 주요 처리 흐름

### 현재 구현된 인증 흐름

```text
/login
  → 이메일 입력
  → Supabase 이메일 OTP 요청
  → 사용자가 이메일의 링크 클릭
  → /auth/callback?code=...
  → 인증 코드를 세션으로 교환
  → /dashboard로 이동
```

현재 `/dashboard`에는 서버 측 사용자 확인이나 라우트 보호가 없으므로 URL로 직접 접근할 수 있습니다.

### 목표 문서 분석 흐름

```text
사용자 PDF 업로드
  → Supabase Storage 저장
  → documents 행 생성(status: queued)
  → Trigger.dev 작업 실행
  → PDF 다운로드 및 OpenAI 분석
  → Zod 스키마 검증
  → 요약·단어·복습 카드 저장
  → documents 상태를 completed로 변경
```

이 흐름은 현재 설계와 작업 골격만 있고 연결 코드는 구현되지 않았습니다.

## 8. 환경 변수

`.env.example`을 `.env.local`로 복사한 뒤 값을 설정합니다.

| 변수 | 사용 목적 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저와 서버에서 사용할 Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 Supabase 클라이언트 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 백그라운드 작업의 관리자 권한 DB·Storage 접근용 예정 |
| `OPENAI_API_KEY` | OpenAI 문서 분석 호출용 예정 |
| `TRIGGER_SECRET_KEY` | Trigger.dev 인증 |
| `TRIGGER_PROJECT_REF` | Trigger.dev 프로젝트 식별자 |

`NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저 번들에 노출될 수 있습니다. `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TRIGGER_SECRET_KEY`는 서버 또는 백그라운드 작업에서만 사용해야 합니다.

## 9. 실행 명령

```bash
pnpm dev             # Next.js 개발 서버 실행
pnpm build           # 프로덕션 빌드
pnpm start           # 빌드된 서버 실행
pnpm lint            # ESLint 검사
pnpm trigger:dev     # Trigger.dev 작업 로컬 개발
pnpm trigger:deploy  # Trigger.dev 작업 배포
```

## 10. 개발 시 파일 선택 가이드

- 새 페이지나 API를 추가할 때: `app/`
- 여러 화면에서 재사용할 UI를 추가할 때: `components/`
- Supabase 접근 방식을 수정할 때: `lib/supabase/`
- AI 응답 필드를 변경할 때: `lib/ai/analysis-schema.ts`와 저장 로직
- 비동기 분석 절차를 구현할 때: `trigger/analyze-document.ts`
- 테이블이나 RLS 정책을 변경할 때: `supabase/migrations/`에 새 마이그레이션 추가
- 전역 색상·글꼴·기본 스타일을 바꿀 때: `app/globals.css`
- 패키지나 실행 명령을 바꿀 때: `package.json`

DB가 이미 적용된 환경에서는 기존 `0001_initial.sql`을 수정하기보다 다음 번호의 마이그레이션 파일을 추가하는 편이 안전합니다.
