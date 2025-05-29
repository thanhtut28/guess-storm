"use client";

import { useEffect } from "react";
import {
   MapContainer,
   TileLayer,
   Polyline,
   CircleMarker,
   Popup,
   useMap,
   Marker,
} from "react-leaflet";
import { Storm } from "@/types/storm";
import { getCategoryColor, getCategoryName, formatDate, formatWindSpeed } from "@/lib/utils";
import { Calendar, Wind, Gauge, Navigation, Activity, Target } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { LatLngBoundsExpression, DivIcon, Point } from "leaflet";

interface StormMapProps {
   storms: Storm[];
   selectedStorm?: Storm | null;
   onStormSelect?: (storm: Storm) => void;
   className?: string;
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
   const dLng = ((lng2 - lng1) * Math.PI) / 180;
   const lat1Rad = (lat1 * Math.PI) / 180;
   const lat2Rad = (lat2 * Math.PI) / 180;

   const y = Math.sin(dLng) * Math.cos(lat2Rad);
   const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

   const bearing = (Math.atan2(y, x) * 180) / Math.PI;
   return (bearing + 360) % 360; // Normalize to 0-360
}

// Create arrow icon
function createArrowIcon(
   color: string,
   rotation: number,
   size: number = 16,
   isSelected: boolean = false,
   isPeak: boolean = false,
   isStart: boolean = false,
   isEnd: boolean = false
): DivIcon {
   const borderColor = isPeak ? "#FFD700" : isStart ? "#4ADE80" : isEnd ? "#EF4444" : "";

   return new DivIcon({
      html: `
         <div style="
            width: ${size}px;
            height: ${size}px;
            transform: rotate(${rotation}deg);
            display: flex;
            align-items: center;
            justify-content: center;
         ">
            <div style="
               width: ${size * 0.5}px;
               height: ${size * 0.5}px;
               border-right: 2px solid ${color};
               border-top: 2px solid ${color};
               transform: rotate(45deg);
               ${borderColor ? `box-shadow: 0 0 4px ${borderColor};` : ""}
            "></div>
         </div>
      `,
      className: `storm-chevron ${isSelected ? "selected" : ""} ${isPeak ? "peak" : ""} ${
         isStart ? "start" : ""
      } ${isEnd ? "end" : ""}`,
      iconSize: new Point(size, size),
      iconAnchor: new Point(size / 2, size / 2),
   });
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

         {/* Enhanced storm points - arrows for multi-point paths, circles for single points */}
         {storm.path.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === storm.path.length - 1;
            const isPeak = point.windSpeed === storm.maxWindSpeed;
            const isSinglePoint = storm.path.length === 1;

            // Calculate marker size based on intensity and special points
            let size = isSelected ? 18 : 14;
            if (isPeak) size += 2;
            if (isStart || isEnd) size += 1;

            // If single point storm, use circle marker
            if (isSinglePoint) {
               return (
                  <CircleMarker
                     key={index}
                     center={[point.lat, point.lng]}
                     radius={size / 2}
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
                              radius: size / 2 + 1,
                           });
                        },
                        mouseout: e => {
                           e.target.setStyle({
                              fillOpacity: isSelected ? 0.9 : 0.7,
                              radius: size / 2,
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
            }

            // For multi-point storms, calculate direction and use arrow marker
            let bearing = 0;
            let segmentCategory = point.category; // Default to point category

            if (index < storm.path.length - 1) {
               // Point to next point
               const nextPoint = storm.path[index + 1];
               bearing = calculateBearing(point.lat, point.lng, nextPoint.lat, nextPoint.lng);
               // Use the same logic as path segments: max category between current and next point
               segmentCategory = Math.max(point.category, nextPoint.category);
            } else if (index > 0) {
               // Last point: use direction from previous point
               const prevPoint = storm.path[index - 1];
               bearing = calculateBearing(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
               // For the last point, use max category between previous and current point
               segmentCategory = Math.max(prevPoint.category, point.category);
            }

            // Adjust rotation for chevron (subtract 90 degrees since chevron points right by default)
            const rotation = bearing - 90;

            const arrowIcon = createArrowIcon(
               getCategoryColor(segmentCategory),
               rotation,
               size,
               isSelected,
               isPeak,
               isStart,
               isEnd
            );

            return (
               <Marker
                  key={index}
                  position={[point.lat, point.lng]}
                  icon={arrowIcon}
                  eventHandlers={{
                     click: () => onSelect?.(storm),
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

                        {/* Position and Direction */}
                        <div className="grid grid-cols-1 gap-2">
                           <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Navigation className="w-4 h-4 text-green-500" />
                              <div>
                                 <div className="text-xs text-gray-500">Position</div>
                                 <div className="text-sm font-medium">
                                    {point.lat.toFixed(2)}°N, {Math.abs(point.lng).toFixed(2)}°W
                                 </div>
                              </div>
                           </div>
                           {!isSinglePoint && (
                              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                 <div
                                    className="w-4 h-4 flex items-center justify-center"
                                    style={{ transform: `rotate(${bearing}deg)` }}
                                 >
                                    ➤
                                 </div>
                                 <div>
                                    <div className="text-xs text-gray-500">Direction</div>
                                    <div className="text-sm font-medium">
                                       {bearing.toFixed(0)}° (
                                       {bearing >= 337.5 || bearing < 22.5
                                          ? "N"
                                          : bearing >= 22.5 && bearing < 67.5
                                          ? "NE"
                                          : bearing >= 67.5 && bearing < 112.5
                                          ? "E"
                                          : bearing >= 112.5 && bearing < 157.5
                                          ? "SE"
                                          : bearing >= 157.5 && bearing < 202.5
                                          ? "S"
                                          : bearing >= 202.5 && bearing < 247.5
                                          ? "SW"
                                          : bearing >= 247.5 && bearing < 292.5
                                          ? "W"
                                          : "NW"}
                                       )
                                    </div>
                                 </div>
                              </div>
                           )}
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
               </Marker>
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
            minZoom={4}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
            className="rounded-lg"
            worldCopyJump={false}
            maxBounds={[
               [-85, -540],
               [85, 540],
            ]}
            maxBoundsViscosity={1.0}
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

            /* Arrow marker styles */
            .storm-chevron {
               cursor: pointer;
               transition: transform 0.2s ease;
            }

            .storm-chevron:hover {
               transform: scale(1.1);
            }

            .storm-chevron.selected {
               transform: scale(1.05);
            }

            /* .storm-chevron.peak {
               animation: pulse-simple 2s ease-in-out infinite;
            }

            @keyframes pulse-simple {
               0%,
               100% {
                  transform: scale(1);
               }
               50% {
                  transform: scale(1.05);
               }
            } */
         `}</style>
      </div>
   );
}
