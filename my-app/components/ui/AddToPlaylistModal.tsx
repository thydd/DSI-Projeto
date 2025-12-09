import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/services/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from './CustomButton';
import { Drawer } from './Drawer';
import { addTrackToPlaylist } from '@/services/playlists';

type Props = {
  visible: boolean;
  onClose: () => void;
  track?: any | null;
  onAdded?: () => void;
};

export default function AddToPlaylistModal({ visible, onClose, track, onAdded }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setAddedPlaylists(new Set()); // Reset added state when opening
    let mounted = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      
      // 1. Buscar playlists do usuário
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('playlists')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (playlistsError) {
        console.error('fetch playlists for modal', playlistsError);
        setLoading(false);
        return;
      }

      // 2. Se tiver playlists e uma música selecionada, verificar em quais ela já está
      if (playlistsData && playlistsData.length > 0 && track?.track_id) {
        const playlistIds = playlistsData.map(p => p.id);
        
        const { data: existingData, error: existingError } = await supabase
          .from('playlist_tracks')
          .select('playlist_id')
          .eq('track_id', track.track_id)
          .in('playlist_id', playlistIds);

        if (existingError) {
          console.error('check existing tracks', existingError);
        } else if (existingData) {
          const existingSet = new Set(existingData.map(item => item.playlist_id));
          if (mounted) setAddedPlaylists(existingSet);
        }
      }

      if (mounted) setPlaylists(playlistsData ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [visible, user, track]);

  const addToPlaylist = async (playlistId: string, playlistName: string) => {
    if (!track) {
      Alert.alert('Erro', 'Nenhuma música selecionada');
      return;
    }
    
    if (addedPlaylists.has(playlistId)) return;

    setAddingId(playlistId);
    try {
      const result = await addTrackToPlaylist(playlistId, track.track_id);
      
      if (result.success) {
        setAddedPlaylists(prev => new Set(prev).add(playlistId));
        onAdded?.();
      } else {
        Alert.alert('Aviso', result.message || 'Não foi possível adicionar a música');
      }
    } catch (error) {
      console.error('Erro ao adicionar à playlist:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a música à playlist.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Drawer 
      visible={visible} 
      onClose={onClose} 
      title="Adicionar à Playlist"
      heightPercentage={0.75}
    >
      {/* Track Info */}
      {track && (
        <View style={[styles.trackInfoSection, { borderBottomColor: theme.colors.border }]}>
          <Ionicons name="musical-note" size={24} color={theme.colors.primary} />
          <View style={styles.trackDetails}>
            <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {track.track_name}
            </Text>
            <Text style={[styles.trackArtist, { color: theme.colors.muted }]} numberOfLines={1}>
              {track.track_artist}
            </Text>
          </View>
        </View>
      )}

          {/* Content */}
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.muted }]}>
                  Carregando playlists...
                </Text>
              </View>
            ) : playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={64} color={theme.colors.muted} />
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                  Você ainda não tem playlists
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.muted }]}>
                  Crie uma playlist na aba "Adicionar" para começar
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                  Selecione uma playlist
                </Text>
                <FlatList
                  data={playlists}
                  keyExtractor={(p) => String(p.id)}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.playlistItem,
                        { 
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                        }
                      ]}
                      onPress={() => addToPlaylist(item.id, item.name)}
                      disabled={addingId !== null}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={item.image_url ? { uri: item.image_url } : require('@/assets/images/icon.png')} 
                        style={[styles.playlistImage, { borderColor: theme.colors.border }]} 
                      />
                      <View style={styles.playlistInfo}>
                        <Text style={[styles.playlistName, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      {addingId === item.id ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : addedPlaylists.has(item.id) ? (
                        <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} />
                      ) : (
                        <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>

      {/* Actions */}
      {!loading && (
        <View style={styles.actionsContainer}>
          <CustomButton
            title="Fechar"
            onPress={onClose}
            width="100%"
            height={50}
            backgroundColor={theme.colors.background}
            textColor={theme.colors.text}
            style={{ borderWidth: 1, borderColor: theme.colors.border }}
          />
        </View>
      )}
    </Drawer>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
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
  trackInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: 'SansationBold',
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: 'Sansation',
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Sansation',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'SansationBold',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Sansation',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'SansationBold',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  playlistImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontFamily: 'SansationBold',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});
