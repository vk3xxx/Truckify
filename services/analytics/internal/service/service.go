package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"truckify/services/analytics/internal/model"
)

type Service struct {
	authURL    string
	jobURL     string
	driverURL  string
	paymentURL string
	fleetURL   string
	ratingURL  string
}

func New(authURL, jobURL, driverURL, paymentURL, fleetURL, ratingURL string) *Service {
	return &Service{
		authURL:    authURL,
		jobURL:     jobURL,
		driverURL:  driverURL,
		paymentURL: paymentURL,
		fleetURL:   fleetURL,
		ratingURL:  ratingURL,
	}
}

type apiResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
}

func (s *Service) fetchJSON(url string, result interface{}) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var apiResp apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return err
	}
	if apiResp.Data != nil {
		return json.Unmarshal(apiResp.Data, result)
	}
	return nil
}

func (s *Service) GetDashboardStats() (*model.DashboardStats, error) {
	stats := &model.DashboardStats{}

	// Get job stats
	var jobs []struct {
		Status string  `json:"status"`
		Price  float64 `json:"price"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)
	
	stats.TotalJobs = len(jobs)
	var totalRevenue float64
	for _, j := range jobs {
		switch j.Status {
		case "in_transit", "assigned":
			stats.ActiveJobs++
		case "delivered":
			stats.CompletedJobs++
			totalRevenue += j.Price
		}
	}
	stats.TotalRevenue = totalRevenue
	if stats.CompletedJobs > 0 {
		stats.AvgJobValue = totalRevenue / float64(stats.CompletedJobs)
	}

	// Get user counts from auth service
	var users []struct {
		UserType    string `json:"user_type"`
		IsAvailable bool   `json:"is_available"`
	}
	s.fetchJSON(s.authURL+"/admin/users", &users)
	
	for _, u := range users {
		switch u.UserType {
		case "driver":
			stats.TotalDrivers++
		case "shipper":
			stats.TotalShippers++
		}
	}

	return stats, nil
}

func (s *Service) GetJobsByStatus() ([]model.JobsByStatus, error) {
	var jobs []struct {
		Status string `json:"status"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	counts := make(map[string]int)
	for _, j := range jobs {
		counts[j.Status]++
	}

	var result []model.JobsByStatus
	for status, count := range counts {
		result = append(result, model.JobsByStatus{Status: status, Count: count})
	}
	return result, nil
}

func (s *Service) GetJobsByDay(days int) ([]model.JobsByDay, error) {
	var jobs []struct {
		CreatedAt time.Time `json:"created_at"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	counts := make(map[string]int)
	cutoff := time.Now().AddDate(0, 0, -days)
	
	for _, j := range jobs {
		if j.CreatedAt.After(cutoff) {
			date := j.CreatedAt.Format("2006-01-02")
			counts[date]++
		}
	}

	var result []model.JobsByDay
	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		result = append(result, model.JobsByDay{Date: date, Count: counts[date]})
	}
	return result, nil
}

func (s *Service) GetRevenueByDay(days int) ([]model.RevenueByDay, error) {
	var jobs []struct {
		Status    string    `json:"status"`
		Price     float64   `json:"price"`
		CreatedAt time.Time `json:"created_at"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	revenue := make(map[string]float64)
	cutoff := time.Now().AddDate(0, 0, -days)
	
	for _, j := range jobs {
		if j.Status == "delivered" && j.CreatedAt.After(cutoff) {
			date := j.CreatedAt.Format("2006-01-02")
			revenue[date] += j.Price
		}
	}

	var result []model.RevenueByDay
	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		result = append(result, model.RevenueByDay{Date: date, Revenue: revenue[date]})
	}
	return result, nil
}

func (s *Service) GetTopRoutes(limit int) ([]model.TopRoute, error) {
	var jobs []struct {
		Pickup   struct{ City string `json:"city"` } `json:"pickup"`
		Delivery struct{ City string `json:"city"` } `json:"delivery"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	routes := make(map[string]int)
	for _, j := range jobs {
		key := fmt.Sprintf("%s→%s", j.Pickup.City, j.Delivery.City)
		routes[key]++
	}

	var result []model.TopRoute
	for route, count := range routes {
		var origin, dest string
		fmt.Sscanf(route, "%s→%s", &origin, &dest)
		result = append(result, model.TopRoute{Origin: origin, Destination: dest, Count: count})
	}

	// Sort by count (simple bubble sort for small data)
	for i := 0; i < len(result)-1; i++ {
		for j := i + 1; j < len(result); j++ {
			if result[j].Count > result[i].Count {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	if len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}
