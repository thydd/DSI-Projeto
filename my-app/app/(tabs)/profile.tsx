import { BottomNav } from '@/components/navigation/BottomNav';
import { HorizontalCarousel } from '@/components/ui/HorizontalCarousel';
import { UpdateProfileModal } from '@/components/ui/UpdateProfileModal';
import { DEFAULT_PLAYLIST_COVER_URL } from '@/constants/images';
import { BOTTOM_NAV_ICONS } from '@/constants/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useTheme } from '@/context/ThemeContext';
import { updateProfile } from '@/services/profiles';
import { supabase } from '@/services/supabaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/*
  Refactored profile screen: small hooks + small components kept in-file
  - fetch profile & playlists with simple hooks
  - wire UpdateProfileModal and AddFriendModal
  - avoids verbose inline logic
*/

function useProfile(user: any) {
  const [profile, setProfile] = useState<any | null>(null);
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('name,username,avatar_url').eq('id', user.id).maybeSingle();
      if (error) console.error('fetch profile error', error);
      if (mounted) setProfile(data ?? null);
    })();
    return () => { mounted = false; };
  }, [user]);
  return profile;
}

function useUserPlaylists(user: any) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  
  const fetchPlaylists = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('playlists')
      .select('id, name, image_url, is_public, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('fetch playlists error', error);
    setPlaylists(data ?? []);
  };

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  // Recarrega playlists quando a tela ganha foco
  useFocusEffect(
    React.useCallback(() => {
      fetchPlaylists();
    }, [user])
  );

  return playlists;
}

function UserHeader({ name, photo, username, onEdit, onManageFriends }: { name: string; photo: string | null; username?: string | null; onEdit: () => void; onManageFriends: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.actionButton, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.primary,
          }]} 
          onPress={onManageFriends}
          activeOpacity={0.7}
          accessibilityLabel="Gerenciar amigos"
        >
          <Ionicons name="people" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.avatarContainer, {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
      }]}>
        <Image 
          source={photo ? { uri: photo } : require('@/assets/images/icon.png')} 
          style={[styles.avatar, { borderColor: theme.colors.primary }]} 
        />
        <TouchableOpacity 
          style={[styles.editAvatarButton, { 
            backgroundColor: theme.colors.primary,
          }]} 
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={18} color={theme.colors.background} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{name}</Text>
        {username && (
          <View style={[styles.codeBadge, { 
            borderColor: theme.colors.primary, 
            backgroundColor: theme.colors.card,
          }]}>
            <Ionicons name="at" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.codeText, { color: theme.colors.primary }]}>
              {username}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function UserPlaylistCard({ item, index, onPress }: { item: any; index: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity 
      style={userStyles.playlistCard}
      onPress={onPress}
      activeOpacity={0.85}
    > 
      <View style={userStyles.imageContainer}>
        <Image 
          source={{ uri: item.image_url || DEFAULT_PLAYLIST_COVER_URL }}
          defaultSource={{ uri: DEFAULT_PLAYLIST_COVER_URL }}
          style={userStyles.playlistImage} 
        />
      </View>
      <View style={userStyles.textContainer}>
        <Text style={[userStyles.playlistTitle, { 
          color: theme.colors.text,
          fontFamily: 'SansationBold',
        }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[userStyles.playlistMeta, { 
          color: theme.colors.muted,
          fontFamily: 'Sansation',
        }]} numberOfLines={1}>
          {item.is_public ? 'Pública' : 'Privada'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Profile() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const notifications = useNotifications();
  const router = useRouter();

  const profile = useProfile(user);
  const playlists = useUserPlaylists(user);

  const [profileData, setProfileData] = useState<any | null>(null);
  useEffect(() => {
    setProfileData(profile);
  }, [profile]);

  const displayName = useMemo(() => profileData?.name ?? user?.user_metadata?.name ?? user?.email ?? '', [profileData, user]);
  const avatar = useMemo(() => profileData?.avatar_url ?? null, [profileData]);
  const username = useMemo(() => profileData?.username ?? null, [profileData]);

  // modal states
  const [isEditVisible, setEditVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const openEdit = () => setEditVisible(true);
  const closeEdit = () => setEditVisible(false);
  
  const handleManageFriends = () => {
    router.push('/(tabs)/friends' as any);
  };

  const handleSaveProfile = async (name: string, photo: string | null) => {
    if (!user) return;
    setIsUpdating(true);
    try {
  await updateProfile(user.id, { name, avatar_url: photo ?? undefined });
      // Perfil atualizado com sucesso - recarregar dados
      const { data, error } = await supabase.from('profiles').select('name,username,avatar_url').eq('id', user.id).maybeSingle();
      if (!error) setProfileData(data ?? null);
    } catch (err: any) {
      Alert.alert('Erro ao atualizar perfil', err.message || 'Tente novamente.');
    } finally {
      setIsUpdating(false);
      closeEdit();
    }
  };

  const handleAddFriend = async (receiverId: string, message?: string) => {
    // Esta função não é mais usada, pode ser removida
    console.warn('handleAddFriend deprecated - use friends screen');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair da conta. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Botão de Logout circular no topo */}
        <TouchableOpacity 
          style={[styles.logoutButton, { 
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.primary,
          }]}
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityLabel="Sair da conta"
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <UserHeader 
            name={displayName} 
            photo={avatar} 
            username={username} 
            onEdit={openEdit} 
            onManageFriends={handleManageFriends}
          />
          
          <View style={[styles.separator, { backgroundColor: theme.colors.muted + '40' }]} />

          <View style={styles.playlistsSection}>
            <Text style={[styles.sectionTitle, { 
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamily.bold,
            }]}>
              Minhas Playlists
            </Text>
            {playlists.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={48} color={theme.colors.muted} />
                <Text style={[styles.emptyText, { 
                  color: theme.colors.muted,
                  fontFamily: theme.typography.fontFamily.regular,
                }]}>
                  Você ainda não criou playlists
                </Text>
              </View>
            ) : (
              <HorizontalCarousel 
                data={playlists} 
                renderItem={({ item, index }) => (
                  <UserPlaylistCard 
                    item={item} 
                    index={index} 
                    onPress={() => router.push(`/song/playlistInfo?id=${item.id}` as any)}
                  />
                )} 
                itemWidth={140} 
                gap={16} 
                style={{ height: 220 }} 
              />
            )}
          </View>
        </ScrollView>

        <UpdateProfileModal 
          visible={isEditVisible} 
          onClose={closeEdit} 
          onSave={handleSaveProfile} 
          currentName={profileData?.name ?? ''} 
          currentPhoto={avatar} 
        />

        <BottomNav tabs={BOTTOM_NAV_ICONS as any} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  actionsRow: {
    position: 'absolute',
    top: 16,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 26,
    fontFamily: 'SansationBold',
    marginBottom: 12,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  codeText: {
    fontFamily: 'SansationBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    width: '88%',
    alignSelf: 'center',
    marginVertical: 20,
  },
  playlistsSection: {
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SansationBold',
    marginLeft: 16,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Sansation',
  },
  logoutButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

const userStyles = StyleSheet.create({
  playlistCard: {
    width: 140,
    marginRight: 0,
  },
  imageContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    paddingHorizontal: 4,
    gap: 4,
  },
  playlistTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  playlistMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
});
