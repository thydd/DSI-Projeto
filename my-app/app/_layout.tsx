import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import { ShowsProvider } from "../context/ShowsContext";
import { ReportsProvider } from "../context/ReportsContext";
import { ReviewsProvider } from "../context/ReviewsContext";

// Desabilita warnings do React Native em desenvolvimento
LogBox.ignoreAllLogs(true);

// Impede que a splash screen feche automaticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Carregar suas fontes personalizadas
  const [fontsLoaded] = useFonts({
    Sansation: require("../assets/fonts/Sansation-Regular.ttf"),
    SansationBold: require("../assets/fonts/Sansation-Bold.ttf"),
  });

  // Esconde a splash quando as fontes carregarem
  useEffect(() => {
    // Adicionamos uma verificação para garantir que fontsLoaded é true
    if (fontsLoaded === true) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Enquanto não carregar, não renderiza nada (fica na splash)
  if (!fontsLoaded) {
    return null; // A splash screen continuará visível
  }
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <ShowsProvider>
          <ReportsProvider>
            <ReviewsProvider>
              <NotificationsProvider>
                <StatusBar style="light" backgroundColor="transparent" translucent={true} />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </NotificationsProvider>
            </ReviewsProvider>
          </ReportsProvider>
        </ShowsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
