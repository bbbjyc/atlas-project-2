'use client';

import type { PlayerRow } from '@/lib/auth';
import AddByCode from './AddByCode';
import FriendRequests from './FriendRequests';
import MyCodeCard from './MyCodeCard';
import { FriendsLoadError, FriendsLoading } from './FriendStatus';
import type { FriendData } from './useFriendData';

// 친구 창의 "친구 추가" 탭: 내 코드 · 코드로 요청 · 받은/보낸 요청
export default function AddFriendPanel({ me, data, toast }: {
  me: PlayerRow;
  data: FriendData;
  toast: (msg: string) => void;
}) {
  return (
    <>
      <MyCodeCard code={me.invite_code} toast={toast} />
      <AddByCode meId={me.id} onChanged={data.reload} toast={toast} />
      {!data.loaded
        ? (data.error ? <FriendsLoadError message={data.error} onRetry={() => void data.reload()} /> : <FriendsLoading />)
        : (
          <>
            {data.error && <FriendsLoadError message={data.error} onRetry={() => void data.reload()} />}
            <FriendRequests meId={me.id} incoming={data.incoming} outgoing={data.outgoing} onChanged={data.reload} toast={toast} />
          </>
        )}
    </>
  );
}
