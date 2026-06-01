import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockFindGlobal = vi.fn();
vi.mock('@/lib/payload/client', () => ({
  getPayloadClient: vi.fn(async () => ({ findGlobal: mockFindGlobal })),
  isPayloadConfigured: vi.fn(() => true),
}));

const mockIsEnabled = vi.fn(() => false);
vi.mock('next/headers', () => ({
  draftMode: async () => ({ isEnabled: mockIsEnabled(), enable: vi.fn(), disable: vi.fn() }),
}));

describe('site-settings queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsEnabled.mockReturnValue(false);
  });

  describe('getNavItemsFor', () => {
    it('filters nav items by surface=header', async () => {
      mockFindGlobal.mockResolvedValueOnce({
        items: [
          { label: 'Каталог', href: '/shop', showInHeader: true, showInFooter: true, showInMobile: true },
          { label: 'Опт', href: 'https://pnhd.ru', showInHeader: true, showInFooter: false, showInMobile: false, isExternal: true },
          { label: 'Privacy', href: '/privacy', showInHeader: false, showInFooter: true, showInMobile: false },
        ],
      });

      const { getNavItemsFor } = await import('./site-settings');
      const headerItems = await getNavItemsFor('header');

      expect(headerItems).toHaveLength(2);
      expect(headerItems[0].label).toBe('Каталог');
      expect(headerItems[1].label).toBe('Опт');
    });

    it('returns empty array when global has no items', async () => {
      mockFindGlobal.mockResolvedValueOnce({ items: [] });
      const { getNavItemsFor } = await import('./site-settings');
      expect(await getNavItemsFor('footer')).toEqual([]);
    });

    it('handles null items gracefully', async () => {
      mockFindGlobal.mockResolvedValueOnce({ items: null });
      const { getNavItemsFor } = await import('./site-settings');
      expect(await getNavItemsFor('mobile')).toEqual([]);
    });
  });

  describe('getSiteSettings — draftMode awareness', () => {
    it('passes draft: false when draftMode disabled', async () => {
      mockIsEnabled.mockReturnValue(false);
      mockFindGlobal.mockResolvedValueOnce({ phone: '+7' });

      const { getSiteSettings } = await import('./site-settings');
      await getSiteSettings();

      expect(mockFindGlobal).toHaveBeenCalledWith({ slug: 'site-settings', draft: false });
    });

    it('passes draft: true when draftMode enabled', async () => {
      mockIsEnabled.mockReturnValue(true);
      mockFindGlobal.mockResolvedValueOnce({ phone: '+7' });

      const { getSiteSettings } = await import('./site-settings');
      await getSiteSettings();

      expect(mockFindGlobal).toHaveBeenCalledWith({ slug: 'site-settings', draft: true });
    });
  });
});
