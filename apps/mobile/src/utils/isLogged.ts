import * as SecureStore from 'expo-secure-store';

export async function isLogged() {
  const token = await SecureStore.getItemAsync('auth_token');
  return !!token;
}
