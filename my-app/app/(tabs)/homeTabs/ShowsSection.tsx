import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { CustomButton } from "@/components/ui/CustomButton";
import { EventFormModal, EventFormValues } from "@/components/ui/EventFormModal";
import { FiltersDrawer } from "@/components/ui/FiltersDrawer";
import { SearchDrawer } from "@/components/ui/SearchDrawer";
import { useAuth } from "@/context/AuthContext";
import { useShows } from "@/context/ShowsContext";
import { useTheme } from "@/context/ThemeContext";
import type { ShowEvent, ShowEventCreateInput, ShowEventUpdateInput } from "@/types/shows";
import { ShowsList } from "../showsTabs/ShowsList";
import { ShowsMap } from "../showsTabs/ShowsMap";

const DEFAULT_TITLE = "Mapa de Shows";
const DEFAULT_SUBTITLE =
  "Visualize os pontos que os artistas estão planejando para novas apresentações.";

type ShowsSectionProps = {
  title?: string;
  subtitle?: string;
};

type EventDraftInput = Omit<ShowEventCreateInput, "promoterId" | "promoterName">;

export function ShowsSection({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
}: ShowsSectionProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const {
    events,
    filteredEvents,
    status,
    source,
    error,
    filters,
    updateFilters,
    toggleGenre,
    toggleType,
    resetFilters,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useShows();

  const [selectedId, setSelectedId] = useState<string>(filteredEvents[0]?.id ?? "");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingEvent, setEditingEvent] = useState<ShowEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filtersDrawerVisible, setFiltersDrawerVisible] = useState(false);
  const [searchDrawerVisible, setSearchDrawerVisible] = useState(false);

  useEffect(() => {
    if (!filteredEvents.length) {
      setSelectedId("");
      return;
    }

    setSelectedId((currentId) => {
      const exists = filteredEvents.some((event) => event.id === currentId);
      return exists ? currentId : filteredEvents[0].id;
    });
  }, [filteredEvents]);

  const promoterId = useMemo(() => {
    if (!user) return null;
    return user.id ?? user.uid ?? user.user?.id ?? null;
  }, [user]);

  const canManage = useMemo(
    () => (event: ShowEvent) => !!promoterId && event.promoterId === promoterId,
    [promoterId]
  );

  const eventsToDisplay = filteredEvents.length ? filteredEvents : events;

  const handleCreate = async (values: EventFormValues) => {
    if (__DEV__) {
      console.log("\n=== INICIANDO CRIAÇÃO DE EVENTO ===");
      console.log("[ShowsSection] promoterId do usuário:", promoterId);
    }
    
    let payload: EventDraftInput;
    try {
      payload = mapFormToDraft(values);
      if (__DEV__) {
        console.log("[ShowsSection] Payload criado:", payload);
      }
    } catch (err) {
      if (__DEV__) {
        console.error("[ShowsSection] Erro ao mapear formulário:", err);
      }
      Alert.alert(
        "Dados inválidos",
        err instanceof Error ? err.message : "Verifique os campos e tente novamente."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createEvent(payload);
      if (__DEV__) {
        console.log("[ShowsSection] ✅ Evento criado com sucesso:", created);
        console.log("[ShowsSection] Evento salvo com promoterId:", created.promoterId);
        console.log("[ShowsSection] promoterId do usuário:", promoterId);
        console.log("[ShowsSection] IDs são iguais?", created.promoterId === promoterId);
        console.log("[ShowsSection] Ativando filtro 'Meus Eventos' e atualizando lista");
      }
      setModalMode(null);
      
      // Forçar refresh e ativar filtro para mostrar eventos do usuário
      await refresh({ silent: true });
      updateFilters({ showOnlyMine: true });
      
      if (__DEV__) {
        console.log("[ShowsSection] ✅ Filtro ativado. Eventos filtrados:", filteredEvents.length);
        console.log("=== FIM DA CRIAÇÃO ===\n");
      }
      
      setSelectedId(created.id);
    } catch (err) {
      if (__DEV__) {
        console.error("[ShowsSection] Erro ao criar evento:", err);
      }
      Alert.alert(
        "Não foi possível criar",
        err instanceof Error ? err.message : "Tente novamente em instantes."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: EventFormValues) => {
    if (!editingEvent) return;

    let payload: ShowEventUpdateInput;
    try {
      payload = mapFormToUpdate(editingEvent.id, values);
    } catch (err) {
      Alert.alert(
        "Dados inválidos",
        err instanceof Error ? err.message : "Verifique os campos e tente novamente."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await updateEvent(payload);
      setEditingEvent(null);
      setModalMode(null);
      setSelectedId(updated.id);
    } catch (err) {
      Alert.alert(
        "Não foi possível salvar",
        err instanceof Error ? err.message : "Tente novamente em instantes."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (event: ShowEvent) => {
    Alert.alert(
      "Remover evento",
      `Deseja remover o evento "${event.title}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              if (selectedId === event.id) {
                setSelectedId("");
              }
            } catch (err) {
              Alert.alert(
                "Não foi possível excluir",
                err instanceof Error ? err.message : "Tente novamente em instantes."
              );
            }
          },
        },
      ]
    );
  };

  const isModalVisible = modalMode !== null;

  const activeFiltersCount = useMemo(() => {
    return (
      filters.types.length +
      filters.genres.length +
      (filters.search.trim().length > 0 ? 1 : 0) +
      (filters.showOnlyMine ? 1 : 0) +
      (filters.includePast ? 1 : 0)
    );
  }, [filters]);

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>
        ) : null}
        
        {/* Linha 1: Botões principais */}
        <View style={styles.mainActions}>
          <CustomButton
            title="+ Criar Evento"
            onPress={() => {
              setEditingEvent(null);
              setModalMode("create");
            }}
            width="auto"
            height={50}
            backgroundColor={theme.colors.primary}
            textColor="#FFFFFF"
            style={styles.primaryButton}
          />
          <CustomButton
            title={`Filtros${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}`}
            onPress={() => setFiltersDrawerVisible(true)}
            width="auto"
            height={50}
            backgroundColor={activeFiltersCount > 0 ? theme.colors.primary : theme.colors.card}
            textColor={activeFiltersCount > 0 ? "#FFFFFF" : theme.colors.primary}
            style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
          />
        </View>

        {/* Linha 2: Botão atualizar menor */}
        <View style={styles.refreshRow}>
          <CustomButton
            title={status === "loading" ? "Atualizando..." : "↻ Atualizar"}
            onPress={() => refresh({ silent: true })}
            width="auto"
            height={32}
            backgroundColor="transparent"
            textColor={theme.colors.muted}
            style={styles.refreshButton}
            disabled={status === "loading"}
          />
          {status === "loading" && (
            <Text style={[styles.loadingHint, { color: theme.colors.muted }]}>
              Carregando eventos...
            </Text>
          )}
        </View>
      </View>

      {/* Mapa */}
      {eventsToDisplay.length ? (
        <ShowsMap 
          events={eventsToDisplay} 
          activeId={selectedId} 
          onSelect={setSelectedId}
          onOpenSearch={() => setSearchDrawerVisible(true)}
          onOpenFilters={() => setFiltersDrawerVisible(true)}
          filtersCount={activeFiltersCount}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.colors.muted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.primary }]}>Nenhum evento encontrado</Text>
          <Text style={[styles.emptyMessage, { color: theme.colors.muted }]}>
            Ajuste os filtros ou crie um novo evento para preencher o mapa.
          </Text>
        </View>
      )}

      {eventsToDisplay.length ? (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Eventos</Text>
          <Text style={[styles.sectionHint, { color: theme.colors.muted }]}>Toque em um cartão para destacar no mapa.</Text>
        </View>
      ) : null}

      {filteredEvents.length ? (
        <ShowsList
          data={filteredEvents}
          activeId={selectedId}
          onSelect={setSelectedId}
          onEdit={(event) => {
            setEditingEvent(event);
            setModalMode("edit");
          }}
          onDelete={handleDelete}
          canManage={canManage}
        />
      ) : null}

     

      <EventFormModal
        visible={isModalVisible}
        mode={modalMode ?? "create"}
        initialEvent={modalMode === "edit" ? editingEvent ?? undefined : undefined}
        onSubmit={(values) => (modalMode === "edit" ? handleUpdate(values) : handleCreate(values))}
        onClose={() => {
          setModalMode(null);
          setEditingEvent(null);
        }}
        isSubmitting={isSubmitting}
      />

      <FiltersDrawer
        visible={filtersDrawerVisible}
        filters={filters}
        onApply={(newFilters) => {
          updateFilters(newFilters);
        }}
        onReset={resetFilters}
        onClose={() => setFiltersDrawerVisible(false)}
      />

      <SearchDrawer
        visible={searchDrawerVisible}
        onClose={() => setSearchDrawerVisible(false)}
        searchValue={filters.search}
        onSearchChange={(text) => updateFilters({ search: text })}
        onClearSearch={() => updateFilters({ search: "" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
  },
  title: {
    fontFamily: "SansationBold",
    fontSize: 28,
  },
  subtitle: {
    fontFamily: "Sansation",
    fontSize: 15,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  mainActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  secondaryButton: {
    flex: 1,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 14,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  refreshButton: {
    paddingHorizontal: 12,
  },
  createButton: {
    paddingHorizontal: 18,
  },
  loadingHint: {
    fontFamily: "Sansation",
    fontSize: 12,
  },
  emptyContainer: {
    marginTop: 30,
    paddingHorizontal: 24,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "SansationBold",
    fontSize: 20,
  },
  emptyMessage: {
    fontFamily: "Sansation",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginTop: 12,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: "SansationBold",
    fontSize: 20,
  },
  sectionHint: {
    fontFamily: "Sansation",
    fontSize: 14,
  },
});

function mapFormToDraft(values: EventFormValues): EventDraftInput {
  const latitude = parseCoordinate(values.latitude, "latitude");
  const longitude = parseCoordinate(values.longitude, "longitude");
  const startsAt = normalizeRequiredDate(values.startsAt, "início");
  const endsAt = normalizeOptionalDate(values.endsAt, "término");

  return {
    title: values.title.trim(),
    description: toNullableString(values.description),
    eventType: values.eventType,
    genres: values.genres,
    locationName: values.locationName.trim(),
    address: toNullableString(values.address) ?? undefined,
    city: values.city.trim(),
    state: toNullableString(values.state) ?? undefined,
    country: toNullableString(values.country) ?? "Brasil",
    latitude,
    longitude,
    startsAt,
    endsAt: endsAt ?? undefined,
    ticketsUrl: toNullableString(values.ticketsUrl) ?? undefined,
    promoterAvatarUrl: undefined,
    promoterContact: toNullableString(values.promoterContact) ?? undefined,
    isPublic: values.isPublic,
  };
}

function mapFormToUpdate(id: string, values: EventFormValues): ShowEventUpdateInput {
  const latitude = parseCoordinate(values.latitude, "latitude");
  const longitude = parseCoordinate(values.longitude, "longitude");
  const startsAt = normalizeRequiredDate(values.startsAt, "início");
  const endsAt = normalizeOptionalDate(values.endsAt, "término");

  return {
    id,
    title: values.title.trim(),
    description: toNullableString(values.description),
    eventType: values.eventType,
    genres: values.genres,
    locationName: values.locationName.trim(),
    address: toNullableString(values.address),
    city: values.city.trim(),
    state: toNullableString(values.state),
    country: toNullableString(values.country),
    latitude,
    longitude,
    startsAt,
    endsAt,
    ticketsUrl: toNullableString(values.ticketsUrl),
    promoterContact: toNullableString(values.promoterContact),
    isPublic: values.isPublic,
  };
}

function parseCoordinate(value: string, field: string) {
  const normalized = value.trim().replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Informe um valor numérico válido para ${field}.`);
  }
  return numeric;
}

function normalizeRequiredDate(value: string, field: string) {
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error(`Informe a data e horário de ${field}.`);
  }
  const normalized = trimmed.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Não foi possível interpretar a data de ${field}.`);
  }
  return date.toISOString();
}

function normalizeOptionalDate(value: string, field: string) {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const normalized = trimmed.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Não foi possível interpretar a data de ${field}.`);
  }
  return date.toISOString();
}

function toNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
