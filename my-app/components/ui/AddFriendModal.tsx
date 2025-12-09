import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FriendService from '@/services/friends';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomButton } from './CustomButton';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (receiverId: string, message: string) => void;
}

type SearchUser = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
};

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ visible, onClose, onAdd }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Busca usuários quando o query muda (com debounce)
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setMessage('');
      setSearchError(null);
      return;
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (!user?.id) return;
      setSearching(true);
      setSearchError(null);
      try {
        // Busca por username
        const results = await FriendService.searchUsersByUsername(searchQuery, user.id);
        if (results.length === 0) {
          setSearchError('Nenhum usuário encontrado');
        }
        setSearchResults(results);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setSearchError('Erro ao buscar usuários');
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, visible, user?.id]);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAdd = () => {
    if (!selectedUser) return;
    onAdd(selectedUser.id, message.trim());
    setSearchQuery('');
    setMessage('');
    setSelectedUser(null);
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.drawerContainer, { backgroundColor: theme.colors.card }]}>
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
              Adicionar Amigo
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoSection}>
              <Ionicons name="person-add" size={48} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                Envie uma solicitação de amizade
              </Text>
              <Text style={[styles.infoSubtext, { color: theme.colors.muted }]}>
                Digite o @ (username) do usuário que você quer adicionar
              </Text>
            </View>

            <View style={styles.formSection}>
              {!selectedUser ? (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                    Buscar Usuário
                  </Text>
                  <View style={styles.searchContainer}>
                    <TextInput
                      placeholder="Digite o username (ex: @usuario)..."
                      placeholderTextColor={theme.colors.muted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={[
                        styles.input, 
                        { 
                          color: theme.colors.text, 
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                        }
                      ]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searching && (
                      <ActivityIndicator 
                        size="small" 
                        color={theme.colors.primary} 
                        style={styles.searchSpinner}
                      />
                    )}
                  </View>

                  {/* Mensagem de erro */}
                  {searchError && !searching && (
                    <View style={[styles.errorContainer, { 
                      backgroundColor: theme.colors.error + '20',
                      borderColor: theme.colors.error,
                    }]}>
                      <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                      <Text style={[styles.errorText, { color: theme.colors.error }]}>
                        {searchError}
                      </Text>
                    </View>
                  )}

                  {/* Resultados da busca */}
                  {searchResults.length > 0 && (
                    <View style={[styles.resultsContainer, { 
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    }]}>
                      {searchResults.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                          onPress={() => handleSelectUser(user)}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={user.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/icon.png')}
                            style={styles.resultAvatar}
                          />
                          <View style={styles.resultInfo}>
                            <Text style={[styles.resultName, { color: theme.colors.text }]}>
                              {user.name}
                            </Text>
                            <Text style={[styles.resultUsername, { color: theme.colors.primary }]}>
                              @{user.username}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                    Usuário Selecionado
                  </Text>
                  <View style={[styles.selectedUserCard, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.primary,
                  }]}>
                    <Image
                      source={selectedUser.avatar_url ? { uri: selectedUser.avatar_url } : require('@/assets/images/icon.png')}
                      style={styles.selectedAvatar}
                    />
                    <View style={styles.selectedInfo}>
                      <Text style={[styles.selectedName, { color: theme.colors.text }]}>
                        {selectedUser.name}
                      </Text>
                      <Text style={[styles.selectedUsername, { color: theme.colors.primary }]}>
                        @{selectedUser.username}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedUser(null)}>
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={[styles.sectionLabel, { color: theme.colors.text, marginTop: 20 }]}>
                Mensagem (opcional)
              </Text>
              <TextInput
                placeholder="Adicione uma mensagem..."
                placeholderTextColor={theme.colors.muted}
                value={message}
                onChangeText={setMessage}
                multiline
                style={[
                  styles.messageInput, 
                  { 
                    color: theme.colors.text, 
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  }
                ]}
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: theme.colors.muted }]}>
                {message.length}/200
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <CustomButton
              title="Cancelar"
              onPress={onClose}
              width="auto"
              height={52}
              backgroundColor={theme.colors.background}
              textColor={theme.colors.text}
              style={[styles.actionButton, { borderWidth: 1, borderColor: theme.colors.border }]}
            />
            <CustomButton
              title="Enviar Solicitação"
              onPress={handleAdd}
              disabled={!selectedUser}
              width="auto"
              height={52}
              backgroundColor={theme.colors.primary}
              textColor="#FFFFFF"
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'SansationBold',
    fontSize: 20,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoSection: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoText: {
    fontSize: 18,
    fontFamily: 'SansationBold',
    marginTop: 12,
    textAlign: 'center',
  },
  infoSubtext: {
    fontSize: 14,
    fontFamily: 'Sansation',
    marginTop: 8,
    textAlign: 'center',
  },
  formSection: {
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'SansationBold',
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Sansation',
  },
  messageInput: {
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Sansation',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  searchContainer: {
    position: 'relative',
  },
  searchSpinner: {
    position: 'absolute',
    right: 16,
    top: 15,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Sansation',
    flex: 1,
  },
  resultsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 250,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontFamily: 'SansationBold',
  },
  resultUsername: {
    fontSize: 13,
    fontFamily: 'Sansation',
    marginTop: 2,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  selectedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 17,
    fontFamily: 'SansationBold',
  },
  selectedUsername: {
    fontSize: 14,
    fontFamily: 'Sansation',
    marginTop: 4,
  },
});
