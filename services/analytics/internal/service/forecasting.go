package service

import (
	"math"
	"sort"
	"time"

	"truckify/services/analytics/internal/model"
)

// ForecastDemand predicts job demand for routes over the next N days
func (s *Service) ForecastDemand(days int) ([]model.DemandForecast, error) {
	// Get historical job data
	var jobs []struct {
		Pickup    struct{ City string `json:"city"` } `json:"pickup"`
		Delivery  struct{ City string `json:"city"` } `json:"delivery"`
		CreatedAt time.Time `json:"created_at"`
		Status    string    `json:"status"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	// Aggregate historical data by route and day of week
	routeHistory := make(map[string]map[int][]int) // route -> dayOfWeek -> counts per week
	routeTotals := make(map[string]int)

	for _, j := range jobs {
		route := j.Pickup.City + "→" + j.Delivery.City
		dow := int(j.CreatedAt.Weekday())
		
		if routeHistory[route] == nil {
			routeHistory[route] = make(map[int][]int)
		}
		routeHistory[route][dow] = append(routeHistory[route][dow], 1)
		routeTotals[route]++
	}

	// Generate forecasts
	var forecasts []model.DemandForecast
	now := time.Now()

	// Get top routes by volume
	type routeCount struct {
		route string
		count int
	}
	var sortedRoutes []routeCount
	for route, count := range routeTotals {
		sortedRoutes = append(sortedRoutes, routeCount{route, count})
	}
	sort.Slice(sortedRoutes, func(i, j int) bool {
		return sortedRoutes[i].count > sortedRoutes[j].count
	})

	// Forecast for top 10 routes
	maxRoutes := 10
	if len(sortedRoutes) < maxRoutes {
		maxRoutes = len(sortedRoutes)
	}

	for _, rc := range sortedRoutes[:maxRoutes] {
		route := rc.route
		history := routeHistory[route]
		
		// Calculate historical average per day of week
		dowAvg := make(map[int]float64)
		for dow, counts := range history {
			sum := 0
			for _, c := range counts {
				sum += c
			}
			if len(counts) > 0 {
				dowAvg[dow] = float64(sum) / float64(len(counts))
			}
		}

		// Overall average
		totalAvg := float64(rc.count) / 30.0 // Assume 30 days of data

		// Generate forecast for each day
		for d := 1; d <= days; d++ {
			forecastDate := now.AddDate(0, 0, d)
			dow := int(forecastDate.Weekday())

			// Base prediction from day-of-week pattern
			predicted := dowAvg[dow]
			if predicted == 0 {
				predicted = totalAvg
			}

			// Apply seasonal factor (simplified)
			seasonalFactor := getSeasonalFactor(forecastDate)
			predicted *= seasonalFactor

			// Determine trend
			trend := "stable"
			if len(history[dow]) >= 2 {
				recent := history[dow][len(history[dow])-1]
				older := history[dow][0]
				if recent > older {
					trend = "up"
				} else if recent < older {
					trend = "down"
				}
			}

			// Confidence decreases with forecast distance
			confidence := math.Max(0.5, 1.0-float64(d)*0.05)

			// Parse origin/destination
			origin, dest := parseRoute(route)

			forecasts = append(forecasts, model.DemandForecast{
				Route:          route,
				Origin:         origin,
				Destination:    dest,
				Date:           forecastDate.Format("2006-01-02"),
				PredictedJobs:  int(math.Round(predicted)),
				Confidence:     confidence,
				Trend:          trend,
				SeasonalFactor: seasonalFactor,
				HistoricalAvg:  totalAvg,
				GeneratedAt:    now,
			})
		}
	}

	return forecasts, nil
}

// GetDemandHeatmap returns demand intensity by region
func (s *Service) GetDemandHeatmap() ([]model.DemandHeatmap, error) {
	var jobs []struct {
		Pickup struct {
			City      string  `json:"city"`
			State     string  `json:"state"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"pickup"`
		Price float64 `json:"price"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	// Aggregate by city
	cityData := make(map[string]*model.DemandHeatmap)
	maxCount := 0

	for _, j := range jobs {
		city := j.Pickup.City
		if city == "" {
			continue
		}

		if cityData[city] == nil {
			cityData[city] = &model.DemandHeatmap{
				Region:    city,
				Latitude:  j.Pickup.Latitude,
				Longitude: j.Pickup.Longitude,
			}
		}
		cityData[city].JobCount++
		cityData[city].AvgPrice += j.Price

		if cityData[city].JobCount > maxCount {
			maxCount = cityData[city].JobCount
		}
	}

	// Calculate intensity and average price
	var result []model.DemandHeatmap
	for _, data := range cityData {
		if maxCount > 0 {
			data.Intensity = float64(data.JobCount) / float64(maxCount)
		}
		if data.JobCount > 0 {
			data.AvgPrice /= float64(data.JobCount)
		}
		result = append(result, *data)
	}

	// Sort by intensity
	sort.Slice(result, func(i, j int) bool {
		return result[i].Intensity > result[j].Intensity
	})

	return result, nil
}

// GetPricingRecommendation calculates dynamic pricing for a route
func (s *Service) GetPricingRecommendation(origin, destination string, basePrice float64) (*model.PricingRecommendation, error) {
	route := origin + "→" + destination

	// Get market conditions
	conditions, _ := s.GetMarketConditions(origin)

	// Get historical prices for this route
	var jobs []struct {
		Pickup   struct{ City string `json:"city"` } `json:"pickup"`
		Delivery struct{ City string `json:"city"` } `json:"delivery"`
		Price    float64   `json:"price"`
		Status   string    `json:"status"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	var routePrices []float64
	for _, j := range jobs {
		if j.Pickup.City == origin && j.Delivery.City == destination {
			routePrices = append(routePrices, j.Price)
		}
	}

	// Calculate base metrics
	avgPrice := basePrice
	if len(routePrices) > 0 {
		sum := 0.0
		for _, p := range routePrices {
			sum += p
		}
		avgPrice = sum / float64(len(routePrices))
	}

	// Dynamic pricing factors
	var factors []model.PricingFactor
	multiplier := 1.0

	// 1. Supply/Demand factor
	demandLevel := "medium"
	supplyLevel := "medium"
	if conditions != nil {
		if conditions.SupplyDemandRatio < 0.5 {
			demandLevel = "high"
			multiplier += 0.15
			factors = append(factors, model.PricingFactor{
				Name:        "High Demand",
				Impact:      15,
				Description: "More jobs than available drivers",
			})
		} else if conditions.SupplyDemandRatio > 1.5 {
			demandLevel = "low"
			multiplier -= 0.10
			factors = append(factors, model.PricingFactor{
				Name:        "Low Demand",
				Impact:      -10,
				Description: "Fewer jobs than available drivers",
			})
		}

		if conditions.AvailableDrivers < 5 {
			supplyLevel = "low"
			multiplier += 0.20
			factors = append(factors, model.PricingFactor{
				Name:        "Limited Supply",
				Impact:      20,
				Description: "Few drivers available in area",
			})
		} else if conditions.AvailableDrivers > 20 {
			supplyLevel = "high"
		}

		// Surge pricing
		if conditions.SurgeActive {
			demandLevel = "surge"
			multiplier *= conditions.SurgeMultiplier
			factors = append(factors, model.PricingFactor{
				Name:        "Surge Pricing",
				Impact:      (conditions.SurgeMultiplier - 1) * 100,
				Description: "High demand surge in effect",
			})
		}
	}

	// 2. Time-of-day factor
	hour := time.Now().Hour()
	if hour >= 6 && hour <= 9 || hour >= 16 && hour <= 19 {
		multiplier += 0.05
		factors = append(factors, model.PricingFactor{
			Name:        "Peak Hours",
			Impact:      5,
			Description: "Higher demand during business hours",
		})
	}

	// 3. Day-of-week factor
	dow := time.Now().Weekday()
	if dow == time.Friday {
		multiplier += 0.08
		factors = append(factors, model.PricingFactor{
			Name:        "Friday Premium",
			Impact:      8,
			Description: "Increased demand before weekend",
		})
	} else if dow == time.Sunday {
		multiplier -= 0.05
		factors = append(factors, model.PricingFactor{
			Name:        "Weekend Discount",
			Impact:      -5,
			Description: "Lower demand on Sundays",
		})
	}

	// 4. Seasonal factor
	seasonalFactor := getSeasonalFactor(time.Now())
	if seasonalFactor > 1.05 {
		multiplier += (seasonalFactor - 1)
		factors = append(factors, model.PricingFactor{
			Name:        "Seasonal Demand",
			Impact:      (seasonalFactor - 1) * 100,
			Description: "Higher seasonal demand",
		})
	}

	// Calculate final price
	recommendedPrice := avgPrice * multiplier
	minPrice := avgPrice * 0.8
	maxPrice := avgPrice * 2.0

	// Clamp to min/max
	if recommendedPrice < minPrice {
		recommendedPrice = minPrice
	}
	if recommendedPrice > maxPrice {
		recommendedPrice = maxPrice
	}

	return &model.PricingRecommendation{
		Route:            route,
		Origin:           origin,
		Destination:      destination,
		BasePrice:        avgPrice,
		RecommendedPrice: math.Round(recommendedPrice*100) / 100,
		MinPrice:         math.Round(minPrice*100) / 100,
		MaxPrice:         math.Round(maxPrice*100) / 100,
		PriceMultiplier:  math.Round(multiplier*100) / 100,
		DemandLevel:      demandLevel,
		SupplyLevel:      supplyLevel,
		Factors:          factors,
		ValidUntil:       time.Now().Add(15 * time.Minute),
	}, nil
}

// GetMarketConditions returns current market state for a region
func (s *Service) GetMarketConditions(region string) (*model.MarketConditions, error) {
	// Get available drivers
	var drivers []struct {
		IsAvailable bool   `json:"is_available"`
		City        string `json:"city"`
	}
	s.fetchJSON(s.driverURL+"/drivers", &drivers)

	availableDrivers := 0
	for _, d := range drivers {
		if d.IsAvailable && (region == "" || d.City == region) {
			availableDrivers++
		}
	}

	// Get pending jobs
	var jobs []struct {
		Status string `json:"status"`
		Pickup struct{ City string `json:"city"` } `json:"pickup"`
	}
	s.fetchJSON(s.jobURL+"/jobs/all", &jobs)

	pendingJobs := 0
	for _, j := range jobs {
		if j.Status == "pending" && (region == "" || j.Pickup.City == region) {
			pendingJobs++
		}
	}

	// Calculate supply/demand ratio
	ratio := 1.0
	if pendingJobs > 0 {
		ratio = float64(availableDrivers) / float64(pendingJobs)
	}

	// Determine surge
	surgeActive := ratio < 0.3
	surgeMultiplier := 1.0
	if surgeActive {
		surgeMultiplier = 1.5 + (0.3-ratio)*2 // Up to 2.1x
		if surgeMultiplier > 2.5 {
			surgeMultiplier = 2.5
		}
	}

	return &model.MarketConditions{
		Region:            region,
		AvailableDrivers:  availableDrivers,
		PendingJobs:       pendingJobs,
		SupplyDemandRatio: math.Round(ratio*100) / 100,
		AvgWaitTime:       float64(pendingJobs) * 5, // Simplified: 5 min per pending job
		SurgeActive:       surgeActive,
		SurgeMultiplier:   math.Round(surgeMultiplier*100) / 100,
		UpdatedAt:         time.Now(),
	}, nil
}

// Helper functions

func getSeasonalFactor(date time.Time) float64 {
	month := date.Month()
	// Higher demand in Q4 (holiday shipping) and Q2 (spring)
	switch month {
	case time.November, time.December:
		return 1.25
	case time.October:
		return 1.15
	case time.April, time.May:
		return 1.10
	case time.January, time.February:
		return 0.90
	default:
		return 1.0
	}
}

func parseRoute(route string) (origin, destination string) {
	for i, c := range route {
		if c == '→' {
			return route[:i], route[i+3:]
		}
	}
	return route, ""
}
