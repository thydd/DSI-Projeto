import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FriendshipStatus } from '@/types/friends';
import { useTheme } from '@/context/ThemeContext';

type FriendshipStatusMenuProps = {
  visible: boolean;
  onClose: () => void;
  currentStatus: FriendshipStatus;
  friendName: string;
  onStatusChange: (newStatus: FriendshipStatus) => Promise<void>;
};

export function FriendshipStatusMenu({
  visible,
  onClose,
  currentStatus,
  friendName,
  onStatusChange,
}: FriendshipStatusMenuProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const statusOptions: {
    value: FriendshipStatus;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
    color: string;
  }[] = [
    {
      value: 'normal',
      label: 'Amigo',
      icon: 'person-outline',
      description: 'Amigo comum',
      color: theme.colors.text,
    },
    {
      value: 'close',
      label: 'Melhor Amigo',
      icon: 'heart',
      description: 'Aparece em destaque na sua lista',
      color: '#e74c3c',
    },
    {
      value: 'blocked',
      label: 'Bloqueado',
      icon: 'ban',
      description: 'Bloquear este usuário',
      color: '#95a5a6',
    },
  ];

  const handleStatusChange = async (newStatus: FriendshipStatus) => {
    if (newStatus === currentStatus) {
      onClose();
      return;
    }

    // Confirmação para bloqueio
    if (newStatus === 'blocked') {
      Alert.alert(
        'Bloquear amigo',
        `Tem certeza que deseja bloquear ${friendName}? Vocês continuarão amigos, mas ele não verá suas atividades.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: () => confirmStatusChange(newStatus),
          },
        ]
      );
      return;
    }

    await confirmStatusChange(newStatus);
  };

  const confirmStatusChange = async (newStatus: FriendshipStatus) => {
    setLoading(true);
    try {
      await onStatusChange(newStatus);
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Status da Amizade</Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{friendName}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  { backgroundColor: theme.colors.background },
                  currentStatus === option.value && [styles.optionSelected, { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.primary 
                  }],
                ]}
                onPress={() => handleStatusChange(option.value)}
                disabled={loading}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={option.color}
                    style={styles.optionIcon}
                  />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{option.label}</Text>
                    <Text style={[styles.optionDescription, { color: theme.colors.muted }]}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                {currentStatus === option.value && (
                  <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { borderTopColor: theme.colors.border }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.muted }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  optionsContainer: {
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionSelected: {
    borderWidth: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  cancelButton: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
