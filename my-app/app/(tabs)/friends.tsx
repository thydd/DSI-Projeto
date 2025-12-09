import { BottomNav } from '@/components/navigation/BottomNav';
import { AddFriendModal } from '@/components/ui/AddFriendModal';
import { FriendRequestsList } from '@/components/ui/FriendRequestsList';
import { FriendsList } from '@/components/ui/FriendsList';
import { BOTTOM_NAV_ICONS } from '@/constants/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useFriends } from '@/hooks/useFriends';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [addModalVisible, setAddModalVisible] = useState(false);

  const {
    friends,
    receivedRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    updateFriendshipStatus,
    loading,
  } = useFriends();

  const hasFriendRequests = receivedRequests.length > 0;

  const handleSendRequest = async (receiverId: string, message: string) => {
    try {
      await sendFriendRequest(receiverId, message);
      
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o pedido.');
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    try {
      await removeFriend(friendId);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível remover o amigo.');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);

    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aceitar o pedido.');
    }
  };

  const handleAcceptRequestWithStatus = async (requestId: string, senderId: string, status: any) => {
    try {
      await acceptFriendRequest(requestId);
      // Após aceitar, atualiza o status
      await updateFriendshipStatus(senderId, status);
      Alert.alert('Sucesso', `Pedido aceito e amigo marcado como ${status === 'close' ? 'melhor amigo' : status === 'blocked' ? 'bloqueado' : 'amigo comum'}!`);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aceitar o pedido.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      Alert.alert('Pedido rejeitado', 'O pedido foi recusado.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar o pedido.');
    }
  };

  const handleStatusChange = async (friendId: string, status: any) => {
    try {
      await updateFriendshipStatus(friendId, status);
      Alert.alert('Status atualizado', 'O status da amizade foi alterado com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o status.');
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { 
          color: theme.colors.primary,
          fontFamily: 'SansationBold',
        }]}>
          Amigos & Notificações
        </Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <Ionicons name="person-add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Friend Requests Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Pedidos de Amizade
          </Text>
          <FriendRequestsList
            requests={receivedRequests}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            onAcceptWithStatus={handleAcceptRequestWithStatus}
            loading={loading}
          />
        </View>

        {/* Friends List Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Meus Amigos
          </Text>
          <FriendsList
            friends={friends}
            onRemoveFriend={handleRemoveFriend}
            onFriendPress={(friend) => {
              // Navegar para perfil do amigo (implementar depois)
              console.log('Ver perfil de:', friend.name);
            }}
            onStatusChange={handleStatusChange}
          />
        </View>
      </ScrollView>

      <AddFriendModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={handleSendRequest}
      />

      <BottomNav tabs={BOTTOM_NAV_ICONS as any} />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginBottom: 28,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SansationBold',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  emptyMessage: {
    marginHorizontal: 20,
    fontSize: 14,
    fontFamily: 'SansationBold',
    opacity: 0.8,
  },
});
