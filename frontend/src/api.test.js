describe('API connections', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    delete process.env.REACT_APP_API_ORIGIN;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
    });
  });
  afterEach(() => {
    delete process.env.REACT_APP_API_ORIGIN;
    delete global.fetch;
  });

  test('missing configuration uses a same-origin path, never undefined/api', async () => {
    const { health } = require('./api');
    await health();
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
  });

  test('normalizes the configured origin and reads the current admin token for writes', async () => {
    process.env.REACT_APP_API_ORIGIN = ' https://api.example.test/ ';
    const { deleteImage } = require('./api');
    localStorage.setItem('admin.token', 'test-admin-token');
    await deleteImage('image-id');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/images/image-id',
      expect.objectContaining({
        method: 'DELETE',
        headers: { authorization: 'Bearer test-admin-token' },
      }),
    );
  });

  test('rejects HTML returned by a static hosting fallback', async () => {
    fetch.mockResolvedValue({ ok: true, headers: { get: () => 'text/html' } });
    const { health } = require('./api');
    await expect(health()).rejects.toThrow('unexpected response');
  });

  test('reports backend failures rather than returning success', async () => {
    fetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'database_unavailable' });
    const { listImages } = require('./api');
    await expect(listImages()).rejects.toThrow('HTTP 503');
  });
});
