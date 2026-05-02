package com.commerce.recommendations.service;

public class RecommendationGenerationException extends RuntimeException {

    public RecommendationGenerationException(String message) {
        super(message);
    }

    public RecommendationGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
