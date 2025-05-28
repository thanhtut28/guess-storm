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
import { LatLngBoundsExpression, DivIcon } from "leaflet";

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

         // Add padding
         const padding: [number, number] = [20, 20];
         map.fitBounds(bounds, { padding });
      }
   }, [storms, map]);

   return null;
}

// Helper function to darken a color
function darkenColor(color: string, factor: number = 0.7): string {
   // Remove # if present
   const hex = color.replace("#", "");

   // Convert to RGB
   const r = parseInt(hex.substr(0, 2), 16);
   const g = parseInt(hex.substr(2, 2), 16);
   const b = parseInt(hex.substr(4, 2), 16);

   // Darken
   const darkR = Math.floor(r * factor);
   const darkG = Math.floor(g * factor);
   const darkB = Math.floor(b * factor);

   // Convert back to hex
   return `#${darkR.toString(16).padStart(2, "0")}${darkG.toString(16).padStart(2, "0")}${darkB
      .toString(16)
      .padStart(2, "0")}`;
}

// Component to create animated directional arrows along the storm path
function StormPathArrows({ storm, isSelected }: { storm: Storm; isSelected: boolean }) {
   const arrows = [];

   // Only show arrows if there are at least 2 points and skip some points to avoid clutter
   const skipFactor = Math.max(1, Math.floor(storm.path.length / 8)); // Show max 8 arrows

   for (let i = 0; i < storm.path.length - 1; i += skipFactor) {
      const current = storm.path[i];
      const next = storm.path[Math.min(i + skipFactor, storm.path.length - 1)];

      // Calculate the bearing (direction) between two points
      const lat1 = (current.lat * Math.PI) / 180;
      const lat2 = (next.lat * Math.PI) / 180;
      const deltaLng = ((next.lng - current.lng) * Math.PI) / 180;

      const x = Math.sin(deltaLng) * Math.cos(lat2);
      const y =
         Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

      let bearing = (Math.atan2(x, y) * 180) / Math.PI;
      bearing = (bearing + 360) % 360;

      // Create arrow at midpoint
      const midLat = (current.lat + next.lat) / 2;
      const midLng = (current.lng + next.lng) / 2;

      // Get the color based on storm intensity at this segment
      const segmentCategory = Math.max(current.category, next.category);
      const baseColor = getCategoryColor(segmentCategory);
      const arrowColor = darkenColor(baseColor, 0.6);

      // Create animated arrow icon with SVG
      const arrowIcon = new DivIcon({
         html: `
            <div class="storm-arrow-container" style="
               transform: rotate(${bearing}deg);
               width: 100%;
               height: 100%;
               display: flex;
               align-items: center;
               justify-content: center;
            ">
               <svg width="${isSelected ? "24" : "20"}" height="${
            isSelected ? "24" : "20"
         }" viewBox="0 0 24 24" style="
                  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
               ">
                  <path d="M8 5v14l11-7z" fill="${arrowColor}" stroke="white" stroke-width="1"/>
               </svg>
            </div>
         `,
         className: `storm-direction-arrow ${
            isSelected ? "selected-arrow" : ""
         } storm-arrow-animated`,
         iconSize: [isSelected ? 24 : 20, isSelected ? 24 : 20],
         iconAnchor: [isSelected ? 12 : 10, isSelected ? 12 : 10],
      });

      arrows.push(
         <Marker key={`arrow-${storm.id}-${i}`} position={[midLat, midLng]} icon={arrowIcon} />
      );
   }

   return <>{arrows}</>;
}

// Component to render storm path with wavy style
function StormPath({
   storm,
   isSelected,
   onSelect,
}: {
   storm: Storm;
   isSelected: boolean;
   onSelect?: (storm: Storm) => void;
}) {
   // Create smooth path with curved segments
   const createSmoothPath = (points: { lat: number; lng: number }[]): [number, number][] => {
      if (points.length < 2) return [];

      const smoothPath: [number, number][] = [];

      for (let i = 0; i < points.length - 1; i++) {
         const current = points[i];
         const next = points[i + 1];

         // Add some curve variation to make it look more like the image
         const midLat = (current.lat + next.lat) / 2;
         const midLng = (current.lng + next.lng) / 2;

         // Add slight offset for wavy effect
         const offset = 0.1 * (Math.sin(i * 0.5) * 0.5);

         smoothPath.push([current.lat, current.lng]);
         if (i < points.length - 2) {
            smoothPath.push([midLat + offset, midLng + offset]);
         }
      }

      // Add the last point
      smoothPath.push([points[points.length - 1].lat, points[points.length - 1].lng]);

      return smoothPath;
   };

   const smoothedPath = createSmoothPath(storm.path);

   // Create path segments for different colors
   const pathSegments = [];
   for (let i = 0; i < storm.path.length - 1; i++) {
      const current = storm.path[i];
      const next = storm.path[i + 1];
      const maxCat = Math.max(current.category, next.category);

      pathSegments.push({
         coordinates: [
            [current.lat, current.lng],
            [next.lat, next.lng],
         ] as [number, number][],
         category: maxCat,
      });
   }

   return (
      <>
         {/* Main storm path with wavy effect */}
         <Polyline
            positions={smoothedPath}
            color={getCategoryColor(storm.path[0]?.category || 1)}
            weight={isSelected ? 6 : 4}
            opacity={0.8}
            className="storm-path-main"
            dashArray={isSelected ? undefined : "5, 5"}
            eventHandlers={{
               click: () => onSelect?.(storm),
               mouseover: e => {
                  e.target.setStyle({
                     opacity: 1,
                     weight: isSelected ? 8 : 6,
                  });
               },
               mouseout: e => {
                  e.target.setStyle({
                     opacity: 0.8,
                     weight: isSelected ? 6 : 4,
                  });
               },
            }}
         />

         {/* Individual segments with category colors */}
         {pathSegments.map((segment, index) => (
            <Polyline
               key={`segment-${index}`}
               positions={segment.coordinates}
               color={getCategoryColor(segment.category)}
               weight={isSelected ? 5 : 3}
               opacity={0.9}
               className="storm-path-segment"
               eventHandlers={{
                  click: () => onSelect?.(storm),
               }}
            />
         ))}

         {/* Animated directional arrows */}
         <StormPathArrows storm={storm} isSelected={isSelected} />

         {/* Beautiful storm nodes */}
         {storm.path.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === storm.path.length - 1;
            const isPeak = point.windSpeed === storm.maxWindSpeed;

            // Beautiful node styling
            let radius = isSelected ? 8 : 6;
            if (isPeak) radius += 3;
            if (isStart || isEnd) radius += 2;

            const categoryColor = getCategoryColor(point.category);
            let borderColor = "#ffffff";
            let borderWidth = 3;

            if (isPeak) {
               borderColor = "#FFD700";
               borderWidth = 4;
            } else if (isStart) {
               borderColor = "#10B981";
               borderWidth = 4;
            } else if (isEnd) {
               borderColor = "#EF4444";
               borderWidth = 4;
            }

            return (
               <CircleMarker
                  key={index}
                  center={[point.lat, point.lng]}
                  radius={radius}
                  fillColor={categoryColor}
                  color={borderColor}
                  weight={borderWidth}
                  opacity={1}
                  fillOpacity={0.9}
                  className={`storm-node ${isPeak ? "peak-node" : ""} ${
                     isStart ? "start-node" : ""
                  } ${isEnd ? "end-node" : ""}`}
                  eventHandlers={{
                     click: () => onSelect?.(storm),
                     mouseover: e => {
                        e.target.setStyle({
                           fillOpacity: 1,
                           radius: radius + 2,
                           weight: borderWidth + 1,
                        });
                     },
                     mouseout: e => {
                        e.target.setStyle({
                           fillOpacity: 0.9,
                           radius: radius,
                           weight: borderWidth,
                        });
                     },
                  }}
               >
                  <Popup className="storm-popup" maxWidth={350}>
                     <div className="p-4 min-w-[320px]">
                        {/* Enhanced Header */}
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-100">
                           <div className="relative">
                              <div
                                 className="w-10 h-10 rounded-full border-3 border-white shadow-lg"
                                 style={{ backgroundColor: getCategoryColor(point.category) }}
                              />
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full text-xs flex items-center justify-content font-bold shadow-md border border-gray-200">
                                 {point.category}
                              </div>
                           </div>
                           <div className="flex-1">
                              <h3 className="font-bold text-xl text-gray-900">{storm.name}</h3>
                              <p className="text-sm text-gray-600 font-medium">{storm.season}</p>
                           </div>
                           {isPeak && (
                              <div className="flex flex-col items-center" title="Peak Intensity">
                                 <Target className="w-6 h-6 text-yellow-500" />
                                 <span className="text-xs text-yellow-600 font-medium">Peak</span>
                              </div>
                           )}
                        </div>

                        {/* Enhanced Point Details */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                           <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <div>
                                 <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                                    Date
                                 </div>
                                 <div className="text-sm font-semibold text-gray-900">
                                    {formatDate(point.timestamp)}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                              <Activity className="w-5 h-5 text-red-600" />
                              <div>
                                 <div className="text-xs text-red-600 font-medium uppercase tracking-wide">
                                    Category
                                 </div>
                                 <div
                                    className="text-sm font-semibold"
                                    style={{ color: getCategoryColor(point.category) }}
                                 >
                                    {getCategoryName(point.category)}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                              <Wind className="w-5 h-5 text-indigo-600" />
                              <div>
                                 <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                                    Wind Speed
                                 </div>
                                 <div className="text-sm font-semibold text-gray-900">
                                    {formatWindSpeed(point.windSpeed)}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                              <Gauge className="w-5 h-5 text-purple-600" />
                              <div>
                                 <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                                    Pressure
                                 </div>
                                 <div className="text-sm font-semibold text-gray-900">
                                    {point.pressure} mb
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Enhanced Position */}
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-4">
                           <Navigation className="w-5 h-5 text-green-600" />
                           <div>
                              <div className="text-xs text-green-600 font-medium uppercase tracking-wide">
                                 Position
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                 {point.lat.toFixed(2)}°N, {Math.abs(point.lng).toFixed(2)}°W
                              </div>
                           </div>
                        </div>

                        {/* Enhanced status indicators */}
                        {(isStart || isEnd || isPeak) && (
                           <div className="flex flex-wrap gap-2">
                              {isStart && (
                                 <span className="px-3 py-2 text-xs bg-green-500 text-white rounded-full font-semibold shadow-sm">
                                    🌀 Formation
                                 </span>
                              )}
                              {isEnd && (
                                 <span className="px-3 py-2 text-xs bg-red-500 text-white rounded-full font-semibold shadow-sm">
                                    🌊 Dissipation
                                 </span>
                              )}
                              {isPeak && (
                                 <span className="px-3 py-2 text-xs bg-yellow-500 text-white rounded-full font-semibold shadow-sm">
                                    ⚡ Peak Intensity
                                 </span>
                              )}
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
      <div className={`relative ${className}`}>
         <MapContainer
            center={[25, -80]}
            zoom={4}
            style={{ height: "100%", width: "100%" }}
            className="rounded-lg storm-map"
            worldCopyJump={false}
            maxBounds={[
               [-85, -180],
               [85, 180],
            ]}
            maxBoundsViscosity={1.0}
         >
            {/* Google Maps style tile layer */}
            <TileLayer
               attribution="© OpenStreetMap contributors"
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds storms={storms} />

            {/* Render storms */}
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

         {/* Enhanced CSS for beautiful styling and animations */}
         <style jsx global>{`
            .storm-map {
               border: 1px solid #e5e7eb;
               box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }

            .storm-path-main {
               transition: opacity 0.3s ease, stroke-width 0.3s ease;
               filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            }

            .storm-path-segment {
               transition: opacity 0.3s ease, stroke-width 0.3s ease;
               filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1));
            }

            .storm-node {
               transition: all 0.3s ease;
               filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
            }

            .storm-node.peak-node {
               animation: pulse-peak 2s infinite;
            }

            .storm-node.start-node {
               animation: pulse-start 3s infinite;
            }

            .storm-node.end-node {
               animation: pulse-end 3s infinite;
            }

            .storm-direction-arrow {
               pointer-events: none;
               transition: all 0.3s ease;
            }

            .storm-arrow-animated {
               animation: move-along-path 2s linear infinite;
            }

            .storm-direction-arrow.selected-arrow {
               opacity: 1;
               animation: move-along-path 1.5s linear infinite;
            }

            @keyframes move-along-path {
               0% {
                  opacity: 0.6;
                  transform: scale(0.8);
               }
               50% {
                  opacity: 1;
                  transform: scale(1.1);
               }
               100% {
                  opacity: 0.6;
                  transform: scale(0.8);
               }
            }

            @keyframes pulse-peak {
               0%,
               100% {
                  transform: scale(1);
               }
               50% {
                  transform: scale(1.15);
               }
            }

            @keyframes pulse-start {
               0%,
               100% {
                  transform: scale(1);
               }
               33% {
                  transform: scale(1.1);
               }
               66% {
                  transform: scale(1.05);
               }
            }

            @keyframes pulse-end {
               0%,
               100% {
                  transform: scale(1);
               }
               25% {
                  transform: scale(1.08);
               }
               75% {
                  transform: scale(1.03);
               }
            }

            .storm-popup .leaflet-popup-content-wrapper {
               border-radius: 12px;
               box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
               border: 1px solid #e5e7eb;
               background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            }

            .storm-popup .leaflet-popup-tip {
               background: #ffffff;
               border: 1px solid #e5e7eb;
            }

            .storm-popup .leaflet-popup-content {
               margin: 0;
               padding: 0;
            }

            .storm-arrow-container svg {
               transition: all 0.2s ease;
            }

            .storm-direction-arrow:hover .storm-arrow-container svg {
               transform: scale(1.2);
            }
         `}</style>
      </div>
   );
}
