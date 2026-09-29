# 프로젝트 작업 규칙 (AI 도구용)

## 구조
- docs/: plan.md(설계도), roles.md(분업), supabase/schema.sql(DB), src/: 코드
- 항상 @docs/plan.md 를 먼저 읽고 그 안의 테이블·열 이름만 사용한다. 없는 테이블을 만들지 않는다.

## 깃 규칙
- main 브랜치에서는 절대 파일을 수정하지 않는다. 현재 브랜치가 main이면 먼저 사용자에게 알린다.
- 요청받은 파일만 수정한다. 다른 파일을 바꿔야 하면 먼저 이유를 설명하고 허락을 받는다.
- docs/plan.md, supabase/schema.sql 은 팀장 요청 없이 수정하지 않는다.
- 전체 포맷 정리, 대규모 리네임은 하지 않는다.
- git push, git merge, git reset, --force 명령은 실행하지 않는다.
- 커밋 메시지는 "종류: 내용" 형식 (feat/fix/docs/refactor/chore).

## 코드·보안 규칙
- 키는 .env.local 에서 읽는다. 코드에 직접 쓰지 않는다.
- secret(service_role) 키는 절대 사용하지 않는다. NEXT_PUBLIC_ 변수에도 넣지 않는다.
- 테이블은 RLS를 켜고 읽기·추가만 허용한다(수정·삭제 불가).
- 새 패키지를 쓰면 package.json 에 추가한다.
