import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { FriendRequest, FriendshipStatus } from '@/types/friends';
import { FriendshipStatusMenu } from './FriendshipStatusMenu';

interface FriendRequestsListProps {
  requests: FriendRequest[];
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onAcceptWithStatus?: (requestId: string, senderId: string, status: FriendshipStatus) => Promise<void>;
  loading?: boolean;
}

export const FriendRequestsList: React.FC<FriendRequestsListProps> = ({
  requests,
  onAccept,
  onReject,
  onAcceptWithStatus,
  loading = false,
}) => {
  const theme = useTheme();
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FriendRequest | null>(null);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await onAccept(requestId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptWithStatus = (request: FriendRequest) => {
    if (onAcceptWithStatus) {
      setSelectedRequest(request);
      setStatusMenuVisible(true);
    } else {
      handleAccept(request.id);
    }
  };

  const handleStatusChange = async (newStatus: FriendshipStatus) => {
    if (selectedRequest && onAcceptWithStatus) {
      setProcessingId(selectedRequest.id);
      try {
        await onAcceptWithStatus(selectedRequest.id, selectedRequest.sender_id, newStatus);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await onReject(requestId);
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestCard, { 
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    }]}>
      <View style={styles.requestHeader}>
        <Image
          source={item.sender?.avatar_url ? { uri: item.sender.avatar_url } : require('@/assets/images/icon.png')}
          style={[styles.avatar, { borderColor: theme.colors.primary }]}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { 
            color: theme.colors.text,
            fontFamily: 'SansationBold',
          }]}>
            {item.sender?.name || 'Usuário'}
          </Text>
          <Text style={[styles.username, { 
            color: theme.colors.muted,
            fontFamily: 'Sansation',
          }]}>
            @{item.sender?.username || 'username'}
          </Text>
          {item.message && (
            <Text style={[styles.message, { 
              color: theme.colors.text,
              fontFamily: 'Sansation',
            }]}>
              "{item.message}"
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton, { 
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.error,
          }]}
          onPress={() => handleReject(item.id)}
          disabled={processingId === item.id}
          activeOpacity={0.7}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <>
              <Ionicons name="close" size={20} color={theme.colors.error} />
              <Text style={[styles.actionText, { 
                color: theme.colors.error,
                fontFamily: 'SansationBold',
              }]}>
                Recusar
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, { 
            backgroundColor: theme.colors.primary,
          }]}
          onPress={() => handleAcceptWithStatus(item)}
          disabled={processingId === item.id}
          activeOpacity={0.7}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={[styles.actionText, { 
                color: '#FFFFFF',
                fontFamily: 'SansationBold',
              }]}>
                Aceitar
              </Text>
              {onAcceptWithStatus && (
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={theme.colors.muted} />
        <Text style={[styles.emptyText, { 
          color: theme.colors.muted,
          fontFamily: 'Sansation',
        }]}>
          Nenhum pedido de amizade pendente
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContent}>
      {requests.map((item) => renderItem({ item }))}
      
      {selectedRequest && (
        <FriendshipStatusMenu
          visible={statusMenuVisible}
          onClose={() => setStatusMenuVisible(false)}
          currentStatus="normal"
          friendName={selectedRequest.sender?.name || 'Amigo'}
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
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  rejectButton: {
    borderWidth: 1,
  },
  acceptButton: {
    // primary background
  },
  actionText: {
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
