package router

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gorilla/mux"
	"truckify/api-gateway/internal/middleware"
	"truckify/shared/pkg/logger"
	sharedMiddleware "truckify/shared/pkg/middleware"
	"truckify/shared/pkg/response"
)

// Router holds the HTTP router and dependencies
type Router struct {
	mux            *mux.Router
	logger         *logger.Logger
	authMiddleware *middleware.AuthMiddleware
	rateLimiter    *sharedMiddleware.RateLimiter
	allowedOrigins []string
}

// NewRouter creates a new router instance
func NewRouter(
	log *logger.Logger,
	authMiddleware *middleware.AuthMiddleware,
	rateLimiter *sharedMiddleware.RateLimiter,
	allowedOrigins []string,
) *Router {
	return &Router{
		mux:            mux.NewRouter(),
		logger:         log,
		authMiddleware: authMiddleware,
		rateLimiter:    rateLimiter,
		allowedOrigins: allowedOrigins,
	}
}

// Setup configures all routes
func (router *Router) Setup() http.Handler {
	// Apply global middlewares
	router.mux.Use(sharedMiddleware.RequestID)
	router.mux.Use(sharedMiddleware.Recovery(router.logger))
	router.mux.Use(sharedMiddleware.Logger(router.logger))
	router.mux.Use(sharedMiddleware.CORS(router.allowedOrigins))
	router.mux.Use(sharedMiddleware.SecurityHeaders)
	router.mux.Use(router.rateLimiter.Limit)

	// Health check endpoint
	router.mux.HandleFunc("/health", router.healthCheck).Methods(http.MethodGet)
	router.mux.HandleFunc("/metrics", router.metricsHandler).Methods(http.MethodGet)

	// API v1 routes
	api := router.mux.PathPrefix("/api/v1").Subrouter()

	// Public routes (no authentication required)
	router.setupPublicRoutes(api)

	// Protected routes (authentication required)
	router.setupProtectedRoutes(api)

	return router.mux
}

// setupPublicRoutes configures public routes
func (router *Router) setupPublicRoutes(api *mux.Router) {
	// Auth service routes (public)
	authPublic := api.PathPrefix("/auth").Subrouter()
	authPublic.PathPrefix("").Handler(router.createProxy("http://auth-service:8001"))
}

// setupProtectedRoutes configures protected routes
func (router *Router) setupProtectedRoutes(api *mux.Router) {
	// Create a protected subrouter
	protected := api.PathPrefix("").Subrouter()
	protected.Use(router.authMiddleware.Authenticate)

	// User service routes (profile and documents)
	protected.PathPrefix("/profile").Handler(
		http.StripPrefix("/api/v1/profile", router.createProxy("http://user-service:8002/profile")),
	)
	protected.PathPrefix("/documents").Handler(
		http.StripPrefix("/api/v1/documents", router.createProxy("http://user-service:8002/documents")),
	)

	// Shipper service routes
	protected.PathPrefix("/shippers").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://shipper-service:8003")),
	)

	// Driver service routes
	protected.PathPrefix("/drivers").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://driver-service:8004")),
	)

	// Fleet service routes
	protected.PathPrefix("/fleets").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://fleet-service:8005")),
	)

	// Job service routes
	protected.PathPrefix("/jobs").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://job-service:8006")),
	)

	// Matching service routes
	protected.PathPrefix("/matching").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://matching-service:8007")),
	)

	// Bidding service routes
	protected.PathPrefix("/bids").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://bidding-service:8008")),
	)

	// Route service routes
	protected.PathPrefix("/routes").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://route-service:8009")),
	)

	// Backhaul service routes
	protected.PathPrefix("/backhaul").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://backhaul-service:8010")),
	)

	// Tracking service routes
	protected.PathPrefix("/tracking").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://tracking-service:8011")),
	)

	// Payment service routes
	protected.PathPrefix("/payments").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://payment-service:8012")),
	)

	// Rating service routes
	protected.PathPrefix("/ratings").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://rating-service:8013")),
	)

	// Notification service routes
	protected.PathPrefix("/notifications").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://notification-service:8014")),
	)

	// Analytics service routes
	protected.PathPrefix("/analytics").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://analytics-service:8015")),
	)

	// Compliance service routes
	protected.PathPrefix("/compliance").Handler(
		http.StripPrefix("/api/v1", router.createProxy("http://compliance-service:8016")),
	)
}

// createProxy creates a reverse proxy for a service
func (router *Router) createProxy(target string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		router.logger.Error("Failed to parse target URL", "target", target, "error", err)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID, _ := r.Context().Value("request_id").(string)
			response.ServiceUnavailable(w, "Service unavailable", "", requestID)
		})
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// Customize the proxy director to preserve headers
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = targetURL.Host

		// Forward user context as headers
		if userID, ok := req.Context().Value("user_id").(string); ok {
			req.Header.Set("X-User-ID", userID)
		}
		if email, ok := req.Context().Value("email").(string); ok {
			req.Header.Set("X-User-Email", email)
		}
		if userType, ok := req.Context().Value("user_type").(string); ok {
			req.Header.Set("X-User-Type", userType)
		}
		if requestID, ok := req.Context().Value("request_id").(string); ok {
			req.Header.Set("X-Request-ID", requestID)
		}
	}

	// Error handler
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		router.logger.Error("Proxy error", "error", err, "target", target)
		requestID, _ := r.Context().Value("request_id").(string)
		response.ServiceUnavailable(w, "Service unavailable", err.Error(), requestID)
	}

	return proxy
}

// healthCheck handles health check requests
func (router *Router) healthCheck(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	response.Success(w, map[string]interface{}{
		"status":  "healthy",
		"service": "api-gateway",
	}, requestID)
}

// metricsHandler exposes Prometheus metrics
func (router *Router) metricsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement Prometheus metrics
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "# Metrics endpoint - Prometheus integration pending")
}
