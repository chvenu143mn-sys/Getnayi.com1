export class ApiError extends Error {
  status: number;
  headers: Headers;
  data: any;
  text: string;

  constructor(message: string, status: number, headers: Headers, text: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.headers = headers;
    this.text = text;
    this.data = data;
  }
}

export async function safeFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  if (!response.ok) {
    let text = '';
    try {
      text = await response.text();
    } catch (e) {
      // Ignore if body can't be read
    }

    if (isJson) {
      let errData;
      try {
        errData = JSON.parse(text);
      } catch (e) {
         throw new ApiError(`API ${response.status}: ${text}`, response.status, response.headers, text);
      }
      
      const errorMessage = errData?.error || errData?.message || `API ${response.status} Error`;
      throw new ApiError(errorMessage, response.status, response.headers, text, errData);
    } else {
      throw new ApiError(`Expected JSON but received HTML/Text. API ${response.status}: ${text.substring(0, 100)}`, response.status, response.headers, text);
    }
  }

  if (response.status === 204) {
    return null;
  }

  if (isJson) {
    let text = '';
    try {
      text = await response.text();
    } catch (e) {
      // ignore
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new ApiError(`Invalid JSON in response: ${text.substring(0, 100)}`, response.status, response.headers, text);
    }
  }
  
  // Return raw response if it's not JSON (e.g., text)
  return await response.text();
}
