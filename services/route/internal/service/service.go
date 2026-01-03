package service

import (
	"math"
	"sort"
	"truckify/services/route/internal/model"
)

type Service struct{}

func New() *Service { return &Service{} }

// CalculateRoute calculates distance and duration between points
func (s *Service) CalculateRoute(req model.RouteRequest) *model.RouteResponse {
	totalDist := 0.0
	points := []model.Location{req.Origin}
	points = append(points, req.Waypoints...)
	points = append(points, req.Destination)

	for i := 0; i < len(points)-1; i++ {
		totalDist += haversine(points[i].Lat, points[i].Lng, points[i+1].Lat, points[i+1].Lng)
	}

	// Estimates: 60km/h avg speed, 12L/100km fuel, $0.15/km tolls
	return &model.RouteResponse{
		Origin:       req.Origin,
		Destination:  req.Destination,
		Waypoints:    req.Waypoints,
		DistanceKm:   math.Round(totalDist*10) / 10,
		DurationMins: int(totalDist / 60 * 60),
		FuelEstimate: math.Round(totalDist*0.12*10) / 10,
		TollEstimate: math.Round(totalDist*0.15*100) / 100,
	}
}

// OptimizeRoute finds optimal order for multiple stops (nearest neighbor)
func (s *Service) OptimizeRoute(req model.OptimizeRequest) *model.OptimizeResponse {
	if len(req.Stops) <= 1 {
		route := []model.Location{req.Origin}
		route = append(route, req.Stops...)
		dist := 0.0
		if len(req.Stops) > 0 {
			dist = haversine(req.Origin.Lat, req.Origin.Lng, req.Stops[0].Lat, req.Stops[0].Lng)
		}
		return &model.OptimizeResponse{OptimizedRoute: route, TotalDistanceKm: dist, TotalDurationMins: int(dist / 60 * 60)}
	}

	// Calculate unoptimized distance
	unoptDist := 0.0
	prev := req.Origin
	for _, stop := range req.Stops {
		unoptDist += haversine(prev.Lat, prev.Lng, stop.Lat, stop.Lng)
		prev = stop
	}

	// Nearest neighbor optimization
	remaining := make([]model.Location, len(req.Stops))
	copy(remaining, req.Stops)
	optimized := []model.Location{req.Origin}
	current := req.Origin
	totalDist := 0.0

	for len(remaining) > 0 {
		nearest, idx := findNearest(current, remaining)
		totalDist += haversine(current.Lat, current.Lng, nearest.Lat, nearest.Lng)
		optimized = append(optimized, nearest)
		current = nearest
		remaining = append(remaining[:idx], remaining[idx+1:]...)
	}

	if req.ReturnTo != nil {
		totalDist += haversine(current.Lat, current.Lng, req.ReturnTo.Lat, req.ReturnTo.Lng)
		optimized = append(optimized, *req.ReturnTo)
	}

	return &model.OptimizeResponse{
		OptimizedRoute:    optimized,
		TotalDistanceKm:   math.Round(totalDist*10) / 10,
		TotalDurationMins: int(totalDist / 60 * 60),
		Savings:           math.Round((unoptDist-totalDist)*10) / 10,
	}
}

func findNearest(from model.Location, candidates []model.Location) (model.Location, int) {
	minDist := math.MaxFloat64
	minIdx := 0
	for i, c := range candidates {
		d := haversine(from.Lat, from.Lng, c.Lat, c.Lng)
		if d < minDist {
			minDist = d
			minIdx = i
		}
	}
	return candidates[minIdx], minIdx
}

func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

// Exported for backhaul service
func Haversine(lat1, lng1, lat2, lng2 float64) float64 { return haversine(lat1, lng1, lat2, lng2) }

var _ = sort.Interface(nil) // silence import
