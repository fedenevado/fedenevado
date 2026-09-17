import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Heart, Home, ListChecks, Plus } from 'lucide-react-native';
import { useAuth } from '@/auth/auth-context';
import { useBadges } from '@/badges/badge-context';

function PlusTabButton() {
  const router = useRouter();
  return (
    <View style={styles.plusWrap}>
      <Pressable
        onPress={() => router.push('/plan-form')}
        accessibilityRole="button"
        accessibilityLabel="Crear nuevo plan"
        style={styles.plusButton}
      >
        <Plus size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

function ProfileTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { user } = useAuth();
  const initials =
    (user?.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  return (
    <View style={[styles.avatar, focused && styles.avatarActive]}>
      <Text style={styles.avatarLabel}>{initials}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { amigosBadge, refreshBadges } = useBadges();

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#161B2E',
        tabBarInactiveTintColor: '#B8B2A0',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBadgeStyle: styles.tabBarBadge,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planes',
          tabBarIcon: ({ color, size }) => <ListChecks size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{ title: '', tabBarButton: () => <PlusTabButton /> }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Amigos',
          tabBarBadge: amigosBadge > 0 ? amigosBadge : undefined,
          tabBarIcon: ({ color, size, focused }) => <Heart size={size} color={color} fill={focused ? color : 'none'} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => <ProfileTabIcon color={String(color)} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { height: 64, paddingBottom: 8, paddingTop: 6 },
  tabBarLabel: { fontSize: 9, fontWeight: '600' },
  tabBarBadge: { backgroundColor: '#FF5A3C', color: '#fff', fontSize: 9, fontWeight: '700' },
  plusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: '#FF5A3C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarActive: { borderColor: '#161B2E' },
  avatarLabel: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
