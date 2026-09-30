/**
 * Performs an HTTP GET request and returns the response body as text.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} The response body.
 * @throws {Error} If the request fails or returns a non-OK status.
 */
export const doRequest = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.text();
};