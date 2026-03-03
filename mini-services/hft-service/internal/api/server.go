package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"hft-service/internal/engine"
	"hft-service/internal/ws"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Server represents the HTTP API server
type Server struct {
	server   *http.Server
	engine   *engine.HFTEngine
	wsManager *ws.WebSocketManager
	port     int
	handlers *Handlers
}

// NewServer creates a new API server
func NewServer(hftEngine *engine.HFTEngine, wsManager *ws.WebSocketManager, port int) *Server {
	handlers := NewHandlers(hftEngine, wsManager)
	
	mux := http.NewServeMux()
	
	// Register routes
	mux.HandleFunc("/health", handlers.Health)
	mux.HandleFunc("/metrics", handlers.Metrics)
	mux.HandleFunc("/start", handlers.Start)
	mux.HandleFunc("/stop", handlers.Stop)
	mux.HandleFunc("/orderbook/", handlers.Orderbook)
	mux.HandleFunc("/signals", handlers.Signals)
	mux.HandleFunc("/subscribe", handlers.Subscribe)
	mux.HandleFunc("/stats", handlers.Stats)
	mux.Handle("/prometheus", promhttp.Handler())
	
	server := &http.Server{
		Addr:         ":" + itoa(port),
		Handler:      corsMiddleware(loggingMiddleware(mux)),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	
	return &Server{
		server:    server,
		engine:    hftEngine,
		wsManager: wsManager,
		port:      port,
		handlers:  handlers,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	log.Printf("API server starting on port %d", s.port)
	return s.server.ListenAndServe()
}

// Stop stops the HTTP server
func (s *Server) Stop() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	s.server.Shutdown(ctx)
}

// Middleware functions
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start)
		log.Printf("%s %s - %v", r.Method, r.URL.Path, duration)
	})
}

// Helper function to convert int to string
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	
	var digits []byte
	for i > 0 {
		digits = append([]byte{byte('0' + i%10)}, digits...)
		i /= 10
	}
	
	if neg {
		digits = append([]byte{'-'}, digits...)
	}
	
	return string(digits)
}

// JSON response helpers
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
