import { Storm, Season, StormFilters, ApiResponse } from "@/types/storm";

const API_BASE = "/api";

export class ApiError extends Error {
   constructor(public status: number, message: string) {
      super(message);
      this.name = "ApiError";
   }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
   const response = await fetch(url, {
      headers: {
         "Content-Type": "application/json",
         ...options?.headers,
      },
      ...options,
   });

   if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new ApiError(response.status, error.error || "Request failed");
   }

   return response.json();
}

// Storm API functions
export const stormApi = {
   // Get all storms with optional filters
   getStorms: async (filters?: StormFilters): Promise<ApiResponse<Storm[]>> => {
      const params = new URLSearchParams();

      if (filters?.year) params.append("year", filters.year.toString());
      if (filters?.season) params.append("season", filters.season);
      if (filters?.category) params.append("category", filters.category.toString());
      if (filters?.name) params.append("name", filters.name);
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.offset) params.append("offset", filters.offset.toString());

      const url = `${API_BASE}/storms${params.toString() ? `?${params.toString()}` : ""}`;
      return fetchApi<ApiResponse<Storm[]>>(url);
   },

   // Get a single storm by ID
   getStorm: async (id: string): Promise<ApiResponse<Storm>> => {
      return fetchApi<ApiResponse<Storm>>(`${API_BASE}/storms/${id}`);
   },

   // Create multiple storms
   createStorms: async (storms: Partial<Storm>[]): Promise<ApiResponse<Storm[]>> => {
      return fetchApi<ApiResponse<Storm[]>>(`${API_BASE}/storms`, {
         method: "POST",
         body: JSON.stringify({ storms }),
      });
   },

   // Update a storm
   updateStorm: async (id: string, storm: Partial<Storm>): Promise<ApiResponse<Storm>> => {
      return fetchApi<ApiResponse<Storm>>(`${API_BASE}/storms/${id}`, {
         method: "PUT",
         body: JSON.stringify(storm),
      });
   },

   // Delete a storm
   deleteStorm: async (id: string): Promise<ApiResponse<{ message: string }>> => {
      return fetchApi<ApiResponse<{ message: string }>>(`${API_BASE}/storms/${id}`, {
         method: "DELETE",
      });
   },
};

// Season API functions
export const seasonApi = {
   // Get all seasons
   getSeasons: async (filters?: {
      year?: number;
      basin?: string;
   }): Promise<ApiResponse<Season[]>> => {
      const params = new URLSearchParams();

      if (filters?.year) params.append("year", filters.year.toString());
      if (filters?.basin) params.append("basin", filters.basin);

      const url = `${API_BASE}/seasons${params.toString() ? `?${params.toString()}` : ""}`;
      return fetchApi<ApiResponse<Season[]>>(url);
   },

   // Create a season
   createSeason: async (season: Partial<Season>): Promise<ApiResponse<Season>> => {
      return fetchApi<ApiResponse<Season>>(`${API_BASE}/seasons`, {
         method: "POST",
         body: JSON.stringify(season),
      });
   },
};

// Utility functions
export const apiUtils = {
   // Get storms for a specific season
   getStormsBySeason: async (year: number, season: string): Promise<Storm[]> => {
      const response = await stormApi.getStorms({ year, season });
      return response.data;
   },

   // Get storms by category
   getStormsByCategory: async (category: number): Promise<Storm[]> => {
      const response = await stormApi.getStorms({ category });
      return response.data;
   },

   // Search storms by name
   searchStorms: async (name: string): Promise<Storm[]> => {
      const response = await stormApi.getStorms({ name });
      return response.data;
   },

   // Get recent storms
   getRecentStorms: async (limit: number = 10): Promise<Storm[]> => {
      const response = await stormApi.getStorms({ limit });
      return response.data;
   },
};
