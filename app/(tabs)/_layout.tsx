import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Capture', tabBarIcon: ({ color }) => <TabIcon icon="🎙️" color={color} /> }}
      />
      <Tabs.Screen
        name="ideas"
        options={{ title: 'Ideas', tabBarIcon: ({ color }) => <TabIcon icon="💡" color={color} /> }}
      />
      <Tabs.Screen
        name="journal"
        options={{ title: 'Journal', tabBarIcon: ({ color }) => <TabIcon icon="📔" color={color} /> }}
      />
      <Tabs.Screen
        name="meditate"
        options={{ title: 'Meditate', tabBarIcon: ({ color }) => <TabIcon icon="🧘" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === Colors.primary ? 1 : 0.5 }}>{icon}</Text>;
}
