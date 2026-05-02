package com.commerce.recommendations.controller;

import com.commerce.recommendations.service.RecommendationGenerationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecommendationGenerationException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public Map<String, Object> handleRecommendationGenerationException(RecommendationGenerationException ex) {
        return Map.of(
                "error", "RECOMMENDATION_FAILED",
                "message", ex.getMessage(),
                "timestamp", Instant.now().toString()
        );
    }
}
