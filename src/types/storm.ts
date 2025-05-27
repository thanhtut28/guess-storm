export interface StormPoint {
   id?: string;
   lat: number;
   lng: number;
   timestamp: string;
   windSpeed: number | null;
   pressure: number | null;
   category: number;
   stormId?: string;
   createdAt?: string;
}

export interface Storm {
   id: string;
   name: string;
   year: number;
   season: string;
   maxWindSpeed: number;
   maxCategory: number;
   startDate: string;
   endDate: string;
   path: StormPoint[];
   geojson?: object | null;
   createdAt?: string;
   updatedAt?: string;
}

export interface Season {
   id?: string;
   year: number;
   name: string;
   totalStorms: number;
   majorHurricanes: number;
   aceIndex: number;
   basin: string;
   createdAt?: string;
   updatedAt?: string;
}

export interface StormFilters {
   year?: number;
   category?: number;
   name?: string;
   season?: string;
   limit?: number;
   offset?: number;
}

export interface MapBounds {
   north: number;
   south: number;
   east: number;
   west: number;
}

export interface ApiResponse<T> {
   data: T;
   count?: number;
   message?: string;
   error?: string;
}
