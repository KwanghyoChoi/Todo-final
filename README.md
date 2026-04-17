# Todo-final

작고 단순한 개인용 할일 관리 앱입니다.

## 기능
- 할일 추가, 수정, 삭제
- 완료 / 미완료 전환
- 중요 표시
- 날짜 지정
- 완료된 할일 목록 보기
- 서브태스크
- Hermes/외부 에이전트용 API: `/api/tasks`

## 기술 스택
- Next.js 14
- React 18
- Supabase
- Tailwind CSS

## 환경 변수
로컬 실행 또는 Vercel 배포 시 아래 값이 필요합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
HERMES_API_TOKEN=
```

`HERMES_API_TOKEN`은 선택 사항입니다.
값을 넣으면 `/api/tasks` 호출 시 간단한 토큰 검사를 사용합니다.

## 로컬 실행
```bash
npm install
npm run dev
```

## 빌드
```bash
npm run build
```

## Supabase 테이블
이 앱은 기본적으로 아래 테이블을 사용합니다.
- `todos`
- `subtasks`

`scripts/create-tables.sql`을 참고하세요.

## API
- `GET /api/tasks?completed=true|false`
- `POST /api/tasks`
- `PATCH /api/tasks`
- `DELETE /api/tasks`
