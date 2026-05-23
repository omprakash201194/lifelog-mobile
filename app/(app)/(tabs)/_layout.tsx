import { Tabs } from 'expo-router'
import { Text, Platform } from 'react-native'
import { colors, radius, spacing } from '@/theme'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:     false,
        tabBarStyle: {
          backgroundColor:  colors.bgCard,
          borderTopColor:   colors.border,
          borderTopWidth:   1,
          paddingBottom:    Platform.OS === 'ios' ? spacing.lg : spacing.sm,
          paddingTop:       spacing.sm,
          height:           Platform.OS === 'ios' ? 82 : 60,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.text3,
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '500',
          marginTop:  2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title:    'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title:    'Habits',
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title:    'Timer',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⏱️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title:    'Tasks',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title:    'More',
          tabBarIcon: ({ focused }) => <TabIcon emoji="☰" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
