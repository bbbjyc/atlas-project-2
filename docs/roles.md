# 분업 구조 (2조)

팀원: 조연준(팀장) · 하재영 · 조원영. 이름-역할 매칭은 첫 5분에 바꿔도 되지만, **바꾸면 이 파일부터 고친다.**

## 역할

| 역할 | 담당 | 주 작업 폴더 | 브랜치 예시 |
|---|---|---|---|
| A. 팀장 · 데이터/배포 (조연준) | Supabase 프로젝트·팀원 초대, schema.sql·RLS, 뼈대 PR, Vercel 배포·환경변수, PR merge 관리, plan.md 최종 확정 | `supabase/`, `docs/plan.md`, `src/lib/` (Supabase 연결), 루트 설정 파일 | `feat/yeonjun-schema`, `feat/yeonjun-deploy` |
| B. 화면 · UX (하재영) | 폰 기준 화면, 입력·목록 UI, 공유 링크 진입 화면, 디자인 | `src/app/` 페이지, `src/components/` | `feat/jaeyoung-ui-...` |
| C. 핵심 기능 · 연결 (조원영) | 저장·조회·이어쓰기 로직, 링크 생성/공유, 새로고침 후 데이터 유지, 예외 처리 | `src/lib/` (기능 로직), `src/app/api/` | `feat/wonyoung-...` |

역할은 "주 담당"일 뿐이다. 남의 폴더를 고쳐야 하면 채팅에 먼저 알린다.

## 파일 소유 규칙 (충돌 방지)

- 한 파일은 한 사람만 만진다. 소유자는 위 표의 주 작업 폴더 기준.
- **plan.md 와 schema.sql 은 팀장만 수정** (다른 사람은 수정 제안을 채팅에). DB는 브랜치가 없어 바꾸는 순간 전원에게 적용된다.
- 테이블/열 이름은 plan.md 에 적힌 것만 쓴다. AI에게는 항상 `@docs/plan.md 대로` 라고 지정한다.
- 회의·메모는 날짜별 파일 `docs/meeting-YYYY-MM-DD.md`.

## 해커톤 100분 타임라인

| 시각 | 팀 전체 | 팀장 | 팀원 |
|---|---|---|---|
| 0:00 | 설계 ① 화면 그려보기 | Supabase 프로젝트 생성(Seoul, 이름 atlas-project-2) · 팀원 초대 | |
| 0:05 | 설계 ②~④ 테이블 나누기 · 열 · 검증 | | 초대 수락 |
| 0:17 | 설계 ⑤ plan.md 확정 | | |
| 0:20 | | ⑥ SQL 생성 → 실행 → 뼈대 PR | `.env.local` 작성 (`.env.example` 복사) |
| 0:30~ | 각자 브랜치에서 Supabase 루프 (아래) | | |

## 기능 하나 만들 때 루프

1. 채팅에 테이블 변경·건드릴 파일 알림
2. plan.md 부터 고침(팀장) → SQL은 AI가 → schema.sql 추가 → 실행 → PR
3. AI에 `@plan.md 의 <테이블>에 저장해줘` — 파일 단위로 범위 지정
4. Table Editor 에서 실제 행이 생겼는지 눈으로 확인
5. 표에는 있는데 앱에 안 보이면 RLS 규칙부터 확인
6. Vercel 에 URL·publishable 키 등록 → 재배포 → 폰으로 확인

## 절대 금지

- secret(service_role) 키를 저장소·`NEXT_PUBLIC_` 변수에 넣기
- `.env.local` 값을 채팅으로 주고받기 (각자 대시보드에서 복사)
- main 직접 작업, `--force`, AI에게 push/merge 시키기
