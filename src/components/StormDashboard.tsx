"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { Storm, Season, StormFilters } from "@/types/storm";
import { stormApi, seasonApi } from "@/lib/api";
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
import { Loader2, AlertTriangle, RotateCcw, FilterX, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// Dynamically import components that use Leaflet
const StormMap = dynamic(() => import("@/components/StormMap"), { ssr: false });
const StormDetails = dynamic(() => import("@/components/StormDetails"), { ssr: false });
const SeasonAnalysis = dynamic(() => import("@/components/SeasonAnalysis"), { ssr: false });

type ViewMode = "overview" | "individual" | "season";

export default function StormDashboard() {
   const [viewMode, setViewMode] = useState<ViewMode>("overview");
   const [storms, setStorms] = useState<Storm[]>([]);
   const [seasons, setSeasons] = useState<Season[]>([]);
   const [selectedStorm, setSelectedStorm] = useState<Storm | null>(null);
   const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [filters, setFilters] = useState<StormFilters>({
      limit: 100,
      offset: 0,
   });
   const [searchTerm, setSearchTerm] = useState<string>("");
   const debouncedSearchTerm = useDebounce(searchTerm, 500);
   const [showFilters, setShowFilters] = useState(false);

   const fetchData = async (currentFilters: StormFilters) => {
      setLoading(true);
      setError(null);
      try {
         const [stormsResponse, seasonsResponse] = await Promise.all([
            stormApi.getStorms(currentFilters),
            seasonApi.getSeasons(),
         ]);
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
      fetchData(filters);
   }, [filters]);

   useEffect(() => {
      if (debouncedSearchTerm) {
         setFilters(prev => ({ ...prev, name: debouncedSearchTerm, offset: 0 }));
      } else if (filters.name !== undefined && debouncedSearchTerm === "") {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         const { name, ...restFilters } = filters;
         setFilters(restFilters);
      }
   }, [debouncedSearchTerm, filters.name]);

   const handleStormSelect = (storm: Storm | null) => {
      setSelectedStorm(storm);
      if (storm) {
         setViewMode("individual");
         const stormSeason = seasons.find(s => s.year === storm.year);
         setSelectedSeason(stormSeason || null);
      }
   };

   const handleSeasonSelect = (year: string) => {
      const season = seasons.find(s => s.year === parseInt(year));
      setSelectedSeason(season || null);
      if (season) {
         setFilters(prev => ({ ...prev, year: season.year, name: undefined, offset: 0 }));
         setViewMode("season");
      }
   };

   const handleClearFilters = () => {
      const defaultFilters: StormFilters = { limit: 100, offset: 0 };
      setFilters(defaultFilters);
      setSearchTerm("");
      setSelectedSeason(seasons.length > 0 ? seasons.sort((a, b) => b.year - a.year)[0] : null); // Reset to most recent or null
      setShowFilters(false);
   };

   const handleRetry = () => {
      fetchData(filters);
   };

   const availableYears = seasons
      .map(s => s.year.toString())
      .sort((a, b) => parseInt(b) - parseInt(a));

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

   // Ensure offset and limit are numbers for pagination logic
   const currentOffset = typeof filters.offset === "number" ? filters.offset : 0;
   const currentLimit = typeof filters.limit === "number" ? filters.limit : 100;

   return (
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
         {/* Header / Filters */}
         <header className="bg-white shadow-sm p-4 border-b border-gray-200">
            <div className="container mx-auto">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800">StormTrack Pro</h1>
                  <div className="flex items-center gap-3">
                     <Input
                        type="search"
                        placeholder="Search storm by name..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                           setSearchTerm(e.target.value)
                        }
                        className="w-full sm:w-64"
                     />
                     <Select
                        onValueChange={handleSeasonSelect}
                        value={selectedSeason?.year.toString()}
                     >
                        <SelectTrigger className="w-full sm:w-[180px]">
                           <SelectValue placeholder="Select Season" />
                        </SelectTrigger>
                        <SelectContent>
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
               {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Placeholder for more filters */}
                        <div>
                           <label
                              htmlFor="filter-category"
                              className="block text-sm font-medium text-gray-700 mb-1"
                           >
                              Category
                           </label>
                           <Select
                              onValueChange={(value: string) =>
                                 setFilters(prev => ({
                                    ...prev,
                                    category: value ? parseInt(value) : undefined,
                                 }))
                              }
                              value={filters.category?.toString()}
                           >
                              <SelectTrigger id="filter-category">
                                 <SelectValue placeholder="Any Category" />
                              </SelectTrigger>
                              <SelectContent>
                                 {[0, 1, 2, 3, 4, 5].map(cat => (
                                    <SelectItem
                                       key={cat}
                                       value={cat.toString()}
                                    >{`Category ${cat}`}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        {/* Add more filter controls here e.g. basin, month etc. */}
                        <div>
                           <label
                              htmlFor="filter-limit"
                              className="block text-sm font-medium text-gray-700 mb-1"
                           >
                              Results per page
                           </label>
                           <Input
                              id="filter-limit"
                              type="number"
                              value={currentLimit}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                 setFilters(prev => ({
                                    ...prev,
                                    limit: parseInt(e.target.value) || 10,
                                 }))
                              }
                              className="w-full"
                              min="10"
                              max="200"
                           />
                        </div>
                        <div className="col-span-full sm:col-span-2 md:col-span-4 flex justify-end items-center gap-2 pt-2">
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
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100 py-2 rounded-xl">
                     <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                     >
                        Overview
                     </TabsTrigger>
                     <TabsTrigger
                        value="individual"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                        disabled={!selectedStorm}
                     >
                        Individual
                     </TabsTrigger>
                     <TabsTrigger
                        value="season"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                        disabled={!selectedSeason}
                     >
                        Season
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
                     </div>
                  </TabsContent>

                  <TabsContent value="individual" className="flex-1 mt-0 overflow-y-auto">
                     {selectedStorm ? (
                        <StormDetails storm={selectedStorm} className="container mx-auto p-4" />
                     ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                           Select a storm to view details.
                        </div>
                     )}
                  </TabsContent>

                  <TabsContent value="season" className="flex-1 mt-0 overflow-y-auto">
                     {selectedSeason ? (
                        <SeasonAnalysis
                           season={selectedSeason}
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

         {/* Pagination (Example) */}
         {!loading && (storms.length > 0 || currentOffset > 0) && viewMode === "overview" && (
            <footer className="bg-white p-3 border-t border-gray-200 shadow-sm">
               <div className="container mx-auto flex justify-between items-center">
                  <Button
                     onClick={() =>
                        setFilters(prev => ({
                           ...prev,
                           offset: Math.max(
                              0,
                              (typeof prev.offset === "number" ? prev.offset : 0) -
                                 (typeof prev.limit === "number" ? prev.limit : 100)
                           ),
                        }))
                     }
                     disabled={currentOffset === 0}
                     variant="outline"
                  >
                     Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                     Page {Math.floor(currentOffset / currentLimit) + 1}
                     {storms.length === currentLimit
                        ? ` (showing ${currentLimit} storms)`
                        : ` (showing ${storms.length} storms)`}
                  </span>
                  <Button
                     onClick={() =>
                        setFilters(prev => ({
                           ...prev,
                           offset:
                              (typeof prev.offset === "number" ? prev.offset : 0) +
                              (typeof prev.limit === "number" ? prev.limit : 100),
                        }))
                     }
                     disabled={storms.length < currentLimit}
                     variant="outline"
                  >
                     Next
                  </Button>
               </div>
            </footer>
         )}
      </div>
   );
}
