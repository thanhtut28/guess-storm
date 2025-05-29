"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Storm } from "@/types/storm";
import { stormApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

// Dynamically import StormDetails to avoid SSR issues
const StormDetails = dynamic(() => import("@/components/StormDetails"), { ssr: false });

export default function StormPage() {
   const params = useParams();
   const router = useRouter();
   const [storm, setStorm] = useState<Storm | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const stormId = params.id as string;

   useEffect(() => {
      const fetchStorm = async () => {
         if (!stormId) return;

         setLoading(true);
         setError(null);
         try {
            const response = await stormApi.getStorm(stormId);
            setStorm(response.data);
         } catch (err) {
            console.error("Error fetching storm:", err);
            setError("Failed to load storm data. Please try again.");
         } finally {
            setLoading(false);
         }
      };

      fetchStorm();
   }, [stormId]);

   const handleRetry = () => {
      if (stormId) {
         const fetchStorm = async () => {
            setLoading(true);
            setError(null);
            try {
               const response = await stormApi.getStorm(stormId);
               setStorm(response.data);
            } catch (err) {
               console.error("Error fetching storm:", err);
               setError("Failed to load storm data. Please try again.");
            } finally {
               setLoading(false);
            }
         };
         fetchStorm();
      }
   };

   const handleGoBack = () => {
      router.back();
   };

   if (error) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Error Loading Storm</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-4">
               <Button onClick={handleGoBack} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
               </Button>
               <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <RotateCcw className="mr-2 h-4 w-4" /> Retry
               </Button>
            </div>
         </div>
      );
   }

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Storm Data</h2>
            <p className="text-gray-600">Please wait while we fetch the storm information...</p>
         </div>
      );
   }

   if (!storm) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Storm Not Found</h2>
            <p className="text-gray-600 mb-6">The requested storm could not be found.</p>
            <Button onClick={handleGoBack} variant="outline">
               <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gray-50">
         {/* Header */}
         <header className="bg-white shadow-sm p-4 border-b border-gray-200">
            <div className="container mx-auto flex items-center gap-4">
               <Button onClick={handleGoBack} variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
               </Button>
               <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-800">
                     {storm.name} ({storm.season})
                  </h1>
                  <p className="text-gray-600">Individual Storm Analysis</p>
               </div>
            </div>
         </header>

         {/* Main Content */}
         <main className="container mx-auto p-4">
            <StormDetails storm={storm} className="w-full" />
         </main>
      </div>
   );
}
