import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSerpUrls, getDetailedOnpageElements } from '../../services/dataforseoService';

// Mock fetch responses
const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

describe('dataforseoService', () => {
  const testLogin = 'test@example.com';
  const testPassword = 'testpassword123';
  const testCountry = 'United States';
  const testLanguage = 'English';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getSerpUrls', () => {
    it('should return URLs and PAA questions from SERP results', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            keyword: 'test keyword',
            items: [
              { type: 'organic', url: 'https://example1.com', rank_absolute: 1 },
              { type: 'organic', url: 'https://example2.com', rank_absolute: 2 },
              { type: 'organic', url: 'https://example3.com', rank_absolute: 3 },
              {
                type: 'people_also_ask',
                items: [
                  { title: 'What is test keyword?' },
                  { title: 'How does test keyword work?' },
                  { title: 'Why use test keyword?' },
                ]
              },
            ]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSerpUrls('test keyword', testLogin, testPassword, testCountry, testLanguage);

      // Verify correct endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.dataforseo.com/v3/serp/google/organic/live/regular',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify URL results
      expect(result.urls).toHaveLength(3);
      expect(result.urls[0]).toEqual({ url: 'https://example1.com', rank: 1 });
      expect(result.urls[1]).toEqual({ url: 'https://example2.com', rank: 2 });
      expect(result.urls[2]).toEqual({ url: 'https://example3.com', rank: 3 });

      // Verify PAA questions
      expect(result.paaQuestions).toHaveLength(3);
      expect(result.paaQuestions).toContain('What is test keyword?');
      expect(result.paaQuestions).toContain('How does test keyword work?');
      expect(result.paaQuestions).toContain('Why use test keyword?');
    });

    it('should return empty arrays when no results', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            keyword: 'obscure keyword',
            items: []
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSerpUrls('obscure keyword', testLogin, testPassword, testCountry, testLanguage);

      expect(result.urls).toHaveLength(0);
      expect(result.paaQuestions).toHaveLength(0);
    });

    it('should filter out organic results without valid URLs', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            keyword: 'test',
            items: [
              { type: 'organic', url: 'https://valid.com', rank_absolute: 1 },
              { type: 'organic', url: null, rank_absolute: 2 },
              { type: 'organic', url: '', rank_absolute: 3 },
              { type: 'organic', url: 'https://also-valid.com', rank_absolute: 4 },
            ]
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSerpUrls('test', testLogin, testPassword, testCountry, testLanguage);

      expect(result.urls).toHaveLength(2);
      expect(result.urls[0].url).toBe('https://valid.com');
      expect(result.urls[1].url).toBe('https://also-valid.com');
    });

    it('should limit organic results to 10', async () => {
      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        type: 'organic',
        url: `https://example${i + 1}.com`,
        rank_absolute: i + 1,
      }));

      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{
            keyword: 'test',
            items: manyResults
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSerpUrls('test', testLogin, testPassword, testCountry, testLanguage);

      expect(result.urls).toHaveLength(10);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid credentials'),
      });

      await expect(
        getSerpUrls('test', testLogin, testPassword, testCountry, testLanguage)
      ).rejects.toThrow('DataForSEO API error');
    });

    it('should throw error on task error', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 1,
        tasks: [{
          status_code: 40000,
          status_message: 'Invalid keyword parameter',
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(
        getSerpUrls('', testLogin, testPassword, testCountry, testLanguage)
      ).rejects.toThrow('DataForSEO task error');
    });

    it('should send correct payload structure', async () => {
      const mockResponse = {
        status_code: 20000,
        tasks_count: 1,
        tasks_error: 0,
        tasks: [{
          status_code: 20000,
          result: [{ keyword: 'test', items: [] }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await getSerpUrls('my keyword', testLogin, testPassword, testCountry, testLanguage);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual([{
        language_name: 'English',
        location_name: 'United States',
        keyword: 'my keyword',
        depth: 20,
      }]);
    });
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
          result: [{ keyword: 'test', items: [] }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await getSerpUrls('test', 'mylogin', 'mypassword', testCountry, testLanguage);

      const callArgs = mockFetch.mock.calls[0];
      const authHeader = callArgs[1].headers['Authorization'];

      // btoa('mylogin:mypassword') = 'bXlsb2dpbjpteXBhc3N3b3Jk'
      expect(authHeader).toBe('Basic bXlsb2dpbjpteXBhc3N3b3Jk');
    });
  });
});
