# Storm Path Dashboard

A modern, interactive hurricane and storm tracking dashboard built with Next.js, React, and Leaflet. This application provides comprehensive storm path visualization, individual storm analysis, and seasonal hurricane data analysis.

![Storm Dashboard Preview](https://via.placeholder.com/800x400/1e40af/ffffff?text=Storm+Path+Dashboard)

## Features

### 🌪️ Interactive Storm Visualization

-  **Real-time storm path mapping** using Leaflet and OpenStreetMap
-  **Color-coded storm categories** (Tropical Depression to Category 5)
-  **Interactive storm points** with detailed popup information
-  **Dynamic map bounds** that automatically fit to displayed storms

### 🔍 Individual Storm Analysis

-  **Detailed storm information** including wind speed, pressure, and category
-  **Storm path timeline** with chronological data points
-  **Peak intensity analysis** showing maximum wind speed and minimum pressure
-  **Search and filter functionality** for easy storm discovery

### 📊 Season Analysis

-  **Hurricane season statistics** including total storms and major hurricanes
-  **ACE (Accumulated Cyclone Energy) Index** calculation
-  **Category breakdown** with visual progress bars
-  **Season comparison** capabilities

### 🎨 Modern UI/UX

-  **Responsive design** that works on desktop and mobile
-  **Clean, modern interface** with intuitive navigation
-  **Smooth animations** and transitions
-  **Accessible components** using Radix UI primitives

## Technology Stack

-  **Framework**: Next.js 15 with App Router
-  **Language**: TypeScript
-  **Database**: PostgreSQL with Prisma ORM
-  **Backend**: Next.js API Routes
-  **Styling**: Tailwind CSS
-  **Mapping**: React Leaflet + Leaflet
-  **UI Components**: Radix UI primitives
-  **Icons**: Lucide React
-  **Data Format**: GeoJSON for storm paths

## Getting Started

### Prerequisites

-  Node.js 18+
-  npm or yarn
-  PostgreSQL 12+

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd guess-storm
```

2. Install dependencies:

```bash
npm install
```

3. Set up PostgreSQL database:

   -  Install PostgreSQL on your system
   -  Create a database and user
   -  Update the `.env` file with your database credentials
   -  See `scripts/setup-db.md` for detailed instructions

4. Set up the database schema:

```bash
npm run db:generate
npm run db:push
```

5. Import the storm data (1,563 storms):

```bash
npm run import:data
```

6. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── not-found.tsx      # 404 page
├── components/            # React components
│   ├── ui/                # Reusable UI components
│   │   └── select.tsx     # Custom select component
│   ├── StormMap.tsx       # Interactive map component
│   ├── StormDetails.tsx   # Storm information panel
│   ├── SeasonAnalysis.tsx # Season statistics component
│   └── StormDashboard.tsx # Main dashboard component
├── data/                  # Sample data
│   └── sampleStorms.ts    # Hurricane data (Michael, Irma, Harvey, Maria)
├── lib/                   # Utility functions
│   └── utils.ts           # Helper functions and styling utilities
└── types/                 # TypeScript type definitions
    └── storm.ts           # Storm and season interfaces
```

## API Endpoints

The application provides RESTful API endpoints for accessing storm data:

### Storms

-  `GET /api/storms` - Get all storms with optional filters (year, season, category, name, limit, offset)
-  `GET /api/storms/[id]` - Get a specific storm by ID
-  `POST /api/storms` - Import multiple storms
-  `PUT /api/storms/[id]` - Update a storm
-  `DELETE /api/storms/[id]` - Delete a storm

### Seasons

-  `GET /api/seasons` - Get all seasons with optional filters (year, basin)
-  `POST /api/seasons` - Create a new season

### Example API Usage

```bash
# Get all Category 5 storms
curl "http://localhost:3000/api/storms?category=5"

# Get storms from 2017
curl "http://localhost:3000/api/storms?year=2017"

# Search for storms by name
curl "http://localhost:3000/api/storms?name=maria"
```

## Data Format

The application uses GeoJSON format for storm paths and includes the following data structure:

```typescript
interface Storm {
   id: string;
   name: string;
   year: number;
   season: string;
   maxWindSpeed: number;
   maxCategory: number;
   startDate: string;
   endDate: string;
   path: StormPoint[];
   geojson: GeoJSON.Feature<GeoJSON.LineString>;
}

interface StormPoint {
   lat: number;
   lng: number;
   timestamp: string;
   windSpeed: number;
   pressure: number;
   category: number;
}
```

## Sample Data

The dashboard includes sample data for:

-  **Hurricane Michael (2018)** - Category 5 hurricane that hit the Florida Panhandle
-  **Hurricane Irma (2017)** - Category 5 hurricane that affected the Caribbean and Florida
-  **Hurricane Harvey (2017)** - Category 4 hurricane that caused devastating flooding in Texas
-  **Hurricane Maria (2017)** - Category 5 hurricane that devastated Puerto Rico

## Features in Detail

### Dashboard Views

1. **Overview Mode**: Display all storms with filtering capabilities
2. **Individual Mode**: Focus on a single storm with detailed analysis
3. **Season Mode**: Analyze entire hurricane seasons with statistics

### Interactive Elements

-  **Storm Path Lines**: Click to select storms
-  **Storm Points**: Hover for quick info, click for detailed popup
-  **Category Legend**: Visual reference for storm intensity
-  **Search Bar**: Find storms by name or season
-  **Category Filter**: Filter storms by maximum category

### Responsive Design

The dashboard is fully responsive and optimized for:

-  Desktop computers (1200px+)
-  Tablets (768px - 1199px)
-  Mobile phones (320px - 767px)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

-  Hurricane data based on NOAA Historical Hurricane Database (HURDAT2)
-  Map tiles provided by OpenStreetMap contributors
-  Icons by Lucide React
-  UI components inspired by shadcn/ui
