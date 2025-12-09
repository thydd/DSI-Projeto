import { useAuth } from '@/context/AuthContext';
import FriendService from '@/services/friends';
import type { FriendRequest, FriendWithProfile, FriendshipStatus } from '@/types/friends';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook customizado para gerenciar amigos e pedidos de amizade
 * OTIMIZADO: Com cache e carregamento lazy
 */
export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache para evitar recarregamentos desnecessários
  const lastLoadTime = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30 segundos

  /**
   * Carrega todos os dados de amigos
   * OTIMIZADO: Com cache de 30 segundos
   */
  const loadFriendsData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    // Verifica cache
    const now = Date.now();
    if (!forceRefresh && now - lastLoadTime.current < CACHE_DURATION) {
      return; // Usa dados em cache
    }

    setLoading(true);
    setError(null);

    try {
      // Carrega apenas amigos e count (mais rápido)
      const [friendsData, count] = await Promise.all([
        FriendService.getFriends(user.id),
        FriendService.countPendingRequests(user.id),
      ]);

      setFriends(friendsData);
      setPendingCount(count);
      lastLoadTime.current = now;
    } catch (err: any) {
      console.error('Erro ao carregar dados de amigos:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Carrega apenas pedidos recebidos (lazy loading)
   */
  const loadReceivedRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [data, count] = await Promise.all([
        FriendService.getReceivedRequests(user.id),
        FriendService.countPendingRequests(user.id),
      ]);
      setReceivedRequests(data);
      setPendingCount(count);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos recebidos:', err);
    }
  }, [user?.id]);
  
  /**
   * Carrega apenas pedidos enviados (lazy loading)
   */
  const loadSentRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await FriendService.getSentRequests(user.id);
      setSentRequests(data);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos enviados:', err);
    }
  }, [user?.id]);

  /**
   * Envia um pedido de amizade
   */
  const sendFriendRequest = useCallback(async (receiverId: string, message?: string) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const request = await FriendService.sendFriendRequest({
      sender_id: user.id,
      receiver_id: receiverId,
      message,
    });

    // Atualiza lista de pedidos enviados
    setSentRequests(prev => [request, ...prev]);

    return request;
  }, [user?.id]);

  /**
   * Aceita um pedido de amizade
   */
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    await FriendService.acceptFriendRequest(requestId, user.id);

    // Remove da lista de pedidos recebidos
    setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
    setPendingCount(prev => Math.max(0, prev - 1));

    // Recarrega lista de amigos
    const friendsData = await FriendService.getFriends(user.id);
    setFriends(friendsData);
  }, [user?.id]);

  /**
   * Rejeita um pedido de amizade
   */
  const rejectFriendRequest = useCallback(async (requestId: string) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    await FriendService.rejectFriendRequest(requestId, user.id);

    // Remove da lista de pedidos recebidos
    setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
    setPendingCount(prev => Math.max(0, prev - 1));
  }, [user?.id]);

  /**
   * Cancela um pedido enviado
   */
  const cancelFriendRequest = useCallback(async (requestId: string) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    await FriendService.cancelFriendRequest(requestId, user.id);

    // Remove da lista de pedidos enviados
    setSentRequests(prev => prev.filter(req => req.id !== requestId));
  }, [user?.id]);

  /**
   * Remove um amigo
   */
  const removeFriend = useCallback(async (friendId: string) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    await FriendService.removeFriend(user.id, friendId);

    // Remove da lista de amigos
    setFriends(prev => prev.filter(friend => friend.id !== friendId));
    
    // Invalida o cache para forçar recarregamento na próxima vez
    lastLoadTime.current = 0;
  }, [user?.id]);

  /**
   * Busca usuários por username
   */
  const searchUsers = useCallback(async (query: string) => {
    if (!user?.id) return [];
    return await FriendService.searchUsersByUsername(query, user.id);
  }, [user?.id]);

  /**
   * Verifica se é amigo de alguém
   */
  const checkIfFriends = useCallback(async (friendId: string) => {
    if (!user?.id) return false;
    return await FriendService.checkIfFriends(user.id, friendId);
  }, [user?.id]);

  /**
   * Atualiza o status da amizade
   */
  const updateFriendshipStatus = useCallback(async (friendId: string, status: FriendshipStatus) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    await FriendService.updateFriendshipStatus(user.id, friendId, status);
    
    // Atualiza o estado local
    setFriends(prevFriends => 
      prevFriends.map(friend => 
        friend.id === friendId 
          ? { ...friend, friendship_status: status }
          : friend
      )
    );

    // Invalida o cache para forçar recarregamento na próxima vez
    lastLoadTime.current = 0;
  }, [user?.id]);

  /**
   * Obtém o status da amizade
   */
  const getFriendshipStatus = useCallback(async (friendId: string): Promise<FriendshipStatus> => {
    if (!user?.id) return 'normal';
    return await FriendService.getFriendshipStatus(user.id, friendId);
  }, [user?.id]);

  /**
   * Obtém amigos por status
   */
  const getFriendsByStatus = useCallback(async (status: FriendshipStatus): Promise<FriendWithProfile[]> => {
    if (!user?.id) return [];
    return await FriendService.getFriendsByStatus(user.id, status);
  }, [user?.id]);

  // Carrega dados ao montar (amigos e pedidos recebidos)
  useEffect(() => {
    if (user?.id) {
      loadFriendsData();
      loadReceivedRequests();
    }
  }, [user?.id, loadFriendsData, loadReceivedRequests]);

  return {
    // Estado
    friends,
    receivedRequests,
    sentRequests,
    pendingCount,
    loading,
    error,
    
    // Ações
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    searchUsers,
    checkIfFriends,
    updateFriendshipStatus,
    getFriendshipStatus,
    getFriendsByStatus,
    
    // Recarregar (com opção de force refresh)
    refresh: (force = false) => loadFriendsData(force),
    refreshRequests: loadReceivedRequests,
    loadSentRequests, // Expõe para lazy loading
  };
}
