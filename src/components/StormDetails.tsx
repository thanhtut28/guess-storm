"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Storm } from "@/types/storm";
import { getCategoryColor, getCategoryName, formatDate, formatWindSpeed } from "@/lib/utils";
import { Calendar, Wind, Gauge, Activity, Map, Navigation, Target, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dynamically import StormMap to avoid SSR issues
const StormMap = dynamic(() => import("@/components/StormMap"), { ssr: false });

interface StormDetailsProps {
   storm: Storm | null;
   className?: string;
}

export default function StormDetails({ storm, className }: StormDetailsProps) {
   const [selectedPathPoint, setSelectedPathPoint] = useState<number | null>(null);

   if (!storm) {
      return (
         <div className={`bg-white rounded-xl shadow-lg p-8 ${className}`}>
            <div className="text-center text-gray-500">
               <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p className="text-xl font-medium">No Storm Selected</p>
               <p className="text-sm">Click on a storm path to view detailed analysis</p>
            </div>
         </div>
      );
   }

   const maxPoint = storm.path.reduce((max, point) =>
      (point.windSpeed || 0) > (max.windSpeed || 0) ? point : max
   );

   const minPressurePoint = storm.path.reduce((min, point) =>
      (point.pressure || 9999) < (min.pressure || 9999) ? point : min
   );

   return (
      <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
         {/* Storm Header */}
         <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="relative">
                     <div
                        className="w-12 h-12 rounded-full shadow-lg border-4 border-white"
                        style={{ backgroundColor: getCategoryColor(storm.maxCategory) }}
                     />
                     <div className="absolute -bottom-1 -right-1 bg-white text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {storm.maxCategory}
                     </div>
                  </div>
                  <div>
                     <h2 className="text-3xl font-bold mb-1">{storm.name}</h2>
                     <p className="text-blue-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {storm.season}
                     </p>
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-2xl font-bold">{formatWindSpeed(storm.maxWindSpeed)}</div>
                  <div className="text-sm text-blue-100">Peak Winds</div>
               </div>
            </div>
         </div>

         {/* Quick Stats */}
         <div className="grid grid-cols-4 border-b border-gray-200">
            <div className="p-4 text-center border-r border-gray-200">
               <div className="flex items-center justify-center gap-1 mb-1">
                  <Wind className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">Max Winds</span>
               </div>
               <div className="text-xl font-bold text-blue-600">
                  {formatWindSpeed(storm.maxWindSpeed)}
               </div>
            </div>
            <div className="p-4 text-center border-r border-gray-200">
               <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-600">Category</span>
               </div>
               <div
                  className="text-xl font-bold"
                  style={{ color: getCategoryColor(storm.maxCategory) }}
               >
                  {storm.maxCategory}
               </div>
            </div>
            <div className="p-4 text-center border-r border-gray-200">
               <div className="flex items-center justify-center gap-1 mb-1">
                  <Gauge className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-600">Min Pressure</span>
               </div>
               <div className="text-xl font-bold text-purple-600">
                  {minPressurePoint.pressure} mb
               </div>
            </div>
            <div className="p-4 text-center">
               <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-600">Duration</span>
               </div>
               <div className="text-xl font-bold text-green-600">
                  {Math.ceil(
                     (new Date(storm.endDate).getTime() - new Date(storm.startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                  )}
                  d
               </div>
            </div>
         </div>

         <Tabs defaultValue="track" className="flex-1">
            <TabsList className="w-full grid grid-cols-3 bg-gray-50 p-1 m-4 rounded-lg">
               <TabsTrigger
                  value="track"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
               >
                  <Map className="w-4 h-4 mr-2" />
                  Storm Track
               </TabsTrigger>
               <TabsTrigger
                  value="intensity"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
               >
                  <Target className="w-4 h-4 mr-2" />
                  Peak Analysis
               </TabsTrigger>
               <TabsTrigger
                  value="timeline"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
               >
                  <Navigation className="w-4 h-4 mr-2" />
                  Path Timeline
               </TabsTrigger>
            </TabsList>

            <TabsContent value="track" className="m-4 mt-0">
               <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4 flex items-center justify-between">
                     <h3 className="text-lg font-semibold text-gray-900">
                        Storm Track Visualization
                     </h3>
                     <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                           <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                           <span>TD/TS</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                           <span>Cat 1-2</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <div className="w-3 h-3 rounded-full bg-red-400"></div>
                           <span>Cat 3+</span>
                        </div>
                     </div>
                  </div>
                  <div className="h-[500px] rounded-lg overflow-hidden shadow-sm border border-gray-200">
                     <StormMap
                        storms={[storm]}
                        selectedStorm={storm}
                        onStormSelect={() => {}}
                        className="w-full h-full"
                     />
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="intensity" className="m-4 mt-0">
               <div className="space-y-6">
                  {/* Peak Intensity Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                     <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Peak Intensity Analysis
                     </h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                           <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                           <div className="text-sm text-gray-600">Date</div>
                           <div className="font-semibold">{formatDate(maxPoint.timestamp)}</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                           <Navigation className="w-6 h-6 mx-auto mb-2 text-green-500" />
                           <div className="text-sm text-gray-600">Position</div>
                           <div className="font-semibold text-sm">
                              {maxPoint.lat.toFixed(2)}°N
                              <br />
                              {Math.abs(maxPoint.lng).toFixed(2)}°W
                           </div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                           <Wind className="w-6 h-6 mx-auto mb-2 text-red-500" />
                           <div className="text-sm text-gray-600">Wind Speed</div>
                           <div className="font-semibold">
                              {formatWindSpeed(maxPoint.windSpeed)}
                           </div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                           <Gauge className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                           <div className="text-sm text-gray-600">Pressure</div>
                           <div className="font-semibold">{maxPoint.pressure} mb</div>
                        </div>
                     </div>
                  </div>

                  {/* Intensity Evolution */}
                  <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Intensity Evolution
                     </h3>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                           <span className="text-sm font-medium text-gray-700">Formation</span>
                           <div className="flex items-center gap-2">
                              <div
                                 className="w-4 h-4 rounded-full"
                                 style={{
                                    backgroundColor: getCategoryColor(storm.path[0]?.category || 0),
                                 }}
                              />
                              <span className="text-sm">
                                 {formatWindSpeed(storm.path[0]?.windSpeed)}
                              </span>
                           </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                           <span className="text-sm font-medium text-gray-700">Peak Intensity</span>
                           <div className="flex items-center gap-2">
                              <div
                                 className="w-4 h-4 rounded-full"
                                 style={{ backgroundColor: getCategoryColor(storm.maxCategory) }}
                              />
                              <span className="text-sm font-semibold">
                                 {formatWindSpeed(storm.maxWindSpeed)}
                              </span>
                           </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                           <span className="text-sm font-medium text-gray-700">Dissipation</span>
                           <div className="flex items-center gap-2">
                              <div
                                 className="w-4 h-4 rounded-full"
                                 style={{
                                    backgroundColor: getCategoryColor(
                                       storm.path[storm.path.length - 1]?.category || 0
                                    ),
                                 }}
                              />
                              <span className="text-sm">
                                 {formatWindSpeed(storm.path[storm.path.length - 1]?.windSpeed)}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="timeline" className="m-4 mt-0">
               <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Storm Path</h3>
                  <div className="max-h-[500px] overflow-y-auto space-y-2">
                     {storm.path.map((point, index) => (
                        <div
                           key={index}
                           className={`flex items-center justify-between p-4 bg-white rounded-lg hover:shadow-md cursor-pointer transition-all duration-200 border-2 ${
                              selectedPathPoint === index
                                 ? "border-blue-300 shadow-md"
                                 : "border-transparent hover:border-gray-200"
                           }`}
                           onClick={() =>
                              setSelectedPathPoint(selectedPathPoint === index ? null : index)
                           }
                        >
                           <div className="flex items-center gap-4">
                              <div className="relative">
                                 <div
                                    className="w-6 h-6 rounded-full shadow-sm border-2 border-white"
                                    style={{ backgroundColor: getCategoryColor(point.category) }}
                                 />
                                 <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full text-xs flex items-center justify-center text-gray-700 font-bold">
                                    {point.category}
                                 </div>
                              </div>
                              <div>
                                 <p className="font-semibold text-gray-900">
                                    {formatDate(point.timestamp)}
                                 </p>
                                 <p className="text-sm text-gray-600">
                                    {point.lat.toFixed(2)}°N, {Math.abs(point.lng).toFixed(2)}°W
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="flex items-center gap-1 font-bold text-gray-900">
                                 <Wind className="w-4 h-4 text-blue-500" />
                                 {formatWindSpeed(point.windSpeed)}
                              </div>
                              <p
                                 className="text-sm font-medium"
                                 style={{ color: getCategoryColor(point.category) }}
                              >
                                 {getCategoryName(point.category)}
                              </p>
                              <p className="text-xs text-gray-500">{point.pressure} mb</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </TabsContent>
         </Tabs>
      </div>
   );
}
