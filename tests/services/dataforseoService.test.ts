import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDetailedOnpageElements } from '../../services/dataforseoService';

// Mock fetch responses
const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

describe('dataforseoService', () => {
  const testLogin = 'test@example.com';
  const testPassword = 'testpassword123';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getDetailedOnpageElements', () => {
    it('should extract H1s, H2s, H3s, word count, and full text', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            items: [{
              page_content: {
                main_topic: [
                  {
                    level: 1,
                    h_title: 'Main Title',
                    primary_content: [
                      { text: 'This is the introduction paragraph.' },
                    ]
                  },
                  {
                    level: 2,
                    h_title: 'First Section',
                    primary_content: [
                      { text: 'This is the first section content.' },
                    ]
                  },
                  {
                    level: 2,
                    h_title: 'Second Section',
                    primary_content: [
                      { text: 'This is the second section content.' },
                    ]
                  },
                  {
                    level: 3,
                    h_title: 'Subsection',
                    primary_content: [
                      { text: 'This is subsection content.' },
                    ]
                  },
                ]
              }
            }]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getDetailedOnpageElements('https://example.com', testLogin, testPassword);

      expect(result.H1s).toEqual(['Main Title']);
      expect(result.H2s).toEqual(['First Section', 'Second Section']);
      expect(result.H3s).toEqual(['Subsection']);
      expect(result.Word_Count).toBeGreaterThan(0);
      expect(result.Full_Text).toContain('introduction paragraph');
      expect(result.Full_Text).toContain('first section content');
    });

    it('should return "No H1 Found" when no H1 exists', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            items: [{
              page_content: {
                main_topic: [
                  {
                    level: 2,
                    h_title: 'Section Without H1',
                    primary_content: [{ text: 'Some content.' }]
                  },
                ]
              }
            }]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getDetailedOnpageElements('https://example.com', testLogin, testPassword);

      expect(result.H1s).toEqual(['No H1 Found']);
    });

    it('should return error result when page_content is missing', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            items: [{
              // No page_content
            }]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getDetailedOnpageElements('https://example.com', testLogin, testPassword);

      expect(result.H1s).toEqual(['PARSE_FAILED']);
      expect(result.Word_Count).toBe(0);
    });

    it('should send correct payload with enable_javascript', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            items: [{
              page_content: {
                main_topic: []
              }
            }]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await getDetailedOnpageElements('https://test.com/page', testLogin, testPassword);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual([{
        url: 'https://test.com/page',
        enable_javascript: true,
      }]);

      expect(callArgs[0]).toBe('https://api.dataforseo.com/v3/on_page/content_parsing/live');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(
        getDetailedOnpageElements('https://example.com', testLogin, testPassword)
      ).rejects.toThrow('DataForSEO API error');
    });
  });

  describe('Authentication', () => {
    it('should include Basic auth header with base64 encoded credentials', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            items: [{
              page_content: {
                main_topic: []
              }
            }]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await getDetailedOnpageElements('https://example.com', 'mylogin', 'mypassword');

      const callArgs = mockFetch.mock.calls[0];
      const authHeader = callArgs[1].headers['Authorization'];

      // btoa('mylogin:mypassword') = 'bXlsb2dpbjpteXBhc3N3b3Jk'
      expect(authHeader).toBe('Basic bXlsb2dpbjpteXBhc3N3b3Jk');
    });
  });
});
