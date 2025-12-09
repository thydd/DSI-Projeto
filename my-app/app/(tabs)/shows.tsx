import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/navigation/BottomNav";
import { BOTTOM_NAV_ICONS } from '@/constants/navigation';
import { useTheme } from "@/context/ThemeContext";
import { ShowsSection } from "./showsTabs/ShowsSection";

export default function ShowsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          <ShowsSection />
        </ScrollView>

        <BottomNav tabs={BOTTOM_NAV_ICONS as any} />
      </View>
    </SafeAreaView>
  );
}
