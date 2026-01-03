package model

type Location struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Address string  `json:"address,omitempty"`
}

type RouteRequest struct {
	Origin      Location   `json:"origin" validate:"required"`
	Destination Location   `json:"destination" validate:"required"`
	Waypoints   []Location `json:"waypoints,omitempty"`
}

type RouteResponse struct {
	Origin       Location   `json:"origin"`
	Destination  Location   `json:"destination"`
	Waypoints    []Location `json:"waypoints,omitempty"`
	DistanceKm   float64    `json:"distance_km"`
	DurationMins int        `json:"duration_mins"`
	FuelEstimate float64    `json:"fuel_estimate_liters"`
	TollEstimate float64    `json:"toll_estimate"`
}

type OptimizeRequest struct {
	Origin    Location   `json:"origin" validate:"required"`
	Stops     []Location `json:"stops" validate:"required,min=1"`
	ReturnTo  *Location  `json:"return_to,omitempty"`
}

type OptimizeResponse struct {
	OptimizedRoute []Location `json:"optimized_route"`
	TotalDistanceKm float64   `json:"total_distance_km"`
	TotalDurationMins int     `json:"total_duration_mins"`
	Savings        float64    `json:"savings_km"`
}
