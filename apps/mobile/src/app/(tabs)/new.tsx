import { Redirect } from 'expo-router';

// Nunca se monta de verdad: el botón "+" de la barra de pestañas
// (ver `(tabs)/_layout.tsx`) intercepta el toque y navega directamente a
// /plan-form sin cambiar de pestaña. Este archivo solo existe porque
// expo-router necesita una ruta física para cada <Tabs.Screen>.
export default function NewPlanTabPlaceholder() {
  return <Redirect href="/plan-form" />;
}
