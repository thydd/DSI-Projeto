// Types para sistema de amizades

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export type FriendshipStatus = 'normal' | 'close' | 'blocked';

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  message: string | null;
  created_at: string;
  // Dados populados via join
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
};

export type FriendRequestCreateInput = {
  sender_id: string;
  receiver_id: string;
  message?: string | null;
};

export type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friendship_status?: FriendshipStatus;
  updated_at?: string;
  // Dados do amigo populados via join
  friend?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
};

export type FriendWithProfile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  friendshipDate: string;
  friendship_status?: FriendshipStatus;
};
