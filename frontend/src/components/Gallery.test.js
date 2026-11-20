import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Gallery from './Gallery';
import { listImages } from '../api';

jest.mock('../api', () => ({ listImages: jest.fn(), deleteImage: jest.fn(), apiUrl: (p) => p }));

test('loads the gallery once and does not refetch when loading finishes', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  listImages
    .mockResolvedValueOnce({ items: [], next_page: null })
    .mockImplementation(() => new Promise(() => {}));
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    // ReactDOM's root.render does not provide Testing Library's automatic act wrapper.
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      root.render(<Gallery />);
    });
    expect(listImages).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('No images yet');
  } finally {
    await act(async () => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
