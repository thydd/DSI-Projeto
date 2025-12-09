import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { UPCOMING_SHOWS } from "@/constants/shows";
import { useAuth } from "@/context/AuthContext";
import {
  createEvent as createEventService,
  deleteEvent as deleteEventService,
  fetchEvents as fetchEventsService,
  updateEvent as updateEventService,
} from "@/services/events";
import { getProfile } from "@/services/profiles";
import {
  EventGenre,
  EventType,
  ShowEvent,
  ShowEventCreateInput,
  ShowEventUpdateInput,
} from "@/types/shows";

type ShowsStatus = "idle" | "loading" | "ready" | "error";
type ShowsSource = "remote" | "fallback";

type EventsFilterState = {
  search: string;
  types: EventType[];
  genres: EventGenre[];
  showOnlyMine: boolean;
  includePast: boolean;
};

type EventDraftInput = Omit<ShowEventCreateInput, "promoterId" | "promoterName">;

type ShowsContextValue = {
  events: ShowEvent[];
  filteredEvents: ShowEvent[];
  status: ShowsStatus;
  source: ShowsSource;
  error: string | null;
  filters: EventsFilterState;
  updateFilters: (patch: Partial<EventsFilterState>) => void;
  toggleGenre: (genre: EventGenre) => void;
  toggleType: (type: EventType) => void;
  resetFilters: () => void;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  createEvent: (input: EventDraftInput) => Promise<ShowEvent>;
  updateEvent: (payload: ShowEventUpdateInput) => Promise<ShowEvent>;
  deleteEvent: (id: string) => Promise<void>;
  lastUpdated: string | null;
};

const DEFAULT_FILTERS: EventsFilterState = {
  search: "",
  types: [],
  genres: [],
  showOnlyMine: false,
  includePast: false,
};

const ShowsContext = createContext<ShowsContextValue | undefined>(undefined);

export function ShowsProvider({ children }: { children: React.ReactNode }) {
  const { user, userCode } = useAuth();
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  const promoterId = useMemo(() => {
    if (!user) return null;
    return user.id ?? user.uid ?? user.user?.id ?? null;
  }, [user]);

  // Buscar username do profile
  useEffect(() => {
    async function loadProfileUsername() {
      if (!promoterId) {
        setProfileUsername(null);
        return;
      }
      
      try {
        const profile = await getProfile(promoterId);
        if (profile?.username) {
          setProfileUsername(profile.username);
        }
      } catch (error) {
        console.error('Erro ao buscar username do profile:', error);
      }
    }

    loadProfileUsername();
  }, [promoterId]);

  const promoterName = useMemo(() => {
    if (!user) return "";
    return (
      profileUsername ||
      user.user_metadata?.name ||
      user.displayName ||
      user.email ||
      userCode ||
      "Organizador"
    );
  }, [user, userCode, profileUsername]);

  const promoterAvatarUrl = useMemo(() => {
    if (!user) return null;
    return user.user_metadata?.avatar_url ?? user.photoURL ?? null;
  }, [user]);

  const promoterContact = useMemo(() => {
    if (!user) return null;
    return user.email ?? user.user_metadata?.contact ?? null;
  }, [user]);

  const [events, setEvents] = useState<ShowEvent[]>(UPCOMING_SHOWS);
  const [status, setStatus] = useState<ShowsStatus>(UPCOMING_SHOWS.length ? "ready" : "idle");
  const [source, setSource] = useState<ShowsSource>("fallback");
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadEvents = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setStatus("loading");
      }

      try {
        if (__DEV__) {
          console.log("[ShowsContext] Carregando eventos do Supabase...");
        }
        const remoteEvents = await fetchEventsService({
          includePrivate: Boolean(promoterId),
        });
        if (__DEV__) {
          console.log("[ShowsContext] Eventos carregados:", remoteEvents.length);
          console.log("[ShowsContext] promoterId do usuário logado:", promoterId);
          if (remoteEvents.length > 0) {
            console.log("[ShowsContext] Primeiro evento:", remoteEvents[0]);
            console.log("[ShowsContext] promoterIds de todos os eventos:", remoteEvents.map(e => ({
              title: e.title,
              promoterId: e.promoterId,
              match: e.promoterId === promoterId
            })));
          }
        }
        setEvents(remoteEvents);
        setSource("remote");
        setError(null);
      } catch (err) {
        if (__DEV__) {
          console.error("[ShowsContext] Falha ao carregar eventos remotos:", err);
        }
        setEvents(UPCOMING_SHOWS);
        setSource("fallback");
        setError(
          err instanceof Error ? err.message : "Não foi possível carregar os eventos agora."
        );
      } finally {
        setStatus("ready");
        setLastUpdated(new Date().toISOString());
      }
    },
    [promoterId]
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;
      await loadEvents();
    })();

    return () => {
      isMounted = false;
    };
  }, [loadEvents]);

  const filteredEvents = useMemo(
    () => applyFilters(events, filters, promoterId),
    [events, filters, promoterId]
  );

  const updateFilters = useCallback((patch: Partial<EventsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleGenre = useCallback((genre: EventGenre) => {
    setFilters((prev) => {
      const exists = prev.genres.includes(genre);
      return {
        ...prev,
        genres: exists ? prev.genres.filter((item) => item !== genre) : [...prev.genres, genre],
      };
    });
  }, []);

  const toggleType = useCallback((type: EventType) => {
    setFilters((prev) => {
      const exists = prev.types.includes(type);
      return {
        ...prev,
        types: exists ? prev.types.filter((item) => item !== type) : [...prev.types, type],
      };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const createEvent = useCallback(
    async (input: EventDraftInput) => {
      if (!promoterId || !promoterName) {
        throw new Error("É preciso estar autenticado para criar um evento.");
      }

      if (__DEV__) {
        console.log("[ShowsContext] createEvent - promoterId:", promoterId, "tipo:", typeof promoterId);
        console.log("[ShowsContext] createEvent - promoterName:", promoterName);
      }

      setStatus("loading");

      try {
        const created = await createEventService({
          ...input,
          promoterId,
          promoterName,
          promoterAvatarUrl: promoterAvatarUrl ?? undefined,
          promoterContact: promoterContact ?? undefined,
        });

        if (__DEV__) {
          console.log("[ShowsContext] createEvent SUCCESS - evento criado:", created);
          console.log("[ShowsContext] createEvent SUCCESS - promoterId do evento:", created.promoterId, "tipo:", typeof created.promoterId);
          console.log("[ShowsContext] createEvent SUCCESS - promoterId do usuário:", promoterId, "tipo:", typeof promoterId);
          console.log("[ShowsContext] createEvent SUCCESS - IDs são iguais?", created.promoterId === promoterId);
        }

        setEvents((prev) => [created, ...prev]);
        setSource("remote");
        setError(null);
        setLastUpdated(new Date().toISOString());
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Não foi possível criar o evento.";
        setError(message);
        throw err;
      } finally {
        setStatus("ready");
      }
    },
    [promoterAvatarUrl, promoterContact, promoterId, promoterName]
  );

  const updateEvent = useCallback(
    async (payload: ShowEventUpdateInput) => {
      if (!promoterId) {
        throw new Error("É preciso estar autenticado para editar um evento.");
      }

      const current = events.find((event) => event.id === payload.id);
      if (current && current.promoterId !== promoterId) {
        throw new Error("Você só pode editar eventos que criou.");
      }

      setStatus("loading");

      try {
        const updated = await updateEventService({
          ...payload,
          promoterName: promoterName || current?.promoterName || undefined,
        });

        setEvents((prev) =>
          prev.map((event) => (event.id === updated.id ? { ...event, ...updated } : event))
        );
        setError(null);
        setLastUpdated(new Date().toISOString());
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Não foi possível atualizar o evento.";
        setError(message);
        throw err;
      } finally {
        setStatus("ready");
      }
    },
    [events, promoterId, promoterName]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!promoterId) {
        throw new Error("É preciso estar autenticado para remover um evento.");
      }

      const current = events.find((event) => event.id === id);
      if (current && current.promoterId !== promoterId) {
        throw new Error("Você só pode remover eventos que criou.");
      }

      setStatus("loading");

      try {
        await deleteEventService(id);
        setEvents((prev) => prev.filter((event) => event.id !== id));
        setError(null);
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Não foi possível remover o evento.";
        setError(message);
        throw err;
      } finally {
        setStatus("ready");
      }
    },
    [events, promoterId]
  );

  const contextValue = useMemo<ShowsContextValue>(
    () => ({
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
      refresh: loadEvents,
      createEvent,
      updateEvent,
      deleteEvent,
      lastUpdated,
    }),
    [
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
      loadEvents,
      createEvent,
      updateEvent,
      deleteEvent,
      lastUpdated,
    ]
  );

  return <ShowsContext.Provider value={contextValue}>{children}</ShowsContext.Provider>;
}

export function useShows() {
  const context = useContext(ShowsContext);

  if (!context) {
    throw new Error("useShows precisa ser utilizado dentro de ShowsProvider");
  }

  return context;
}

function applyFilters(
  events: ShowEvent[],
  filters: EventsFilterState,
  promoterId: string | null
): ShowEvent[] {
  if (!events.length) {
    return [];
  }

  if (__DEV__ && filters.showOnlyMine) {
    console.log("[ShowsContext] applyFilters - Total de eventos:", events.length);
    console.log("[ShowsContext] applyFilters - promoterId do usuário:", promoterId);
    console.log("[ShowsContext] applyFilters - Filtro showOnlyMine ativo:", filters.showOnlyMine);
  }

  const normalizedSearch = filters.search.trim().toLowerCase();
  const now = Date.now();

  const filtered = events.filter((event) => {
    if (!filters.includePast) {
      const endTime = Date.parse(event.endsAt ?? event.startsAt);
      if (!Number.isNaN(endTime) && endTime < now) {
        return false;
      }
    }

    if (filters.showOnlyMine && promoterId) {
      const match = event.promoterId === promoterId;
      if (__DEV__) {
        console.log("[ShowsContext] Filtrando evento:", event.title);
        console.log("  - promoterId do evento:", event.promoterId, "(tipo:", typeof event.promoterId, ")");
        console.log("  - promoterId do usuário:", promoterId, "(tipo:", typeof promoterId, ")");
        console.log("  - Match:", match);
      }
      if (!match) {
        return false;
      }
    }

    if (filters.types.length && !filters.types.includes(event.eventType)) {
      return false;
    }

    if (
      filters.genres.length &&
      !event.genres.some((genre) => filters.genres.includes(genre))
    ) {
      return false;
    }

    if (normalizedSearch) {
      const haystack = [
        event.title,
        event.description,
        event.locationName,
        event.city,
        event.state,
        event.promoterName,
        event.genres.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });

  if (__DEV__ && filters.showOnlyMine) {
    console.log("[ShowsContext] applyFilters - Eventos após filtro:", filtered.length);
    if (filtered.length > 0) {
      console.log("[ShowsContext] applyFilters - Primeiro evento filtrado:", {
        id: filtered[0].id,
        title: filtered[0].title,
        promoterId: filtered[0].promoterId
      });
    }
  }

  return filtered;
}
