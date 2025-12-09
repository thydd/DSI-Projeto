import React, { useEffect, useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/services/supabaseConfig";
import { useTheme } from "@/context/ThemeContext";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BottomNav } from "@/components/navigation/BottomNav";
import { Ionicons } from "@expo/vector-icons";
import songsData from "@/assets/data/songs.json";
import { SearchHeader } from "./searchTabs/SearchHeader";
import { SearchResults, SearchResult } from "./searchTabs/SearchResults";
import AddToPlaylistModal from '@/components/ui/AddToPlaylistModal';
import { BOTTOM_NAV_ICONS } from '@/constants/navigation';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { playlistId, playlistName, returnTo } = params as { playlistId?: string; playlistName?: string; returnTo?: string };
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim() !== "") handleSearch(query);
      else setResults([]);
    }, 500);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = async (text: string) => {
    

    const lower = text.toLowerCase();

    const { data, error } = await supabase.from("tracks").
    select("*").or(`track_name.ilike.%${lower}%,track_artist.ilike.%${lower}%`).
    limit(20);
    if (error) {
      console.error("Supabase search error", error);
      return;
    }
    setResults(data || []);
    
  };

  const openAddModal = (item: SearchResult) => {
    // Se veio de uma playlist, adicionar diretamente
    if (playlistId) {
      addToSpecificPlaylist(item, playlistId);
    } else {
      // Caso contrário, abrir modal para escolher playlist
      setSelectedTrack(item);
      setModalVisible(true);
    }
  };

  const addToSpecificPlaylist = async (track: SearchResult, targetPlaylistId: string) => {
    setIsAddingToPlaylist(true);
    try {
      const payload = {
        playlist_id: targetPlaylistId,
        track_id: track.track_id,
        added_at: new Date().toISOString(),
      };
      
      const { error } = await supabase.from('playlist_tracks').insert(payload);
      
      if (error) {
        console.error('error adding to playlist', error);
        Alert.alert('Erro', 'Não foi possível adicionar a música à playlist.');
        return;
      }
      
      // Música adicionada com sucesso - voltar para a playlist específica
      if (returnTo === 'playlist') {
        router.replace(`/(tabs)/song/playlistInfo?id=${targetPlaylistId}` as any);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Erro ao adicionar música:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar a música.');
    } finally {
      setIsAddingToPlaylist(false);
    }
  };

  const closeAddModal = () => {
    setSelectedTrack(null);
    setModalVisible(false);
  };

  const handleAdded = () => {
    // noop for now; could show toast or refresh playlists
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header quando vindo de uma playlist */}
          {playlistId && (
            <View style={[styles.playlistHeader, { 
              backgroundColor: theme.colors.box,
              borderBottomColor: theme.colors.primary + '30'
            }]}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Adicionar música à
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.primary }]} numberOfLines={1}>
                  {decodeURIComponent(playlistName || 'playlist')}
                </Text>
              </View>
            </View>
          )}
          
          <SearchHeader query={query} onQueryChange={setQuery} />
          <SearchResults
            results={results}
            query={query}
            onItemPress={(item) => {
              // Se vier de uma playlist, não navegar para song info
              if (!playlistId) {
                router.push((`/(tabs)/song/${item.track_id}?from=search`) as any);
              }
            }}
            onAddPress={(item) => openAddModal(item)}
            isAddingMode={!!playlistId}
            isAddingToPlaylist={isAddingToPlaylist}
          />
        </View>

        <BottomNav tabs={BOTTOM_NAV_ICONS as any} />
        <AddToPlaylistModal visible={modalVisible} onClose={closeAddModal} track={selectedTrack} onAdded={handleAdded} />
      </KeyboardAvoidingView>
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
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Sansation',
  },
  headerSubtitle: {
    fontSize: 18,
    fontFamily: 'SansationBold',
  },
});