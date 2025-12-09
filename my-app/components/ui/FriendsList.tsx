import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { FriendWithProfile, FriendshipStatus } from '@/types/friends';
import { FriendshipStatusMenu } from './FriendshipStatusMenu';

interface FriendsListProps {
  friends: FriendWithProfile[];
  onRemoveFriend?: (friendId: string, friendName: string) => void;
  onFriendPress?: (friend: FriendWithProfile) => void;
  onStatusChange?: (friendId: string, status: FriendshipStatus) => Promise<void>;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  onRemoveFriend,
  onFriendPress,
  onStatusChange,
}) => {
  const theme = useTheme();
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProfile | null>(null);

  const handleRemove = (friendId: string, friendName: string) => {
    Alert.alert(
      'Remover Amigo',
      `Tem certeza que deseja remover ${friendName} da sua lista de amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => onRemoveFriend?.(friendId, friendName),
        },
      ]
    );
  };

  const handleOpenStatusMenu = (friend: FriendWithProfile, e: any) => {
    e.stopPropagation();
    setSelectedFriend(friend);
    setStatusMenuVisible(true);
  };

  const handleStatusChange = async (newStatus: FriendshipStatus) => {
    if (selectedFriend && onStatusChange) {
      await onStatusChange(selectedFriend.id, newStatus);
    }
  };

  const renderItem = ({ item }: { item: FriendWithProfile }) => (
    <TouchableOpacity
      style={[styles.friendCard, { 
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
      }]}
      onPress={() => onFriendPress?.(item)}
      activeOpacity={0.7}
    >
      <Image
        source={item.avatar_url ? { uri: item.avatar_url } : require('@/assets/images/icon.png')}
        style={[styles.avatar, { borderColor: theme.colors.primary }]}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { 
          color: theme.colors.text,
          fontFamily: 'SansationBold',
        }]}>
          {item.name}
        </Text>
        <Text style={[styles.username, { 
          color: theme.colors.muted,
          fontFamily: 'Sansation',
        }]}>
          @{item.username}
        </Text>
        <Text style={[styles.friendshipDate, { 
          color: theme.colors.muted,
          fontFamily: 'Sansation',
        }]}>
          Amigos desde {new Date(item.friendshipDate).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          })}
        </Text>
      </View>
      <View style={styles.actions}>
        {onStatusChange && (
          <TouchableOpacity
            style={styles.statusButton}
            onPress={(e) => handleOpenStatusMenu(item, e)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={item.friendship_status === 'close' ? 'heart' : item.friendship_status === 'blocked' ? 'ban' : 'ellipsis-horizontal'} 
              size={22} 
              color={item.friendship_status === 'close' ? '#e74c3c' : theme.colors.primary} 
            />
          </TouchableOpacity>
        )}
        {onRemoveFriend && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemove(item.id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (friends.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={theme.colors.muted} />
        <Text style={[styles.emptyText, { 
          color: theme.colors.muted,
          fontFamily: 'Sansation',
        }]}>
          Você ainda não tem amigos
        </Text>
        <Text style={[styles.emptySubtext, { 
          color: theme.colors.muted,
          fontFamily: 'Sansation',
        }]}>
          Comece adicionando amigos para compartilhar músicas
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContent}>
      {friends.map((item) => renderItem({ item }))}
      
      {selectedFriend && (
        <FriendshipStatusMenu
          visible={statusMenuVisible}
          onClose={() => setStatusMenuVisible(false)}
          currentStatus={selectedFriend.friendship_status || 'normal'}
          friendName={selectedFriend.name}
          onStatusChange={handleStatusChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    marginBottom: 4,
  },
  friendshipDate: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
