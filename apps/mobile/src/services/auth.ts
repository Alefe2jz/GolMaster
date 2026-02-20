import { api } from './api';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>('/login', {
    email,
    password,
  });

  return response.data;
}

export async function register(name: string, email: string, password: string) {
  const response = await api.post<LoginResponse>('/register', {
    name,
    email,
    password,
  });

  return response.data;
}

export async function loginWithGoogle(idToken: string) {
  const response = await api.post<LoginResponse>('/auth/google', {
    id_token: idToken,
  });

  return response.data;
}
