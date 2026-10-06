# plan.md — 팀과 AI가 같이 보는 설계도

> 주제: 링크 하나로 '친구의 친구의 친구'까지 이어가라
> 조건: ① 나가도 남는다(저장) ② 설계하고 만든다 ③ 온전히 작동하고 돈이 된다
> 수정은 팀장만. 열 이름은 영어 소문자_밑줄, 종류는 글자·숫자·시각·참거짓, 연결은 `_id`.

## 1. 서비스 한 줄 설명
펫을 키우고 꾸미며(애완모드), 초대 링크로 친구를 데려와 클랜을 만들고 클랜전(전쟁모드)까지 즐기는 우정 육성 게임. 초대 링크가 친구의 친구의 친구까지 이어진다.

- 애완모드: 밥주기·집청소·샤워로 펫 레벨업, 옷·배경 꾸미기
- 전쟁모드: 애완모드 + 대전(PvP), 클랜전
- 친구 집 방문·선물(밥주기, 청소 대신해주기)로 애정점수를 쌓아 능력치·꾸미기 해금
- 초대받은 사람은 초대한 사람의 클랜에 들어갈지 직접 동의한다(가입 시 한 번만 선택)
- 돌봄·선물·치료·전투·아이템 구매는 모두 인게임 캐시를 쓴다. 캐시는 미션으로 얻거나 돈으로 충전한다(충전은 이번에 페이크 도어로 검증)
- 로그인: 이메일 + 비밀번호(Supabase Auth, 이메일 인증 메일은 켜지 않음). 계정 하나에 플레이어 하나(`players.auth_user_id`)라서 브라우저·기기를 바꿔도 같은 펫이다. 비밀번호는 Supabase가 관리하고 우리 테이블에는 저장하지 않는다
- 친구: 상대의 **친구 코드**(= `players.invite_code`)를 입력해 요청을 보내고, 상대가 수락해야 친구가 된다. 초대 링크로 가입한 사람은 초대한 사람과 **자동으로 친구**다. 친구가 아니면 집 방문·선물을 못 한다

## 2. 화면 (남아야 할 값에 [저장] 표시. 원래 3장 이내이나 주최측에 확인해 4장으로 진행)
### 로그인·가입 (앱을 열면 가장 먼저, 로그인하지 않았을 때만)
- 이메일·비밀번호로 로그인하거나 가입한다. 가입할 때 펫(닉네임)을 만든다
- 초대 링크(`?invite=코드`)로 들어왔으면 "○○님의 클랜에 들어갈래요?"를 묻는다(동의·거절). 링크의 코드는 로그인하기 전까지 브라우저에 잠깐 보관한다
- 로그아웃은 설정에서 한다
- [저장] 계정(Supabase Auth), 닉네임·초대한 사람·클랜·계정 연결(players, clans)

### 화면 1 – 내 집
- 펫, 레벨, 애정점수, 해금된 것 표시
- 밥주기·집청소·샤워·재우기·놀기 버튼
- 옷·배경색·가구 꾸미기
- [저장] 돌봄 행동(care_logs), 꾸미기 선택(style_logs)

### 화면 2 – 초대·클랜
- 내 초대 링크 복사, 초대 트리(친구의 친구의 친구), 클랜 전적
- 초대 링크로 들어온 사람에게 "○○님의 클랜에 들어갈래요?" 동의 선택
- [저장] 닉네임·초대한 사람·클랜(players, clans)

### 화면 3 – 친구 집 방문 / 클랜전
- 친구 집 구경, 방문, 선물(밥주기·청소·샤워를 대신 해주기) — 친구만 가능
- 친구 추가: 내 친구 코드 보기·복사, 상대의 친구 코드를 입력해 요청 보내기, 받은 요청 수락·거절, 보낸 요청 확인, 친구 삭제
- 대전 신청과 결과
- [저장] 친구 요청·수락·거절·삭제(friendships), 방문·선물 기록(visit_logs), 대전 결과(battle_logs)

### 화면 4 – 상점
- 캐시 잔액 표시, 꾸미기 아이템(옷·배경·가구) 구매
- 산 아이템만 화면 1 꾸미기에서 고를 수 있다
- [저장] 구매 기록(cash_logs)

### 충전 팝업 (화면이 아니라 팝업)
- 시스템이 캐시가 행동 비용보다 부족하다고 판단할 때마다, 어느 화면에서든 띄운다
- 충전 금액 단계를 촘촘하게 보여 주고 가장 낮은 금액을 "추천"으로 맨 앞에 둔다
- 금액을 누르면 "준비 중이에요. 출시되면 알려드릴게요"를 보여 준다(페이크 도어)
- [저장] 팝업 노출과 금액 클릭(fake_door_logs)

## 3. 테이블 (설계 ②~④)
### clans 테이블
클랜 하나당 한 줄
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| name | 글자 | 클랜 이름 |

### players 테이블
플레이어 한 명당 한 줄
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| nickname | 글자 | 표시 이름 |
| invite_code | 글자 | 이 사람의 초대 링크 코드 |
| invited_by_id | 숫자 | 나를 초대한 players.id (첫 사람은 비어 있음) |
| clan_id | 숫자 | 소속 clans.id (동의하면 초대한 사람의 클랜, 거절하면 새로 만든 클랜) |
| auth_user_id | 글자 | 이 플레이어의 로그인 계정 id (Supabase Auth의 사용자 id, uuid). 계정 하나에 플레이어 하나라서 같은 값이 두 번 들어갈 수 없다 |

### friendships 테이블
친구 요청·수락·거절·삭제 한 번당 한 줄 (수정·삭제가 안 되므로 **쌍마다 가장 최근 행이 현재 상태**)
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| from_player_id | 숫자 | 이 행을 만든 사람 (players.id) |
| to_player_id | 숫자 | 상대 (players.id) |
| status | 글자 | request(요청을 보냄) / accept(수락함) / decline(거절함) / remove(친구를 끊음) |

상태 읽는 법: 두 사람(A, B)의 행 중 A→B, B→A를 합쳐 가장 최근 한 줄을 본다. request면 받는 쪽에게 "받은 요청", 보낸 쪽에게 "보낸 요청"이고, accept면 서로 친구, decline·remove면 친구가 아니다(다시 요청 가능). 초대 링크로 가입하면 가입한 사람이 초대한 사람에게 accept 한 줄을 넣는다.

### care_logs 테이블
내 펫 돌봄 한 번당 한 줄
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| player_id | 숫자 | 누가 했는지 (players.id) |
| action_type | 글자 | feed / clean / shower / sleep / wake / play |

### style_logs 테이블
꾸미기를 바꿀 때마다 한 줄 (가장 최근 행이 현재 상태)
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| player_id | 숫자 | 누구의 펫인지 (players.id) |
| outfit | 글자 | 옷 종류 |
| background_color | 글자 | 배경색 |
| furniture | 글자 | 배치한 가구 id를 쉼표로 이은 값 (가구가 없으면 비움) |

### visit_logs 테이블
친구 집 방문·선물 한 번당 한 줄
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| visitor_id | 숫자 | 방문한 사람 (players.id) |
| host_id | 숫자 | 집 주인 (players.id) |
| action_type | 글자 | visit / feed / clean / shower |

### battle_logs 테이블
대전 한 판당 한 줄
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| attacker_id | 숫자 | 신청한 사람 (players.id) |
| defender_id | 숫자 | 받은 사람 (players.id) |
| winner_id | 숫자 | 이긴 사람 (players.id) |
| clan_id | 숫자 | 이긴 쪽 클랜 (clans.id) |

### cash_logs 테이블
캐시가 늘거나 줄 때마다 한 줄 (잔액은 합계로 계산)
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| player_id | 숫자 | 누구의 캐시인지 (players.id) |
| amount | 숫자 | 늘면 +, 줄면 − |
| reason | 글자 | mission / recovery / purchase / feed / clean / shower / heal / gift / battle / buy_item |
| item | 글자 | buy_item 이면 산 아이템 이름, mission 이면 `mission:<미션 id>` (그 외에는 비움). 미션은 같은 플레이어가 같은 item 을 두 번 받을 수 없다(DB가 막음) |
| item_type | 글자 | 산 아이템의 종류: outfit / background / furniture / food / weapon / armor / potion (아이템 구매가 아니면 비움) |

reason 설명: mission 은 미션 보상과 가입 시작 캐시(`mission:welcome`, +100), recovery 는 시간이 지나 자동으로 차는 캐시(깨어 있는 동안 1시간마다 +20, 잔액이 150이 되면 멈춤 — 앱이 접속할 때 밀린 만큼 한 줄로 넣음)

### fake_door_logs 테이블
충전 팝업 노출 또는 금액 클릭 한 번당 한 줄
| 열 | 종류 | 설명 |
|---|---|---|
| id | 자동 | 항상 있음 |
| created_at | 시각 | 항상 있음 |
| player_id | 숫자 | 누구인지 (players.id) |
| event_type | 글자 | popup_shown / tier_clicked |
| tier | 글자 | 누른 금액 (노출일 때는 비움) |
| shortage_reason | 글자 | 부족해서 막힌 행동 (feed / clean / shower / heal / gift / battle / buy_item). 상점의 "충전" 버튼으로 직접 열었으면 topup_button |

tier 설명: 누른 상품의 **원 단위 가격 문자열**(예: "100", "880"). 프리미엄 결제 상품은 `premium:<상품 이름>`으로 남기고 수익성 지표(클릭률 등)에서는 뺀다.

### 저장하지 않고 계산하는 값
- 경험치(EXP) = 내 care_logs의 행동별 점수 합계 (feed 3 · clean 2 · shower 2 · play 5 · sleep 1 · wake 0) + 산 음식(item_type food)의 효과값. 점수표는 `src/lib/pet.ts`의 `CARE_EXP` 한 곳에만 둔다
- 레벨 = 1 + EXP ÷ 10 (내림). 가입하면 Lv.1에서 시작한다
- 전투 능력치 (Lv.1 기준 초기값, 레벨이 1 오를 때마다 증가): HP 150(+10), 공격 10(+2), 방어 5(+2). 장비와 물약 효과는 그 위에 더한다 (자세한 전쟁 규칙은 `docs/war-rules.md`)
- 애정점수 = 내 집이 host_id인 visit_logs 행 수 (방문·선물 점수 비중은 앱 코드에서 정함)
- 현재 꾸미기 = style_logs에서 내 가장 최근 행
- 클랜 전적 = battle_logs를 clan_id별로 센 승리 수
- 초대 단계 = invited_by_id를 따라간 횟수
- 친구 목록 = friendships에서 쌍마다 가장 최근 행이 accept인 상대. 받은 요청 = 가장 최근 행이 request이고 to_player_id가 나인 것. 보낸 요청 = 가장 최근 행이 request이고 from_player_id가 나인 것
- 내 플레이어 = players에서 auth_user_id가 로그인한 계정 id인 한 줄 (로그인하면 이 줄의 id를 playerId로 쓴다)
- 캐시 잔액 = 내 cash_logs의 amount 합계
- 가진 아이템 = 내 cash_logs 중 reason이 buy_item인 행의 item (종류는 item_type). outfit·furniture·weapon·armor는 한 번 사면 계속 가진 것으로 보고, food·potion은 쓰고 사라지는 소모품이라 보유 목록에 넣지 않는다
- 미션 받음 여부 = 내 cash_logs 중 item이 `mission:<id>`인 행이 있는지
- 배고픔·피로도·청결도·행복도 같은 상태 수치 = care_logs의 행동 종류·횟수·created_at(마지막 행동 시각)으로 앱에서 계산 (열로 저장하지 않음)
- 쿨다운 = care_logs의 마지막 created_at과 현재 시각을 비교해 앱에서 계산
- 충전 팝업 클릭률 = tier_clicked 수 ÷ popup_shown 수

### 저장 순서 주의
가입 순서: ① Supabase Auth에 계정을 만든다(로그인 상태가 됨) → ② clans를 먼저 만든다(동의하면 기존 클랜 사용) → ③ players에 `auth_user_id`와 함께 추가한다 → ④ 시작 캐시 `mission:welcome` +100 → ⑤ 초대 링크로 왔으면 friendships에 accept 한 줄. 이미 계정이 있으면 가입하지 않고 로그인만 하고, 내 players 줄이 있으면 그대로 쓴다.

## 4. 검증
- 이 표로 핵심 기능이 되나? 된다. 수정이 필요한 곳 없이 읽기·추가만으로 동작한다(레벨·애정점수·꾸미기·전적은 모두 로그를 세거나 최신 행을 읽어 계산).
- 빼도 되는 개인정보는? 닉네임만 받는다. 실명·이메일·전화번호는 받지 않는다.
- 캐시 잔액·가진 아이템·충전 클릭률도 로그를 세거나 더해서 계산하므로 수정 없이 동작한다.
- 로그인(이메일·비밀번호)이 있어서 브라우저·기기를 바꿔도 같은 펫을 쓴다. 받는 개인정보는 닉네임과 로그인용 이메일이고, 이메일과 비밀번호는 Supabase Auth가 보관하며 우리 테이블(players 등)에는 복사하지 않는다.
- 한계: 로그인을 넣었어도 DB 쓰기 정책은 2단계로 나눠 조인다. 1단계(지금)는 이전처럼 누구나 임의의 player_id로 로그를 추가할 수 있고, 2단계(로그인 기능을 확인한 뒤 schema.sql 끝의 "2단계" 블록 실행)에서 "내 player_id로만 추가"하도록 막는다. 클랜은 가입 시점에 한 번만 정하고 탈퇴·이적은 지원하지 않는다(필요하면 clan_members 기록 테이블을 추가). 대전 결과는 앱이 두 사람의 레벨을 비교해 기록하므로 조작 가능성이 있다. 같은 이유로 cash_logs·fake_door_logs도 누구나 임의의 player_id로 추가할 수 있어 캐시와 수익성 수치를 조작할 수 있다(로그인을 넣으면 줄일 수 있는 확장 계획). 미션 보상은 중복 수령만 DB가 막는다.

## 5. 수익성 (완성도·수익성 채점)
- 지불 의사 가설: 돌봄·선물·치료·전투·아이템 구매가 모두 캐시로 이루어지므로, 캐시가 부족해 행동이 막힌 순간 사람들은 가장 작은 금액이라도 바로 충전한다. 큰 금액 한 번보다 소액을 여러 번 충전한다.
- 페이크 도어 테스트 방법과 목표 수치:
  - 방법: 캐시가 행동 비용보다 부족하다고 시스템이 판단할 때마다 충전 팝업을 띄운다. 충전 단계는 촘촘하게 7개로 하고, 많이 충전할수록 할인한다. 부족한 금액을 채우는 가장 작은 상품을 "추천"으로 맨 앞에 둔다. 금액을 누르면 "준비 중이에요"를 보여 주고 fake_door_logs에 기록한다.
  - 충전 단계 (캐시 → 원): 100→100 / 200→190(-5%) / 500→450(-10%) / 1,000→880(-12%) / 2,000→1,700(-15%) / 4,000→3,200(-20%) / 10,000→7,500(-25%). 프리미엄 상품(전설 의상·무기·물약)은 원으로 직접 결제하는 "준비 중" 상품이다.
  - 목표 수치: 부족해서 뜬 팝업(shortage_reason이 topup_button이 아닌 것) 노출 대비 금액 클릭률 15% 이상 / 클릭 중 1,000원 이하 단계(100·190·450·880원) 비율 70% 이상 / 1인 평균 클릭 2회 이상. 프리미엄 클릭은 지표에서 뺀다.

## 6. 함수·파일 이름 (AI가 멋대로 짓지 않게)
| 이름 | 위치 | 담당 |
|---|---|---|
playerId는 **항상 숫자(players.id)**다. `user_…` 같은 문자열 id는 쓰지 않는다. 기록하는 함수는 `created_at`을 직접 넣지 않고 DB의 `now()`에 맡긴다. 읽기에 실패하면 기본값을 돌려주지 말고 오류를 던진다(오류가 "캐시 부족"으로 보이는 것을 막기 위해).

| 이름 | 위치 | 담당 |
|---|---|---|
| levelFromExp | src/lib/pet.ts | `levelFromExp(exp)` → 숫자. `1 + floor(exp / 10)`. 레벨 계산은 이 함수 하나만 쓴다 (조원영) |
| getMyExp | src/lib/pet.ts | `getMyExp(playerId)` → 숫자. care_logs 점수표(`CARE_EXP`)와 산 음식 효과값의 합 (조원영) |
| getMyLevel | src/lib/pet.ts | `getMyLevel(playerId)` → 숫자. `levelFromExp(getMyExp(playerId))` (조원영) |
| addCareLog | src/lib/pet.ts | `addCareLog(playerId, actionType)` → 추가된 행. 돌봄 행동을 care_logs에 추가 (조원영) |
| getCashBalance | src/lib/cash.ts | `getCashBalance(playerId)` → 숫자. cash_logs 합계로 잔액 계산 (조원영) |
| addCashLog | src/lib/cash.ts | `addCashLog(playerId, amount, reason, item?, itemType?)` → 추가된 행. cash_logs에 한 줄 추가 (조원영) |
| claimMission | src/lib/cash.ts | `claimMission(playerId, missionId, amount)` → 성공 여부. reason mission, item `mission:<id>`로 추가. 이미 받았으면 DB가 거부하므로 false (조원영) |
| getOwnedItems | src/lib/cash.ts | `getOwnedItems(playerId)` → `{ item, itemType }[]`. buy_item 행 중 소모품(food·potion)을 뺀 것 (조원영) |
| joinClan | src/lib/clan.ts | `joinClan(authUserId, nickname, inviteCode, agree)` → 새 player 행. `inviteCode`는 초대 링크의 코드(없으면 null). 동의하면 초대한 사람의 클랜, 거절하거나 초대가 없으면 새 클랜을 만들어 players(`auth_user_id` 포함)에 추가한다. 이어서 시작 캐시 `mission:welcome` +100을 넣고, 초대 링크로 왔으면 초대한 사람과 friendships accept 한 줄을 넣는다. 가입 순서는 3번 "가입 순서" 참고 (조연준, 로그인 기능과 함께 만든다) |
| addFakeDoorLog | src/lib/fakeDoor.ts | `addFakeDoorLog(playerId, eventType, tier, shortageReason)` → 추가된 행. 실패해도 화면은 막지 않는다 (조원영) |
| signUp | src/lib/auth.ts | `signUp(email, password)` → 로그인된 사용자 `{ id, email }`. Supabase Auth 계정을 만든다. 이미 가입된 이메일이면 오류 (조연준) |
| signIn | src/lib/auth.ts | `signIn(email, password)` → `{ id, email }`. 틀리면 오류 (조연준) |
| signOut | src/lib/auth.ts | `signOut()` → 없음. 로그아웃 (조연준) |
| getAuthUser | src/lib/auth.ts | `getAuthUser()` → `{ id, email } \| null`. 지금 로그인한 계정 (조연준) |
| getMyPlayer | src/lib/auth.ts | `getMyPlayer(authUserId)` → players 행 또는 null. `auth_user_id`로 내 플레이어를 찾는다 (조연준) |
| sendFriendRequest | src/lib/friends.ts | `sendFriendRequest(myId, friendCode)` → `'sent' \| 'already_friends' \| 'already_requested' \| 'accepted'`. 코드로 상대를 찾아 request 한 줄을 넣는다. 상대가 이미 나에게 request를 보냈다면 accept로 처리한다. 코드가 없거나 내 코드면 오류 (조연준) |
| respondFriendRequest | src/lib/friends.ts | `respondFriendRequest(myId, otherId, accept)` → 없음. accept 또는 decline 한 줄 (조연준) |
| removeFriend | src/lib/friends.ts | `removeFriend(myId, otherId)` → 없음. remove 한 줄 (조연준) |
| getFriends | src/lib/friends.ts | `getFriends(myId)` → players 행 배열. 현재 친구 (조연준) |
| getFriendRequests | src/lib/friends.ts | `getFriendRequests(myId)` → `{ incoming, outgoing }` (각각 players 행 배열) (조연준) |
| startBattle | src/lib/battle.ts | `startBattle(attackerId, defenderId)` → battle_logs 행. 레벨을 비교해 승패를 정하고 기록 (조연준) |
| getClanWins | src/lib/battle.ts | `getClanWins(clanId)` → 숫자. battle_logs에서 clan_id가 같은 행 수 (조연준) |
