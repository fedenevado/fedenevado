import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

export default function Index() {
  const { isLoading, token } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container} accessibilityLabel="Cargando sesión">
        <ActivityIndicator size="large" accessibilityLabel="Cargando" />
      </View>
    );
  }

  return <Redirect href={token ? '/home' : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B2E',
  },
});
