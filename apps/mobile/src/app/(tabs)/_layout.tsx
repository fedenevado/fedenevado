import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import { Heart, Home, ListChecks, Plus } from 'lucide-react-native';
import { useAuth } from '@/auth/auth-context';
import { useBadges } from '@/badges/badge-context';

// Cabecera de marca común a las 4 pestañas (como en el prototipo: tocar el
// logo vuelve a Inicio). Gestiona el safe area superior, así que las
// pantallas de pestaña no suman `insets.top` por su cuenta.
function BrandHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => router.navigate('/home')}
        accessibilityRole="button"
        accessibilityLabel="Cantixplora, ir a Inicio"
        style={styles.headerLogoButton}
      >
        <Image source={require('../../../assets/cantixplora-txt.png')} style={styles.headerLogo} resizeMode="contain" />
      </Pressable>
    </View>
  );
}

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
        header: () => <BrandHeader />,
        tabBarActiveTintColor: '#2D1E1B',
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
          tabBarIcon: ({ color, size, focused }) => <Home size={size} color={color} fill={focused ? color : 'none'} />,
          tabBarLabel: ({ focused, color, children }) => (
            <Text style={[styles.tabBarLabel, { color }, focused && styles.tabBarLabelActive]}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planes',
          tabBarIcon: ({ color, size, focused }) => (
            <ListChecks size={size} color={color} fill={focused ? color : 'none'} />
          ),
          tabBarLabel: ({ focused, color, children }) => (
            <Text style={[styles.tabBarLabel, { color }, focused && styles.tabBarLabelActive]}>{children}</Text>
          ),
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
  // Blanco puro sobre el #F5F5F2 de las pantallas (solo 1.09:1), así que la
  // línea inferior es la que separa de verdad la cabecera del contenido.
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DCDCD8',
  },
  headerLogoButton: { alignSelf: 'center', minHeight: 44, minWidth: 44, justifyContent: 'center' },
  // 473×100 → misma proporción para que no se deforme.
  headerLogo: { height: 24, width: 24 * (473 / 100) },
  tabBar: { height: 64, paddingBottom: 8, paddingTop: 6 },
  tabBarLabel: { fontSize: 9, fontWeight: '600' },
  tabBarLabelActive: { fontWeight: '800' },
  tabBarBadge: { backgroundColor: '#F9452A', color: '#2D1E1B', fontSize: 9, fontWeight: '700' },
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
    backgroundColor: '#2D1E1B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarActive: { borderColor: '#2D1E1B' },
  avatarLabel: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
