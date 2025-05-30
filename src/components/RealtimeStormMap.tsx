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

interface RealtimeStormMapProps {
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

// Create arrow icon for real-time predictions
function createRealtimeArrowIcon(
   color: string,
   rotation: number,
   size: number = 16,
   isSelected: boolean = false,
   isPredicted: boolean = false,
   isStart: boolean = false,
   isEnd: boolean = false
): DivIcon {
   const borderColor = isPredicted ? "#8B5CF6" : isStart ? "#4ADE80" : isEnd ? "#EF4444" : "";
   const glowEffect = isPredicted ? "box-shadow: 0 0 8px #8B5CF6, 0 0 16px #8B5CF6;" : "";

   return new DivIcon({
      html: `
         <div style="
            width: ${size}px;
            height: ${size}px;
            transform: rotate(${rotation}deg);
            display: flex;
            align-items: center;
            justify-content: center;
            ${isPredicted ? "animation: pulse-glow 2s ease-in-out infinite;" : ""}
         ">
            <div style="
               width: ${size * 0.5}px;
               height: ${size * 0.5}px;
               border-right: 3px solid ${color};
               border-top: 3px solid ${color};
               transform: rotate(45deg);
               ${borderColor ? `box-shadow: 0 0 4px ${borderColor};` : ""}
               ${glowEffect}
               ${isPredicted ? "border-style: dashed;" : ""}
            "></div>
         </div>
      `,
      className: `realtime-storm-chevron ${isSelected ? "selected" : ""} ${
         isPredicted ? "predicted" : ""
      } ${isStart ? "start" : ""} ${isEnd ? "end" : ""}`,
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

         // Add padding for better view
         const padding: [number, number] = [50, 50];
         map.fitBounds(bounds, { padding });
      }
   }, [storms, map]);

   return null;
}

// Component to render real-time storm path with prediction distinction
function RealtimeStormPath({
   storm,
   isSelected,
   onSelect,
}: {
   storm: Storm;
   isSelected: boolean;
   onSelect?: (storm: Storm) => void;
}) {
   // Find the last point with actual wind speed data (not null)
   const lastDataIndex = storm.path.findLastIndex(point => point.windSpeed !== null);

   // Create path segments with distinction between observed and predicted
   const pathSegments = storm.path.slice(0, -1).map((point, index) => {
      const nextPoint = storm.path[index + 1];
      const isPredictedSegment = index >= lastDataIndex;
      const maxCat = Math.max(point.category, nextPoint.category);

      return {
         coordinates: [
            [point.lat, point.lng],
            [nextPoint.lat, nextPoint.lng],
         ] as [number, number][],
         category: maxCat,
         isPredicted: isPredictedSegment,
      };
   });

   return (
      <>
         {/* Storm path segments with prediction distinction */}
         {pathSegments.map((segment, index) => (
            <Polyline
               key={index}
               positions={segment.coordinates}
               color={segment.isPredicted ? "#8B5CF6" : getCategoryColor(segment.category)}
               weight={isSelected ? 5 : 3}
               opacity={isSelected ? 0.9 : segment.isPredicted ? 0.7 : 0.6}
               dashArray={segment.isPredicted ? "10, 5" : undefined}
               className="hover:opacity-100 transition-opacity duration-200"
               eventHandlers={{
                  click: () => onSelect?.(storm),
                  mouseover: e => {
                     e.target.setStyle({ opacity: 1, weight: isSelected ? 6 : 4 });
                  },
                  mouseout: e => {
                     e.target.setStyle({
                        opacity: isSelected ? 0.9 : segment.isPredicted ? 0.7 : 0.6,
                        weight: isSelected ? 5 : 3,
                     });
                  },
               }}
            />
         ))}

         {/* Enhanced storm points with prediction indicators */}
         {storm.path.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === storm.path.length - 1;
            const isPredicted = index > lastDataIndex;
            const isPeak = point.windSpeed === storm.maxWindSpeed;
            const isSinglePoint = storm.path.length === 1;

            // Calculate marker size based on intensity and special points
            let size = isSelected ? 20 : 16;
            if (isPeak) size += 2;
            if (isStart || isEnd) size += 1;
            if (isPredicted) size += 2; // Make predicted points slightly larger

            // If single point storm OR if this is the last point (predicted), use circle marker
            if (isSinglePoint || isEnd) {
               return (
                  <CircleMarker
                     key={index}
                     center={[point.lat, point.lng]}
                     radius={size / 2}
                     fillColor={isPredicted ? "#8B5CF6" : getCategoryColor(point.category)}
                     color={
                        isPredicted
                           ? "#A855F7"
                           : isPeak
                           ? "#FFD700"
                           : isStart
                           ? "#4ADE80"
                           : isEnd
                           ? "#EF4444"
                           : "white"
                     }
                     weight={isPredicted ? 3 : isPeak ? 3 : isStart || isEnd ? 2 : 1}
                     opacity={1}
                     fillOpacity={isSelected ? 0.9 : 0.7}
                     className={`hover:scale-110 transition-transform duration-200 ${
                        isEnd ? "predicted-point" : ""
                     }`}
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
                     <Popup className="realtime-storm-popup" maxWidth={320}>
                        <div className="p-4 min-w-[280px]">
                           {/* Header */}
                           <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                              <div className="relative">
                                 <div
                                    className="w-8 h-8 rounded-full shadow-md border-2 border-white"
                                    style={{
                                       backgroundColor: isPredicted
                                          ? "#8B5CF6"
                                          : getCategoryColor(point.category),
                                    }}
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
                                       style={{
                                          color: isPredicted
                                             ? "#8B5CF6"
                                             : getCategoryColor(point.category),
                                       }}
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
                                       {point.windSpeed
                                          ? formatWindSpeed(point.windSpeed)
                                          : "Predicted"}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Gauge className="w-4 h-4 text-purple-500" />
                                 <div>
                                    <div className="text-xs text-gray-500">Pressure</div>
                                    <div className="text-sm font-medium">
                                       {point.pressure ? `${point.pressure} mb` : "Predicted"}
                                       {isPredicted && (
                                          <span className="text-purple-600 ml-1">*</span>
                                       )}
                                    </div>
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
                           <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex flex-wrap gap-1">
                                 {isStart && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                       Formation
                                    </span>
                                 )}
                                 {isEnd && (
                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                                       Latest Position
                                    </span>
                                 )}
                                 {isPeak && (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                       Peak Intensity
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>
                     </Popup>
                  </CircleMarker>
               );
            }

            // For multi-point storms, calculate direction and use arrow marker
            let bearing = 0;
            let segmentCategory = point.category;

            if (index < storm.path.length - 1) {
               const nextPoint = storm.path[index + 1];
               bearing = calculateBearing(point.lat, point.lng, nextPoint.lat, nextPoint.lng);
               segmentCategory = Math.max(point.category, nextPoint.category);
            } else if (index > 0) {
               const prevPoint = storm.path[index - 1];
               bearing = calculateBearing(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
               segmentCategory = Math.max(prevPoint.category, point.category);
            }

            const rotation = bearing - 90;
            const arrowColor = isPredicted ? "#8B5CF6" : getCategoryColor(segmentCategory);

            const arrowIcon = createRealtimeArrowIcon(
               arrowColor,
               rotation,
               size,
               isSelected,
               isPredicted,
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
                  <Popup className="realtime-storm-popup" maxWidth={320}>
                     <div className="p-4 min-w-[280px]">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                           <div className="relative">
                              <div
                                 className="w-8 h-8 rounded-full shadow-md border-2 border-white"
                                 style={{
                                    backgroundColor: isPredicted
                                       ? "#8B5CF6"
                                       : getCategoryColor(point.category),
                                 }}
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
                                    style={{
                                       color: isPredicted
                                          ? "#8B5CF6"
                                          : getCategoryColor(point.category),
                                    }}
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
                                    {point.windSpeed
                                       ? formatWindSpeed(point.windSpeed)
                                       : "Predicted"}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <Gauge className="w-4 h-4 text-purple-500" />
                              <div>
                                 <div className="text-xs text-gray-500">Pressure</div>
                                 <div className="text-sm font-medium">
                                    {point.pressure ? `${point.pressure} mb` : "Predicted"}
                                 </div>
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
                        <div className="mt-3 pt-3 border-t border-gray-200">
                           <div className="flex flex-wrap gap-1">
                              {isStart && (
                                 <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                    Formation
                                 </span>
                              )}
                              {isEnd && (
                                 <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                                    Latest Position
                                 </span>
                              )}
                              {isPeak && (
                                 <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                    Peak Intensity
                                 </span>
                              )}
                           </div>
                        </div>
                     </div>
                  </Popup>
               </Marker>
            );
         })}
      </>
   );
}

export default function RealtimeStormMap({
   storms,
   selectedStorm,
   onStormSelect,
   className,
}: RealtimeStormMapProps) {
   console.log("rendered");
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
            {/* Enhanced tile layer */}
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
                  <RealtimeStormPath
                     key={storm.id}
                     storm={storm}
                     isSelected={selectedStorm?.id === storm.id}
                     onSelect={onStormSelect}
                  />
               ))}
         </MapContainer>

         {/* Enhanced CSS for real-time predictions */}
         <style jsx global>{`
            .realtime-storm-popup .leaflet-popup-content-wrapper {
               border-radius: 12px;
               box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
               border: 1px solid #e5e7eb;
            }
            .realtime-storm-popup .leaflet-popup-tip {
               background: white;
               border: 1px solid #e5e7eb;
            }
            .realtime-storm-popup .leaflet-popup-content {
               margin: 0;
               padding: 0;
            }
            .map-tiles {
               filter: saturate(1.1) contrast(1.05);
            }

            /* Real-time arrow marker styles */
            .realtime-storm-chevron {
               cursor: pointer;
               transition: transform 0.2s ease;
            }

            .realtime-storm-chevron:hover {
               transform: scale(1.1);
            }

            .realtime-storm-chevron.selected {
               transform: scale(1.05);
            }

            .predicted-point {
               animation: pulse-glow 2s ease-in-out infinite;
            }

            @keyframes pulse-glow {
               0%,
               100% {
                  opacity: 0.7;
               }
               50% {
                  opacity: 1;
               }
            }
         `}</style>
      </div>
   );
}
