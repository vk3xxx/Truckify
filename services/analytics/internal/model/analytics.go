package model

import "time"

type DashboardStats struct {
	TotalJobs       int     `json:"total_jobs"`
	ActiveJobs      int     `json:"active_jobs"`
	CompletedJobs   int     `json:"completed_jobs"`
	TotalDrivers    int     `json:"total_drivers"`
	ActiveDrivers   int     `json:"active_drivers"`
	TotalShippers   int     `json:"total_shippers"`
	TotalRevenue    float64 `json:"total_revenue"`
	AvgJobValue     float64 `json:"avg_job_value"`
	TotalFleets     int     `json:"total_fleets"`
	TotalVehicles   int     `json:"total_vehicles"`
}

type JobsByStatus struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type JobsByDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type RevenueByDay struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
}

type TopRoute struct {
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	Count       int    `json:"count"`
}

type DriverPerformance struct {
	DriverID    string  `json:"driver_id"`
	TotalJobs   int     `json:"total_jobs"`
	AvgRating   float64 `json:"avg_rating"`
	TotalEarned float64 `json:"total_earned"`
}

type TimeRange struct {
	Start time.Time
	End   time.Time
}

// DemandForecast represents predicted demand for a route/time
type DemandForecast struct {
	Route           string    `json:"route"`
	Origin          string    `json:"origin"`
	Destination     string    `json:"destination"`
	Date            string    `json:"date"`
	PredictedJobs   int       `json:"predicted_jobs"`
	Confidence      float64   `json:"confidence"`
	Trend           string    `json:"trend"` // "up", "down", "stable"
	SeasonalFactor  float64   `json:"seasonal_factor"`
	HistoricalAvg   float64   `json:"historical_avg"`
	GeneratedAt     time.Time `json:"generated_at"`
}

// DemandHeatmap represents demand intensity by region
type DemandHeatmap struct {
	Region     string  `json:"region"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Intensity  float64 `json:"intensity"` // 0-1 scale
	JobCount   int     `json:"job_count"`
	AvgPrice   float64 `json:"avg_price"`
}

// PricingRecommendation represents dynamic pricing suggestion
type PricingRecommendation struct {
	Route              string    `json:"route"`
	Origin             string    `json:"origin"`
	Destination        string    `json:"destination"`
	BasePrice          float64   `json:"base_price"`
	RecommendedPrice   float64   `json:"recommended_price"`
	MinPrice           float64   `json:"min_price"`
	MaxPrice           float64   `json:"max_price"`
	PriceMultiplier    float64   `json:"price_multiplier"`
	DemandLevel        string    `json:"demand_level"` // "low", "medium", "high", "surge"
	SupplyLevel        string    `json:"supply_level"` // "low", "medium", "high"
	Factors            []PricingFactor `json:"factors"`
	ValidUntil         time.Time `json:"valid_until"`
}

// PricingFactor explains a component of the price
type PricingFactor struct {
	Name        string  `json:"name"`
	Impact      float64 `json:"impact"` // percentage impact on price
	Description string  `json:"description"`
}

// MarketConditions represents current market state
type MarketConditions struct {
	Region            string    `json:"region"`
	AvailableDrivers  int       `json:"available_drivers"`
	PendingJobs       int       `json:"pending_jobs"`
	SupplyDemandRatio float64   `json:"supply_demand_ratio"`
	AvgWaitTime       float64   `json:"avg_wait_time_minutes"`
	SurgeActive       bool      `json:"surge_active"`
	SurgeMultiplier   float64   `json:"surge_multiplier"`
	UpdatedAt         time.Time `json:"updated_at"`
}
