"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Season, Storm } from "@/types/storm";
import { stormApi } from "@/lib/api";
import { getCategoryColor, getCategoryName, formatDate, formatWindSpeed } from "@/lib/utils";
import { BarChart3, TrendingUp, Activity, Loader2, Map, Calendar, Wind, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dynamically import StormMap to avoid SSR issues
const StormMap = dynamic(() => import("@/components/StormMap"), { ssr: false });

interface SeasonAnalysisProps {
   season: Season | null;
   onStormSelect?: (storm: Storm) => void;
   className?: string;
}

export default function SeasonAnalysis({ season, onStormSelect, className }: SeasonAnalysisProps) {
   const [storms, setStorms] = useState<Storm[]>([]);
   const [loading, setLoading] = useState(false);
   const [selectedStorm, setSelectedStorm] = useState<Storm | null>(null);

   // Fetch storms for the selected season
   useEffect(() => {
      if (!season) {
         setStorms([]);
         return;
      }

      const fetchSeasonStorms = async () => {
         try {
            setLoading(true);
            const response = await stormApi.getStorms({
               year: season.year,
               season: season.name,
            });
            setStorms(response.data);
         } catch (error) {
            console.error("Error fetching season storms:", error);
            setStorms([]);
         } finally {
            setLoading(false);
         }
      };

      fetchSeasonStorms();
   }, [season]);

   const handleStormSelect = (storm: Storm | null) => {
      setSelectedStorm(storm);
      if (storm) {
         onStormSelect?.(storm);
      }
   };

   if (!season) {
      return (
         <div className={`bg-white rounded-xl shadow-lg p-8 ${className}`}>
            <div className="text-center text-gray-500">
               <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p className="text-xl font-medium">No Season Selected</p>
               <p className="text-sm">Select a season to view analysis and storm tracks</p>
            </div>
         </div>
      );
   }

   const categoryBreakdown = storms.reduce((acc: Record<number, number>, storm: Storm) => {
      acc[storm.maxCategory] = (acc[storm.maxCategory] || 0) + 1;
      return acc;
   }, {} as Record<number, number>);

   return (
      <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
         {/* Header */}
         <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
               <div>
                  <h2 className="text-2xl font-bold mb-1">{season.name}</h2>
                  <p className="text-blue-100">Interactive Season Analysis</p>
               </div>
               <div className="text-right">
                  <div className="text-3xl font-bold">{storms.length}</div>
                  <div className="text-sm text-blue-100">Total Storms</div>
               </div>
            </div>
         </div>

         {/* Quick Stats Bar */}
         <div className="grid grid-cols-3 border-b border-gray-200">
            <div className="p-4 text-center border-r border-gray-200">
               <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-600">Major Hurricanes</span>
               </div>
               <div className="text-2xl font-bold text-red-600">{season.majorHurricanes}</div>
               <div className="text-xs text-gray-500">Category 3+</div>
            </div>
            <div className="p-4 text-center border-r border-gray-200">
               <div className="flex items-center justify-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-600">ACE Index</span>
               </div>
               <div className="text-2xl font-bold text-purple-600">{season.aceIndex}</div>
               <div className="text-xs text-gray-500">Energy Index</div>
            </div>
            <div className="p-4 text-center">
               <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">Active Days</span>
               </div>
               <div className="text-2xl font-bold text-blue-600">
                  {storms.length > 0
                     ? Math.round(
                          storms.reduce((total, storm) => {
                             const start = new Date(storm.startDate);
                             const end = new Date(storm.endDate);
                             return (
                                total +
                                Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                             );
                          }, 0) / storms.length
                       )
                     : 0}
               </div>
               <div className="text-xs text-gray-500">Avg Duration</div>
            </div>
         </div>

         <Tabs defaultValue="map" className="flex-1">
            <TabsList className="w-full grid grid-cols-3 bg-gray-50 p-1 m-4 rounded-lg">
               <TabsTrigger
                  value="map"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
               >
                  <Map className="w-4 h-4 mr-2" />
                  Storm Tracks
               </TabsTrigger>
               <TabsTrigger
                  value="analysis"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
               >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analysis
               </TabsTrigger>
               <TabsTrigger
                  value="storms"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
               >
                  <Activity className="w-4 h-4 mr-2" />
                  Storm List
               </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="m-4 mt-0">
               <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4 flex items-center justify-between">
                     <h3 className="text-lg font-semibold text-gray-900">Season Storm Tracks</h3>
                     {selectedStorm && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm">
                           <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                 backgroundColor: getCategoryColor(selectedStorm.maxCategory),
                              }}
                           />
                           <span className="text-sm font-medium">{selectedStorm.name}</span>
                        </div>
                     )}
                  </div>
                  <div className="h-96 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                     {loading ? (
                        <div className="flex items-center justify-center h-full bg-gray-100">
                           <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                           <span className="ml-2 text-gray-600">Loading storm tracks...</span>
                        </div>
                     ) : (
                        <StormMap
                           storms={storms}
                           selectedStorm={selectedStorm}
                           onStormSelect={handleStormSelect}
                           className="w-full h-full"
                        />
                     )}
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="analysis" className="m-4 mt-0">
               <div className="space-y-6">
                  {/* Category Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Storm Categories</h3>
                     <div className="space-y-3">
                        {[0, 1, 2, 3, 4, 5].map(category => {
                           const count = categoryBreakdown[category] || 0;
                           const percentage = storms.length > 0 ? (count / storms.length) * 100 : 0;

                           return (
                              <div key={category} className="flex items-center gap-3">
                                 <div
                                    className="w-5 h-5 rounded-full shadow-sm border border-white"
                                    style={{ backgroundColor: getCategoryColor(category) }}
                                 />
                                 <span className="text-sm font-medium w-32">
                                    {getCategoryName(category)}
                                 </span>
                                 <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                       className="h-3 rounded-full transition-all duration-500 shadow-sm"
                                       style={{
                                          backgroundColor: getCategoryColor(category),
                                          width: `${percentage}%`,
                                       }}
                                    />
                                 </div>
                                 <div className="flex items-center gap-2 min-w-16">
                                    <span className="text-sm font-bold text-gray-700">{count}</span>
                                    <span className="text-xs text-gray-500">
                                       ({percentage.toFixed(0)}%)
                                    </span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  {/* Monthly Distribution */}
                  <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Peak Activity Months
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                        {storms.length > 0 && (
                           <>
                              <div className="text-center p-3 bg-white rounded-lg">
                                 <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                 <div className="text-sm text-gray-600">Peak Month</div>
                                 <div className="font-semibold">
                                    {new Date(
                                       0,
                                       storms.reduce((acc, storm) => {
                                          const month = new Date(storm.startDate).getMonth();
                                          const monthCount = storms.filter(
                                             s => new Date(s.startDate).getMonth() === month
                                          ).length;
                                          return monthCount >
                                             (storms.filter(
                                                s => new Date(s.startDate).getMonth() === acc
                                             ).length || 0)
                                             ? month
                                             : acc;
                                       }, 0)
                                    ).toLocaleDateString("en-US", { month: "long" })}
                                 </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                 <Wind className="w-6 h-6 mx-auto mb-2 text-red-500" />
                                 <div className="text-sm text-gray-600">Strongest Storm</div>
                                 <div className="font-semibold">
                                    {
                                       storms.reduce((max, storm) =>
                                          storm.maxWindSpeed > max.maxWindSpeed ? storm : max
                                       ).name
                                    }
                                 </div>
                                 <div className="text-xs text-gray-500">
                                    {formatWindSpeed(
                                       storms.reduce((max, storm) =>
                                          storm.maxWindSpeed > max.maxWindSpeed ? storm : max
                                       ).maxWindSpeed
                                    )}
                                 </div>
                              </div>
                           </>
                        )}
                     </div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="storms" className="m-4 mt-0">
               <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                     All Storms ({storms.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                     {loading ? (
                        <div className="flex items-center justify-center py-8">
                           <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                           <span className="ml-2 text-gray-600">Loading storms...</span>
                        </div>
                     ) : storms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                           <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                           <p>No storms found for this season</p>
                        </div>
                     ) : (
                        storms.map((storm: Storm) => (
                           <div
                              key={storm.id}
                              className={`flex items-center justify-between p-4 bg-white rounded-lg hover:shadow-md cursor-pointer transition-all duration-200 border-2 ${
                                 selectedStorm?.id === storm.id
                                    ? "border-blue-300 shadow-md"
                                    : "border-transparent hover:border-gray-200"
                              }`}
                              onClick={() => handleStormSelect(storm)}
                           >
                              <div className="flex items-center gap-4">
                                 <div className="relative">
                                    <div
                                       className="w-6 h-6 rounded-full shadow-sm border-2 border-white"
                                       style={{
                                          backgroundColor: getCategoryColor(storm.maxCategory),
                                       }}
                                    />
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full text-xs flex items-center justify-center text-gray-700 font-bold">
                                       {storm.maxCategory}
                                    </div>
                                 </div>
                                 <div>
                                    <p className="font-semibold text-gray-900 text-lg">
                                       {storm.name}
                                    </p>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                       <Calendar className="w-3 h-3" />
                                       {formatDate(storm.startDate)} - {formatDate(storm.endDate)}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                                    <Wind className="w-4 h-4 text-blue-500" />
                                    {formatWindSpeed(storm.maxWindSpeed)}
                                 </div>
                                 <p
                                    className="text-sm font-medium"
                                    style={{ color: getCategoryColor(storm.maxCategory) }}
                                 >
                                    {getCategoryName(storm.maxCategory)}
                                 </p>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </TabsContent>
         </Tabs>
      </div>
   );
}
