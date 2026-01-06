package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"

	"github.com/google/uuid"
	"truckify/services/matching/internal/model"
	"truckify/services/matching/internal/repository"
)

type Service struct {
	repo          *repository.Repository
	driverSvcURL  string
	jobSvcURL     string
}

func New(repo *repository.Repository, driverSvcURL, jobSvcURL string) *Service {
	return &Service{repo: repo, driverSvcURL: driverSvcURL, jobSvcURL: jobSvcURL}
}

// FindMatches finds available drivers for a job
func (s *Service) FindMatches(req *model.MatchRequest) (*model.MatchResponse, error) {
	if req.MaxDistance <= 0 {
		req.MaxDistance = 100 // default 100km
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}

	// Get available drivers from driver service
	drivers, err := s.getAvailableDrivers(req.VehicleType)
	if err != nil {
		return nil, fmt.Errorf("failed to get drivers: %w", err)
	}

	// Calculate scores and filter by distance
	var candidates []model.DriverCandidate
	for _, d := range drivers {
		if d.Lat == 0 && d.Lng == 0 {
			continue // skip drivers without location
		}

		distance := haversine(req.PickupLat, req.PickupLng, d.Lat, d.Lng)
		if distance > req.MaxDistance {
			continue
		}

		score := calculateScore(d.Rating, d.TotalTrips, distance, req.MaxDistance)
		candidates = append(candidates, model.DriverCandidate{
			DriverID:    d.DriverID,
			UserID:      d.UserID,
			Rating:      d.Rating,
			TotalTrips:  d.TotalTrips,
			VehicleType: d.VehicleType,
			Lat:         d.Lat,
			Lng:         d.Lng,
			Distance:    math.Round(distance*10) / 10,
			Score:       math.Round(score*100) / 100,
		})
	}

	// Sort by score descending
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Score > candidates[j].Score
	})

	// Limit results
	if len(candidates) > req.Limit {
		candidates = candidates[:req.Limit]
	}

	// Create match records
	for _, c := range candidates {
		s.repo.CreateMatch(req.JobID, c.DriverID, c.Score, c.Distance)
	}

	return &model.MatchResponse{
		JobID:      req.JobID,
		Candidates: candidates,
	}, nil
}

func (s *Service) GetMatchesForJob(jobID uuid.UUID) ([]*model.Match, error) {
	return s.repo.GetByJobID(jobID)
}

func (s *Service) GetPendingMatches(driverID uuid.UUID) ([]*model.Match, error) {
	return s.repo.GetPendingForDriver(driverID)
}

func (s *Service) AcceptMatch(matchID uuid.UUID) error {
	match, err := s.repo.GetByID(matchID)
	if err != nil {
		return err
	}

	// Update match status
	if err := s.repo.UpdateStatus(matchID, "accepted"); err != nil {
		return err
	}

	// Assign driver to job via job service
	return s.assignDriverToJob(match.JobID, match.DriverID)
}

func (s *Service) RejectMatch(matchID uuid.UUID) error {
	return s.repo.UpdateStatus(matchID, "rejected")
}

func (s *Service) ExpireMatches() (int64, error) {
	return s.repo.ExpireOldMatches()
}

// Helper: get available drivers from driver service
func (s *Service) getAvailableDrivers(vehicleType string) ([]driverInfo, error) {
	url := fmt.Sprintf("%s/drivers/available?type=%s", s.driverSvcURL, vehicleType)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Data []driverInfo `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

type driverInfo struct {
	DriverID    uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Rating      float64   `json:"rating"`
	TotalTrips  int       `json:"total_trips"`
	VehicleType string    `json:"vehicle_type"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	Location    *struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"current_location"`
}

func (d *driverInfo) UnmarshalJSON(data []byte) error {
	type Alias driverInfo
	aux := &struct{ *Alias }{Alias: (*Alias)(d)}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	if d.Location != nil {
		d.Lat = d.Location.Lat
		d.Lng = d.Location.Lng
	}
	return nil
}

// Helper: assign driver to job
func (s *Service) assignDriverToJob(jobID, driverID uuid.UUID) error {
	url := fmt.Sprintf("%s/jobs/%s/assign", s.jobSvcURL, jobID)
	body := fmt.Sprintf(`{"driver_id":"%s"}`, driverID)

	client := &http.Client{}
	resp, err := client.Post(url, "application/json", bytes.NewBufferString(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("failed to assign driver: status %d", resp.StatusCode)
	}
	return nil
}

// Haversine formula for distance between two coordinates
func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371 // Earth radius in km
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// Calculate match score (0-100)
func calculateScore(rating float64, trips int, distance, maxDistance float64) float64 {
	// Rating weight: 40% (0-5 scale -> 0-40)
	ratingScore := (rating / 5) * 40

	// Experience weight: 20% (capped at 100 trips)
	expScore := math.Min(float64(trips)/100, 1) * 20

	// Proximity weight: 40% (closer = higher)
	proximityScore := (1 - distance/maxDistance) * 40

	return ratingScore + expScore + proximityScore
}
