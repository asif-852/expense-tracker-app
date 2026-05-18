import api from './api';

const summaryService = {
  /**
   * Fetch the user's financial summary.
   * @param {Object} params - Optional query params: { from, to }
   */
  get: async (params = {}) => {
    const { data } = await api.get('/summary', { params });
    return data;
  },
};

export default summaryService;
