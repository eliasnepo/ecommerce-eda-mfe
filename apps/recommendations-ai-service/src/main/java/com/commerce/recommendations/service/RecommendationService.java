package com.commerce.recommendations.service;

import com.commerce.recommendations.domain.UserOrder;
import com.commerce.recommendations.dto.RecommendationResponse;
import com.commerce.recommendations.dto.RecommendedProduct;
import com.commerce.recommendations.repository.UserOrderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class RecommendationService {

    private final ChatClient.Builder chatClientBuilder;
    private final UserOrderRepository userOrderRepository;
    private final Resource promptResource;
    private final int maxHistoryOrders;
    private final int maxRecommendations;

    public RecommendationService(
            ChatClient.Builder chatClientBuilder,
            UserOrderRepository userOrderRepository,
            @Value("classpath:prompts/recommendation-prompt.st") Resource promptResource,
            @Value("${recommendations.prompt.max-history-orders}") int maxHistoryOrders,
            @Value("${recommendations.prompt.max-recommendations}") int maxRecommendations
    ) {
        this.chatClientBuilder = chatClientBuilder;
        this.userOrderRepository = userOrderRepository;
        this.promptResource = promptResource;
        this.maxHistoryOrders = maxHistoryOrders;
        this.maxRecommendations = maxRecommendations;
    }

    @Transactional(readOnly = true)
    public RecommendationResponse recommend(Long userId) {
        List<UserOrder> history = userOrderRepository.findAllByUserIdOrderByOrderedAtDesc(
                userId, PageRequest.of(0, maxHistoryOrders)
        );

        String orderHistory = history.isEmpty()
                ? "(no previous orders)"
                : formatHistory(history);

        BeanOutputConverter<RecommendationResponse> converter =
                new BeanOutputConverter<>(RecommendationResponse.class);

        PromptTemplate template = new PromptTemplate(promptResource);
        var prompt = template.create(Map.of(
                "userId", userId,
                "orderHistory", orderHistory,
                "maxRecommendations", maxRecommendations,
                "format", converter.getFormat()
        ));

        log.debug("Requesting recommendations for userId={}, historySize={}", userId, history.size());

        String content;
        try {
            content = chatClientBuilder.build()
                    .prompt(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            throw new RecommendationGenerationException(
                    "Ollama call failed for userId=" + userId + ": " + e.getMessage(), e);
        }

        RecommendationResponse raw;
        try {
            raw = converter.convert(content);
        } catch (Exception e) {
            log.error("Failed to parse LLM response for userId={}: {}", userId, content);
            throw new RecommendationGenerationException(
                    "Could not parse recommendation response for userId=" + userId);
        }

        List<RecommendedProduct> capped = raw.recommendations().stream()
                .limit(maxRecommendations)
                .collect(Collectors.toList());

        return new RecommendationResponse(userId, history.size(), raw.insights(), capped);
    }

    private String formatHistory(List<UserOrder> orders) {
        return orders.stream()
                .map(order -> {
                    String items = order.getItems().stream()
                            .map(i -> "  - %s (qty: %d, price: $%.2f)"
                                    .formatted(i.getProductName(), i.getQuantity(), i.getUnitPrice()))
                            .collect(Collectors.joining("\n"));
                    return "Order on %s (total: $%.2f):\n%s"
                            .formatted(order.getOrderedAt(), order.getTotal(), items);
                })
                .collect(Collectors.joining("\n\n"));
    }
}
