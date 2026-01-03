package service

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"truckify/services/backhaul/internal/model"
	"truckify/services/backhaul/internal/repository"
)

type Service struct{ repo *repository.Repository }

func New(repo *repository.Repository) *Service { return &Service{repo: repo} }

func (s *Service) FindBackhauls(ctx context.Context, req model.FindBackhaulRequest) ([]model.BackhaulMatch, error) {
	maxDetour := req.MaxDetourKm
	if maxDetour == 0 {
		maxDetour = 50
	}

	opps, err := s.repo.FindAvailable(ctx, req.VehicleType, time.Now())
	if err != nil {
		return nil, err
	}

	directDist := haversine(req.CurrentLat, req.CurrentLng, req.DestLat, req.DestLng)
	var matches []model.BackhaulMatch

	for _, opp := range opps {
		// Distance: current -> pickup -> delivery -> final dest
		toPickup := haversine(req.CurrentLat, req.CurrentLng, opp.OriginLat, opp.OriginLng)
		pickupToDel := haversine(opp.OriginLat, opp.OriginLng, opp.DestLat, opp.DestLng)
		delToFinal := haversine(opp.DestLat, opp.DestLng, req.DestLat, req.DestLng)
		totalWithBackhaul := toPickup + pickupToDel + delToFinal
		detour := totalWithBackhaul - directDist

		if detour <= maxDetour {
			// Score: higher is better (less detour, more savings from empty miles)
			emptyMilesSaved := directDist - delToFinal
			score := (emptyMilesSaved / directDist * 50) + ((maxDetour - detour) / maxDetour * 50)
			matches = append(matches, model.BackhaulMatch{
				Opportunity: opp,
				DetourKm:    math.Round(detour*10) / 10,
				SavingsKm:   math.Round(emptyMilesSaved*10) / 10,
				Score:       math.Round(score*10) / 10,
			})
		}
	}

	sort.Slice(matches, func(i, j int) bool { return matches[i].Score > matches[j].Score })
	if len(matches) > 10 {
		matches = matches[:10]
	}
	return matches, nil
}

func (s *Service) CreateOpportunity(ctx context.Context, opp *model.BackhaulOpportunity) error {
	opp.ID = uuid.New()
	opp.Status = "available"
	opp.CreatedAt = time.Now()
	return s.repo.CreateOpportunity(ctx, opp)
}

func (s *Service) ClaimOpportunity(ctx context.Context, id uuid.UUID) error {
	return s.repo.UpdateStatus(ctx, id, "claimed")
}

func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
