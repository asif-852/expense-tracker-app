import api from './api';

const transactionService = {
  list: async (params = {}) => {
    const { data } = await api.get('/transactions', { params });
    return data;
  },

  create: async (transaction) => {
    const { data } = await api.post('/transactions', transaction);
    return data;
  },

  update: async (id, updates) => {
    const { data } = await api.put(`/transactions/${id}`, updates);
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/transactions/${id}`);
    return data;
  },
};

export default transactionService;
