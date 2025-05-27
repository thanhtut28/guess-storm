import { stormApi, seasonApi } from "../src/lib/api";

async function testApi() {
   console.log("🧪 Testing Storm Dashboard API...\n");

   try {
      // Test storms endpoint
      console.log("📊 Testing storms endpoint...");
      const stormsResponse = await stormApi.getStorms({ limit: 5 });
      console.log(`✅ Found ${stormsResponse.data.length} storms`);

      if (stormsResponse.data.length > 0) {
         const firstStorm = stormsResponse.data[0];
         console.log(`   First storm: ${firstStorm.name} (${firstStorm.year})`);

         // Test individual storm endpoint
         console.log("\n🔍 Testing individual storm endpoint...");
         const stormResponse = await stormApi.getStorm(firstStorm.id);
         console.log(`✅ Retrieved storm: ${stormResponse.data.name}`);
         console.log(`   Path points: ${stormResponse.data.path.length}`);
      }

      // Test seasons endpoint
      console.log("\n📅 Testing seasons endpoint...");
      const seasonsResponse = await seasonApi.getSeasons();
      console.log(`✅ Found ${seasonsResponse.data.length} seasons`);

      if (seasonsResponse.data.length > 0) {
         const firstSeason = seasonsResponse.data[0];
         console.log(`   Latest season: ${firstSeason.name} (${firstSeason.totalStorms} storms)`);
      }

      // Test filtering
      console.log("\n🔎 Testing storm filtering...");
      const category5Storms = await stormApi.getStorms({ category: 5, limit: 3 });
      console.log(`✅ Found ${category5Storms.data.length} Category 5 storms`);

      console.log("\n🎉 All API tests passed!");
   } catch (error) {
      console.error("❌ API test failed:", error);
      process.exit(1);
   }
}

// Run the test
testApi();
