import { Image as ImageIcon, CheckSquare, House, Settings as SettingsIcon } from 'lucide-react-native'
import { Tabs } from 'expo-router'
import { colors } from '../../constants/colors'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.cardBorder,
          height: 60,
        },
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ color }) => <House size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color }) => <CheckSquare size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vision"
        options={{
          tabBarIcon: ({ color }) => <ImageIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
