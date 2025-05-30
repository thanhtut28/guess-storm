"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { Storm, Season, StormFilters } from "@/types/storm";
import { stormApi, seasonApi } from "@/lib/api";
import { getCategoryColor } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Loader2,
   AlertTriangle,
   RotateCcw,
   FilterX,
   SlidersHorizontal,
   Search,
   X,
   Command,
   ChevronDown,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter } from "next/navigation";

// Dynamically import components that use Leaflet
const StormMap = dynamic(() => import("@/components/StormMap"), { ssr: false });
const SeasonAnalysis = dynamic(() => import("@/components/SeasonAnalysis"), { ssr: false });

type ViewMode = "overview" | "season";

// Autocomplete Search Component
function AutocompleteSearch({
   value,
   onChange,
   onStormSelect,
   placeholder = "Search storm by name...",
   className = "",
}: {
   value: string;
   onChange: (value: string) => void;
   onStormSelect?: (storm: Storm) => void;
   placeholder?: string;
   className?: string;
}) {
   const [suggestions, setSuggestions] = useState<Storm[]>([]);
   const [showSuggestions, setShowSuggestions] = useState(false);
   const [loading, setLoading] = useState(false);
   const [highlightedIndex, setHighlightedIndex] = useState(-1);
   const inputRef = useRef<HTMLInputElement>(null);
   const suggestionsRef = useRef<HTMLDivElement>(null);
   const debouncedSearch = useDebounce(value, 300);

   // Fetch suggestions when search term changes
   useEffect(() => {
      if (debouncedSearch.length >= 2) {
         fetchSuggestions(debouncedSearch);
      } else {
         setSuggestions([]);
         setShowSuggestions(false);
      }
   }, [debouncedSearch]);

   const fetchSuggestions = async (searchTerm: string) => {
      try {
         setLoading(true);
         const response = await stormApi.getStorms({
            name: searchTerm,
            limit: 10, // Limit suggestions to 10 items
         });
         setSuggestions(response.data);
         setShowSuggestions(true);
         setHighlightedIndex(-1);
      } catch (error) {
         console.error("Error fetching suggestions:", error);
         setSuggestions([]);
      } finally {
         setLoading(false);
      }
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setShowSuggestions(true);
   };

   const handleSuggestionClick = (storm: Storm) => {
      onChange(storm.name);
      setShowSuggestions(false);
      onStormSelect?.(storm);
   };

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
         case "ArrowDown":
            e.preventDefault();
            setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
            break;
         case "ArrowUp":
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
            break;
         case "Enter":
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
               const selectedStorm = suggestions[highlightedIndex];
               handleSuggestionClick(selectedStorm);
            } else {
               setShowSuggestions(false);
            }
            break;
         case "Escape":
            setShowSuggestions(false);
            setHighlightedIndex(-1);
            inputRef.current?.blur();
            break;
      }
   };

   const handleClear = () => {
      onChange("");
      setShowSuggestions(false);
      inputRef.current?.focus();
   };

   // Close suggestions when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (
            suggestionsRef.current &&
            !suggestionsRef.current.contains(event.target as Node) &&
            !inputRef.current?.contains(event.target as Node)
         ) {
            setShowSuggestions(false);
         }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   return (
      <div className={`relative ${className}`}>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
               ref={inputRef}
               type="text"
               placeholder={placeholder}
               value={value}
               onChange={handleInputChange}
               onKeyDown={handleKeyDown}
               onFocus={() => value.length >= 2 && setShowSuggestions(true)}
               className="w-full pl-10 pr-12"
               autoComplete="off"
            />
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
               {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
               {value && (
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={handleClear}
                     className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                     <X className="w-4 h-4" />
                  </Button>
               )}
               {showSuggestions && suggestions.length > 0 && (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
               )}
            </div>
         </div>

         {/* Suggestions dropdown */}
         {showSuggestions && (
            <div
               ref={suggestionsRef}
               className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
            >
               {loading ? (
                  <div className="flex items-center justify-center py-4">
                     <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                     <span className="text-sm text-gray-500">Searching...</span>
                  </div>
               ) : suggestions.length > 0 ? (
                  <>
                     <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <Command className="w-3 h-3" />
                        Use ↑↓ to navigate, Enter to select, Esc to close
                     </div>
                     {suggestions.map((storm, index) => (
                        <div
                           key={storm.id}
                           className={`px-4 py-3 cursor-pointer border-b border-gray-50 last:border-b-0 hover:bg-blue-50 transition-colors ${
                              index === highlightedIndex ? "bg-blue-50 border-blue-100" : ""
                           }`}
                           onClick={() => handleSuggestionClick(storm)}
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div
                                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                                    style={{
                                       backgroundColor: getCategoryColor(storm.maxCategory),
                                    }}
                                 />
                                 <div>
                                    <div className="font-medium text-gray-900">{storm.name}</div>
                                    <div className="text-sm text-gray-500">
                                       {storm.season} • Category {storm.maxCategory}
                                    </div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-sm font-medium text-gray-700">
                                    {storm.maxWindSpeed} mph
                                 </div>
                                 <div className="text-xs text-gray-500">
                                    {new Date(storm.startDate).getFullYear()}
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </>
               ) : value.length >= 2 ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                     <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                     <div className="text-sm">No storms found matching &quot;{value}&quot;</div>
                     <div className="text-xs text-gray-400 mt-1">Try a different search term</div>
                  </div>
               ) : null}
            </div>
         )}
      </div>
   );
}

export default function StormDashboard() {
   const router = useRouter();
   const [viewMode, setViewMode] = useState<ViewMode>("overview");
   const [storms, setStorms] = useState<Storm[]>([]);
   const [seasons, setSeasons] = useState<Season[]>([]);
   const [selectedStorm, setSelectedStorm] = useState<Storm | null>(null);
   const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [filters, setFilters] = useState<StormFilters>({
      limit: 20, // Increased default limit since we removed pagination
   });
   const [searchTerm, setSearchTerm] = useState<string>("");
   const debouncedSearchTerm = useDebounce(searchTerm, 500);
   const [showFilters, setShowFilters] = useState(false);

   const fetchData = async (currentFilters: StormFilters) => {
      setLoading(true);
      setError(null);
      try {
         console.log("Fetching storms with filters:", currentFilters);
         const [stormsResponse, seasonsResponse] = await Promise.all([
            stormApi.getStorms(currentFilters),
            seasonApi.getSeasons(),
         ]);
         console.log(`Found ${stormsResponse.data.length} storms`);
         setStorms(stormsResponse.data);
         setSeasons(seasonsResponse.data);

         if (currentFilters.year && seasonsResponse.data.length > 0) {
            const matchingSeason = seasonsResponse.data.find(
               s => s.year === Number(currentFilters.year)
            );
            setSelectedSeason(matchingSeason || null);
         } else if (seasonsResponse.data.length > 0) {
            setSelectedSeason(seasonsResponse.data.sort((a, b) => b.year - a.year)[0]); // Default to most recent
         }
      } catch (err) {
         console.error("Error fetching data:", err);
         setError("Failed to load storm data. Please try again.");
      } finally {
         setLoading(false);
      }
   };

 useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchRealtimeStorm = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/predict-realtime', { signal });
        if (!response.ok) {
          throw new Error('Fetch failed');
        }
        const data = await response.json();
        console.log('realtime', data)

      } catch (error) {
         console.error(error)
      } finally {
        setLoading(false);
      }
    };

    fetchRealtimeStorm();

    // Cleanup on unmount
    return () => {
      controller.abort(); // cancel the fetch
    };
  }, []);

   useEffect(() => {
      fetchData(filters);
   }, [filters]);

   // Apply search filter
   useEffect(() => {
      console.log("Search term changed:", debouncedSearchTerm);
      setFilters(prev => ({
         ...prev,
         name: debouncedSearchTerm || undefined,
      }));
   }, [debouncedSearchTerm]);

   const handleStormSelect = (storm: Storm) => {
      setSelectedStorm(storm);
      // Navigate to individual storm page
      router.push(`/storm/${storm.id}`);
   };

   const handleSeasonSelect = (yearStr: string) => {
      console.log("Season selected:", yearStr);
      if (yearStr === "all" || yearStr === "") {
         // Clear year filter
         setFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters.year;
            return newFilters;
         });
         setSelectedSeason(null);
      } else {
         const year = parseInt(yearStr);
         setFilters(prev => ({ ...prev, year }));
         const matchingSeason = seasons.find(s => s.year === year);
         setSelectedSeason(matchingSeason || null);
      }
   };

   const handleRetry = () => {
      fetchData(filters);
   };

   const handleClearFilters = () => {
      console.log("Clearing all filters");
      setFilters({ limit: 200 });
      setSearchTerm("");
   };

   const handleClearSearch = () => {
      console.log("Clearing search");
      setSearchTerm("");
   };

   // Get available years from seasons
   const availableYears = seasons
      .map(season => season.year.toString())
      .sort((a, b) => parseInt(b) - parseInt(a));

   // Check if search is active
   const isSearchActive = searchTerm.length > 0;
   const hasActiveFilters = filters.year || filters.category || filters.name;

   if (error) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700 text-white">
               <RotateCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
         {/* Header / Filters */}
         <header className="bg-white shadow-sm p-4 border-b border-gray-200">
            <div className="container mx-auto">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800">StormTrack Pro</h1>
                  <div className="flex items-center gap-3">
                     {/* Enhanced Search Input */}
                     <AutocompleteSearch
                        value={searchTerm}
                        onChange={setSearchTerm}
                        onStormSelect={handleStormSelect}
                        placeholder="Search storm by name..."
                        className="w-full sm:w-64"
                     />
                     <Select
                        onValueChange={handleSeasonSelect}
                        value={filters.year?.toString() || "all"}
                     >
                        <SelectTrigger className="w-full sm:w-[180px]">
                           <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">All Years</SelectItem>
                           {availableYears.map(year => (
                              <SelectItem key={year} value={year}>
                                 {year} Season
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                     <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                     >
                        <SlidersHorizontal className="h-4 w-4" />
                     </Button>
                  </div>
               </div>

               {/* Active filters indicator */}
               {hasActiveFilters && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                     <span className="text-sm text-gray-500">Active filters:</span>
                     {filters.name && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                           <Search className="w-3 h-3" />
                           <span>&quot;{filters.name}&quot;</span>
                           <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearSearch}
                              className="h-4 w-4 p-0 hover:bg-blue-200 rounded-full"
                           >
                              <X className="w-3 h-3" />
                           </Button>
                        </div>
                     )}
                     {filters.year && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                           <span>Year: {filters.year}</span>
                        </div>
                     )}
                     {filters.category !== undefined && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                           <span>Category {filters.category}</span>
                        </div>
                     )}
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-gray-500 hover:text-gray-700"
                     >
                        Clear all
                     </Button>
                  </div>
               )}

               {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                           <label
                              htmlFor="filter-category"
                              className="block text-sm font-medium text-gray-700 mb-1"
                           >
                              Category
                           </label>
                           <Select
                              onValueChange={(value: string) => {
                                 if (value === "all") {
                                    setFilters(prev => {
                                       const newFilters = { ...prev };
                                       delete newFilters.category;
                                       return newFilters;
                                    });
                                 } else {
                                    setFilters(prev => ({
                                       ...prev,
                                       category: parseInt(value),
                                    }));
                                 }
                              }}
                              value={filters.category?.toString() || "all"}
                           >
                              <SelectTrigger id="filter-category">
                                 <SelectValue placeholder="Any Category" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="all">Any Category</SelectItem>
                                 {[0, 1, 2, 3, 4, 5].map(cat => (
                                    <SelectItem
                                       key={cat}
                                       value={cat.toString()}
                                    >{`Category ${cat}`}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div>
                           <label
                              htmlFor="filter-limit"
                              className="block text-sm font-medium text-gray-700 mb-1"
                           >
                              Max Results
                           </label>
                           <Select
                              onValueChange={(value: string) =>
                                 setFilters(prev => ({
                                    ...prev,
                                    limit: parseInt(value),
                                 }))
                              }
                              value={filters.limit?.toString()}
                           >
                              <SelectTrigger id="filter-limit">
                                 <SelectValue placeholder="200" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="100">100 storms</SelectItem>
                                 <SelectItem value="200">200 storms</SelectItem>
                                 <SelectItem value="500">500 storms</SelectItem>
                                 <SelectItem value="1000">1000 storms</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="col-span-full sm:col-span-2 md:col-span-3 flex justify-end items-center gap-2 pt-2">
                           <Button onClick={handleClearFilters} variant="ghost" size="sm">
                              <FilterX className="mr-2 h-4 w-4" /> Clear All Filters
                           </Button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </header>

         {/* Main Content Area */}
         <main className="flex-1 overflow-y-auto p-2 sm:p-4">
            <Tabs
               value={viewMode}
               onValueChange={(value: string) => setViewMode(value as ViewMode)}
               className="h-full flex flex-col px-4 py-2"
            >
               <div className="container mx-auto">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 py-2 rounded-xl">
                     <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                     >
                        Storm Overview
                     </TabsTrigger>
                     <TabsTrigger
                        value="season"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                        disabled={!selectedSeason}
                     >
                        Season Analysis
                     </TabsTrigger>
                  </TabsList>
               </div>

               <Suspense
                  fallback={
                     <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                     </div>
                  }
               >
                  <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden">
                     <div className="h-full w-full relative">
                        {loading && storms.length === 0 ? (
                           <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                           </div>
                        ) : (
                           <StormMap
                              storms={storms}
                              selectedStorm={selectedStorm}
                              onStormSelect={handleStormSelect}
                              className="h-full w-full rounded-lg shadow"
                           />
                        )}
                        {/* Storm count indicator */}
                        {!loading && (
                           <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-gray-200">
                              <span className="text-sm font-medium text-gray-700">
                                 {storms.length} storm{storms.length !== 1 ? "s" : ""}
                                 {isSearchActive && ` matching "${searchTerm}"`}
                              </span>
                           </div>
                        )}
                        {/* No results message */}
                        {!loading && storms.length === 0 && isSearchActive && (
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-md border border-gray-200 text-center">
                                 <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                 <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    No storms found
                                 </h3>
                                 <p className="text-gray-500 mb-4">
                                    No storms match your search for &quot;{searchTerm}&quot;
                                 </p>
                                 <Button variant="outline" onClick={handleClearSearch}>
                                    Clear search
                                 </Button>
                              </div>
                           </div>
                        )}
                     </div>
                  </TabsContent>

                  <TabsContent value="season" className="flex-1 mt-0 overflow-y-auto">
                     {selectedSeason ? (
                        <SeasonAnalysis
                           season={selectedSeason}
                           filters={filters}
                           onStormSelect={handleStormSelect}
                           className="container mx-auto p-4"
                        />
                     ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                           Select a season to view analysis.
                        </div>
                     )}
                  </TabsContent>
               </Suspense>
            </Tabs>
         </main>
      </div>
   );
}
