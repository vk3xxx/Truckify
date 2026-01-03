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
