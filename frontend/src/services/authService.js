import api from './api';

const authService = {
  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data;
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout: async (refreshToken) => {
    const { data } = await api.post('/auth/logout', { refreshToken });
    return data;
  },

  updatePassword: async (currentPassword, newPassword) => {
    const { data } = await api.put('/auth/password', { currentPassword, newPassword });
    return data;
  },

  deleteAccount: async (password) => {
    const { data } = await api.delete('/auth/me', { data: { password } });
    return data;
  },
};

export default authService;
