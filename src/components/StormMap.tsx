"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import { Storm } from "@/types/storm";
import { getCategoryColor, getCategoryName, formatDate, formatWindSpeed } from "@/lib/utils";
import { Calendar, Wind, Gauge, Navigation, Activity, Target } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { LatLngBoundsExpression } from "leaflet";

interface StormMapProps {
   storms: Storm[];
   selectedStorm?: Storm | null;
   onStormSelect?: (storm: Storm) => void;
   className?: string;
}

// Component to fit map bounds to storms
function FitBounds({ storms }: { storms: Storm[] }) {
   const map = useMap();

   useEffect(() => {
      if (storms.length === 0) return;

      const allPoints = storms.flatMap(storm =>
         storm.path.map(point => [point.lat, point.lng] as [number, number])
      );

      if (allPoints.length > 0) {
         const bounds: LatLngBoundsExpression = allPoints.reduce(
            (acc, point) => {
               return [
                  [Math.min(acc[0][0], point[0]), Math.min(acc[0][1], point[1])],
                  [Math.max(acc[1][0], point[0]), Math.max(acc[1][1], point[1])],
               ] as [[number, number], [number, number]];
            },
            [
               [allPoints[0][0], allPoints[0][1]],
               [allPoints[0][0], allPoints[0][1]],
            ] as [[number, number], [number, number]]
         );

         // Add padding based on storm intensity
         const maxCategory = Math.max(...storms.map(s => s.maxCategory));
         const padding: [number, number] = maxCategory >= 3 ? [40, 40] : [20, 20];

         map.fitBounds(bounds, { padding });
      }
   }, [storms, map]);

   return null;
}

// Component to render storm path
function StormPath({
   storm,
   isSelected,
   onSelect,
}: {
   storm: Storm;
   isSelected: boolean;
   onSelect?: (storm: Storm) => void;
}) {
   // Create a gradient effect by using multiple polylines for different intensities
   const pathSegments = storm.path.slice(0, -1).map((point, index) => {
      const nextPoint = storm.path[index + 1];
      const maxCat = Math.max(point.category, nextPoint.category);
      return {
         coordinates: [
            [point.lat, point.lng],
            [nextPoint.lat, nextPoint.lng],
         ] as [number, number][],
         category: maxCat,
      };
   });

   return (
      <>
         {/* Storm path segments with gradient coloring */}
         {pathSegments.map((segment, index) => (
            <Polyline
               key={index}
               positions={segment.coordinates}
               color={getCategoryColor(segment.category)}
               weight={isSelected ? 5 : 3}
               opacity={isSelected ? 0.9 : 0.6}
               className="hover:opacity-100 transition-opacity duration-200"
               eventHandlers={{
                  click: () => onSelect?.(storm),
                  mouseover: e => {
                     e.target.setStyle({ opacity: 1, weight: isSelected ? 6 : 4 });
                  },
                  mouseout: e => {
                     e.target.setStyle({
                        opacity: isSelected ? 0.9 : 0.6,
                        weight: isSelected ? 5 : 3,
                     });
                  },
               }}
            />
         ))}

         {/* Enhanced storm points */}
         {storm.path.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === storm.path.length - 1;
            const isPeak = point.windSpeed === storm.maxWindSpeed;

            // Calculate marker size based on intensity and special points
            let radius = isSelected ? 5 : 3;
            if (isPeak) radius += 2;
            if (isStart || isEnd) radius += 1;

            return (
               <CircleMarker
                  key={index}
                  center={[point.lat, point.lng]}
                  radius={radius}
                  fillColor={getCategoryColor(point.category)}
                  color={isPeak ? "#FFD700" : isStart ? "#4ADE80" : isEnd ? "#EF4444" : "white"}
                  weight={isPeak ? 3 : isStart || isEnd ? 2 : 1}
                  opacity={1}
                  fillOpacity={isSelected ? 0.9 : 0.7}
                  className="hover:scale-110 transition-transform duration-200"
                  eventHandlers={{
                     click: () => onSelect?.(storm),
                     mouseover: e => {
                        e.target.setStyle({
                           fillOpacity: 1,
                           radius: radius + 1,
                        });
                     },
                     mouseout: e => {
                        e.target.setStyle({
                           fillOpacity: isSelected ? 0.9 : 0.7,
                           radius: radius,
                        });
                     },
                  }}
               >
                  <Popup className="storm-popup" maxWidth={320}>
                     <div className="p-4 min-w-[280px]">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                           <div className="relative">
                              <div
                                 className="w-8 h-8 rounded-full shadow-md border-2 border-white"
                                 style={{ backgroundColor: getCategoryColor(point.category) }}
                              />
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-xs flex items-center justify-center text-gray-700 font-bold">
                                 {point.category}
                              </div>
                           </div>
                           <div>
                              <h3 className="font-bold text-lg text-gray-900">{storm.name}</h3>
                              <p className="text-sm text-gray-600">{storm.season}</p>
                           </div>
                           {isPeak && (
                              <div className="ml-auto" title="Peak Intensity">
                                 <Target className="w-5 h-5 text-yellow-500" />
                              </div>
                           )}
                        </div>

                        {/* Point Details */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                           <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <div>
                                 <div className="text-xs text-gray-500">Date</div>
                                 <div className="text-sm font-medium">
                                    {formatDate(point.timestamp)}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-red-500" />
                              <div>
                                 <div className="text-xs text-gray-500">Category</div>
                                 <div
                                    className="text-sm font-medium"
                                    style={{ color: getCategoryColor(point.category) }}
                                 >
                                    {getCategoryName(point.category)}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <Wind className="w-4 h-4 text-blue-600" />
                              <div>
                                 <div className="text-xs text-gray-500">Wind Speed</div>
                                 <div className="text-sm font-medium">
                                    {formatWindSpeed(point.windSpeed)}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <Gauge className="w-4 h-4 text-purple-500" />
                              <div>
                                 <div className="text-xs text-gray-500">Pressure</div>
                                 <div className="text-sm font-medium">{point.pressure} mb</div>
                              </div>
                           </div>
                        </div>

                        {/* Position */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                           <Navigation className="w-4 h-4 text-green-500" />
                           <div>
                              <div className="text-xs text-gray-500">Position</div>
                              <div className="text-sm font-medium">
                                 {point.lat.toFixed(2)}°N, {Math.abs(point.lng).toFixed(2)}°W
                              </div>
                           </div>
                        </div>

                        {/* Special indicators */}
                        {(isStart || isEnd || isPeak) && (
                           <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex flex-wrap gap-1">
                                 {isStart && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                       Formation
                                    </span>
                                 )}
                                 {isEnd && (
                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                                       Dissipation
                                    </span>
                                 )}
                                 {isPeak && (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                       Peak Intensity
                                    </span>
                                 )}
                              </div>
                           </div>
                        )}
                     </div>
                  </Popup>
               </CircleMarker>
            );
         })}
      </>
   );
}

export default function StormMap({
   storms,
   selectedStorm,
   onStormSelect,
   className,
}: StormMapProps) {
   return (
      <div className={className}>
         <MapContainer
            center={[25, -80]}
            zoom={4}
            style={{ height: "100%", width: "100%" }}
            className="rounded-lg"
         >
            {/* Enhanced tile layer with satellite option */}
            <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
               className="map-tiles"
            />

            <FitBounds storms={storms} />

            {/* Render storms with selected storm on top */}
            {storms
               .sort((a, b) => {
                  if (selectedStorm?.id === a.id) return 1;
                  if (selectedStorm?.id === b.id) return -1;
                  return 0;
               })
               .map(storm => (
                  <StormPath
                     key={storm.id}
                     storm={storm}
                     isSelected={selectedStorm?.id === storm.id}
                     onSelect={onStormSelect}
                  />
               ))}
         </MapContainer>

         {/* Add custom CSS for enhanced styling */}
         <style jsx global>{`
            .storm-popup .leaflet-popup-content-wrapper {
               border-radius: 12px;
               box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
               border: 1px solid #e5e7eb;
            }
            .storm-popup .leaflet-popup-tip {
               background: white;
               border: 1px solid #e5e7eb;
            }
            .storm-popup .leaflet-popup-content {
               margin: 0;
               padding: 0;
            }
            .map-tiles {
               filter: saturate(1.1) contrast(1.05);
            }
         `}</style>
      </div>
   );
}
