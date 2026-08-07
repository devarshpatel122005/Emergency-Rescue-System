import api from './api';

const TOKEN_KEY = 'ers_token';
const USER_KEY = 'ers_user';

function persistAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login(payload) {
  const response = await api.post('/auth/login', payload);
  const { token, user } = response.data.data;
  persistAuth(token, user);
  return response.data.data;
}

export async function register(payload) {
  const response = await api.post('/auth/register', payload);
  const { token, user } = response.data.data;
  persistAuth(token, user);
  return response.data.data;
}

export async function completeProfile(payload) {
  const response = await api.patch('/auth/complete-profile', payload);
  const { token, user } = response.data.data;
  persistAuth(token, user);
  return response.data.data;
}

export async function updateProfile(payload) {
  const response = await api.patch('/auth/profile', payload);
  const { token, user } = response.data.data;
  persistAuth(token, user);
  return response.data.data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
