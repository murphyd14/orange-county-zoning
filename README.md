# 🏛️ Orange County Zoning Explorer

A comprehensive, interactive web application for exploring Orange County, Florida's zoning and land use data with advanced analytics, filtering, and visualization capabilities.

## ✨ Key Features

### 🗺️ **Interactive Mapping**

- **Vector Tile Rendering**: High-performance MapLibre GL JS with PMTiles
- **Dual Layer Support**: Toggle between Zoning Districts and Future Land Use layers
- **Color-Coded Categories**: 8 distinct zoning categories with intuitive color scheme
- **Collapsible Legend**: Smart legend that auto-collapses on mobile devices
- **Smooth Interactions**: Hover effects, click-to-select, and responsive controls

### 🔍 **Advanced Filtering & Search**

- **Zoning Group Filter**: Filter by Residential, Commercial, Industrial, Planned Development, Agricultural, Mixed Use, Incorporated, or Other
- **Year Range Slider**: Dynamic filtering by BCC Date, Proposed Date, or Maintenance Date (1980-2030)
- **Area Range Filter**: Filter properties by acreage (0-1000+ acres)
- **Real-time Search**: Search across zoning codes, categories, and Planned Development names
- **Layer Toggles**: Independent control of Zoning and Future Land Use visibility

### 📊 **Analytics Dashboard**

- **Real-time Statistics**: Live KPI metrics for visible features
- **Interactive Charts**:
  - Area distribution by zoning group (bar chart)
  - Rezonings over time (line chart)
  - Top zoning codes (doughnut chart)
- **Mobile-Optimized**: Responsive charts with adaptive legend sizing
- **Dynamic Updates**: Charts update automatically as you pan/zoom the map
- **Smart Legend Management**: Limited legend items on mobile for better readability

### 📤 **Data Export**

- **Multiple Formats**: CSV, GeoJSON, and JSON export options
- **Field Selection**: Choose which properties to include in exports
- **Filtered Data**: Export only visible/filtered features
- **Large Dataset Support**: Handles thousands of features efficiently

### 📱 **Mobile-First Design**

- **Responsive Layout**: Optimized for phones, tablets, and desktops
- **Touch-Friendly**: 44px minimum touch targets
- **Adaptive UI**: Sidebar collapses on mobile, full-screen analytics
- **Performance Optimized**: Smooth scrolling and hardware acceleration

## 🛠️ Technical Architecture

### **Frontend Stack**

- **MapLibre GL JS 3.6.2**: Modern, open-source mapping library
- **PMTiles 3.0.6**: Efficient vector tile delivery
- **Chart.js 4.4.0**: Interactive data visualization
- **Vanilla JavaScript**: No framework dependencies for maximum performance

### **Data Processing**

- **Vector Tiles**: Optimized for web delivery with efficient compression
- **GeoJSON Fallback**: Robust fallback for compatibility
- **Real-time Filtering**: Client-side filtering with MapLibre expressions
- **Area Calculations**: Accurate acre calculations using equal-area projection

### **Performance Optimizations**

- **Hardware Acceleration**: GPU-accelerated rendering
- **Efficient Queries**: Optimized feature queries and filtering
- **Lazy Loading**: On-demand data loading and processing
- **Memory Management**: Proper cleanup of chart instances and event listeners

## 📊 Data Coverage

### **Zoning Data**

- **17,745 zoning features** with comprehensive property information
- **8 zoning categories** with color-coded visualization
- **Temporal data** including BCC dates, proposed dates, and maintenance dates
- **Area calculations** in acres for all properties

### **Future Land Use Data**

- **15,979 FLU features** for policy comparison
- **Layer comparison** with zoning districts
- **Integrated filtering** across both datasets

### **Property Information**

- Zoning codes and categories
- Planned Development names
- Previous zoning codes
- Property areas and centroids
- Development dates and timelines

## 🎨 User Interface

### **Design System**

- **Dark Theme**: Professional dark interface with gold accents
- **Color Palette**:
  - Primary: `#6aa6ff` (Blue)
  - Secondary: `#7ad0c9` (Teal)
  - Background: `#0f1222` (Dark Blue)
  - Panel: `#161a2e` (Lighter Dark)
- **Typography**: System fonts for optimal performance
- **Spacing**: Consistent 8px grid system

### **Interactive Elements**

- **Hover States**: Visual feedback on interactive elements
- **Loading States**: Smooth transitions and loading indicators
- **Error Handling**: Graceful error messages and fallbacks
- **Accessibility**: ARIA labels and keyboard navigation support

## 🚀 Deployment

### **Static Hosting Ready**

This application is optimized for deployment on:

- **GitHub Pages**
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**
- **Any static hosting provider**

### **File Structure**

```
deploy/
├── index.html          # Main application
├── app_maplibre.js     # Core application logic
├── styles.css          # Responsive styling
├── data/               # Optimized data files
│   ├── flu_optimized.geojson
│   └── zoning_optimized.geojson
└── README.md           # This file
```

### **Performance Metrics**

- **Total Bundle Size**: ~16.26MB (including data)
- **Initial Load**: Optimized for fast first paint
- **Mobile Performance**: 60fps scrolling and interactions
- **Memory Usage**: Efficient memory management for large datasets

## 🔧 Development

### **Local Development**

1. Clone the repository
2. Navigate to the `deploy` directory
3. Serve with any static file server:

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8000
   ```

### **Customization**

- **Colors**: Modify CSS custom properties in `styles.css`
- **Data**: Replace GeoJSON files in the `data/` directory
- **Styling**: Update CSS classes for custom theming
- **Functionality**: Extend JavaScript in `app_maplibre.js`

## 📈 Analytics Features

### **Real-time KPIs**

- **Visible Features Count**: Live count of filtered features
- **Total Acres**: Sum of visible property areas
- **Top Zoning Group**: Most common category in view
- **Filtered Year Range**: Current year filter settings

### **Chart Types**

1. **Area by Zoning Group**: Bar chart showing acreage distribution
2. **Rezonings Over Time**: Line chart tracking temporal trends
3. **Top Zoning Codes**: Doughnut chart of most common codes

### **Mobile Analytics**

- **Responsive Charts**: Automatically resize for mobile screens
- **Compact Legends**: Limited legend items on small screens
- **Touch-Optimized**: Swipe-friendly chart interactions
- **Performance**: Optimized rendering for mobile devices

## 🔒 Data Sources

### **Official Sources**

- **Orange County GIS**: Public GIS services
- **OCGIS4 MapServer**: Dynamic map services
- **Public Records**: Zoning and land use data

### **Data Processing**

- **Geometry Optimization**: Simplified for web performance
- **Attribute Enhancement**: Computed areas and classifications
- **Quality Assurance**: Validated topology and data integrity
- **Format Optimization**: Optimized for vector tile delivery

## 📱 Mobile Experience

### **Responsive Breakpoints**

- **Desktop**: 1024px+ (full sidebar, large charts)
- **Tablet**: 768px-1023px (collapsible sidebar, medium charts)
- **Mobile**: 480px-767px (minimal sidebar, compact charts)
- **Small Mobile**: <480px (full-screen analytics, minimal UI)

### **Mobile Optimizations**

- **Touch Targets**: 44px minimum for all interactive elements
- **Swipe Gestures**: Natural touch interactions
- **Viewport Management**: Optimized for mobile browsers
- **Performance**: 60fps animations and interactions

## 🎯 Use Cases

### **Planning & Development**

- **Site Analysis**: Evaluate zoning compatibility
- **Market Research**: Analyze development patterns
- **Policy Review**: Compare zoning vs. future land use
- **Public Engagement**: Interactive community presentations

### **Real Estate**

- **Property Research**: Detailed zoning information
- **Market Analysis**: Development potential assessment
- **Investment Analysis**: Zoning change tracking
- **Client Presentations**: Professional data visualization

### **Government & Planning**

- **Policy Development**: Data-driven planning decisions
- **Public Outreach**: Transparent data sharing
- **Development Review**: Streamlined analysis tools
- **Comprehensive Planning**: Long-term land use strategy

---

**Built with ❤️ for Orange County, Florida**

_Data source: Orange County GIS Public Services_
_Last updated: December 2024_
