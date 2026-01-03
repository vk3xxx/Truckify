package database

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// MongoConfig holds MongoDB configuration
type MongoConfig struct {
	URI      string
	Database string
	MaxConns uint64
	MinConns uint64
	Timeout  time.Duration
}

// NewMongoDB creates a new MongoDB connection
func NewMongoDB(config MongoConfig) (*mongo.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), config.Timeout)
	defer cancel()

	clientOptions := options.Client().ApplyURI(config.URI)

	// Set connection pool settings
	if config.MaxConns > 0 {
		clientOptions.SetMaxPoolSize(config.MaxConns)
	} else {
		clientOptions.SetMaxPoolSize(100)
	}

	if config.MinConns > 0 {
		clientOptions.SetMinPoolSize(config.MinConns)
	} else {
		clientOptions.SetMinPoolSize(10)
	}

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping the database to verify connection
	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	return client, nil
}

// CloseMongoDB closes the MongoDB connection
func CloseMongoDB(client *mongo.Client) error {
	if client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return client.Disconnect(ctx)
	}
	return nil
}

// GetDatabase returns a MongoDB database instance
func GetDatabase(client *mongo.Client, dbName string) *mongo.Database {
	return client.Database(dbName)
}

// GetCollection returns a MongoDB collection instance
func GetCollection(client *mongo.Client, dbName, collectionName string) *mongo.Collection {
	return client.Database(dbName).Collection(collectionName)
}
