package com.commerce.recommendations.service;

import com.commerce.recommendations.domain.UserOrder;
import com.commerce.recommendations.domain.UserOrderItem;
import com.commerce.recommendations.dto.RecommendationResponse;
import com.commerce.recommendations.repository.UserOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.springframework.ai.chat.prompt.Prompt;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock
    private ChatClient.Builder chatClientBuilder;
    @Mock
    private ChatClient chatClient;
    @Mock
    private ChatClient.ChatClientRequestSpec requestSpec;
    @Mock
    private ChatClient.CallResponseSpec callSpec;
    @Mock
    private UserOrderRepository userOrderRepository;

    private RecommendationService recommendationService;

    private static final String VALID_JSON = """
            {
              "userId": 1,
              "historyOrdersUsed": 1,
              "insights": "The user likes electronics.",
              "recommendations": [
                {"productName": "Mouse", "category": "Electronics", "reason": "Complements keyboard"},
                {"productName": "Monitor", "category": "Electronics", "reason": "Typical desktop setup"},
                {"productName": "USB Hub", "category": "Electronics", "reason": "Useful with peripherals"},
                {"productName": "Webcam", "category": "Electronics", "reason": "Remote work essential"},
                {"productName": "Headset", "category": "Electronics", "reason": "Communication tool"}
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        when(chatClientBuilder.build()).thenReturn(chatClient);
        when(chatClient.prompt(any(Prompt.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callSpec);

        recommendationService = new RecommendationService(
                chatClientBuilder,
                userOrderRepository,
                new ClassPathResource("prompts/recommendation-prompt.st"),
                10,
                3
        );
    }

    @Test
    void recommend_capsRecommendationsAtMaxConfigured() {
        UserOrder order = buildOrder("Keyboard");
        when(userOrderRepository.findAllByUserIdOrderByOrderedAtDesc(any(), any(Pageable.class)))
                .thenReturn(List.of(order));
        when(callSpec.content()).thenReturn(VALID_JSON);

        RecommendationResponse response = recommendationService.recommend(1L);

        assertThat(response.recommendations()).hasSize(3);
        assertThat(response.historyOrdersUsed()).isEqualTo(1);
    }

    @Test
    void recommend_emptyHistoryStillCallsLlm() {
        when(userOrderRepository.findAllByUserIdOrderByOrderedAtDesc(any(), any(Pageable.class)))
                .thenReturn(List.of());
        when(callSpec.content()).thenReturn(VALID_JSON);

        RecommendationResponse response = recommendationService.recommend(1L);

        assertThat(response.historyOrdersUsed()).isZero();
    }

    @Test
    void recommend_throwsOnUnparseableResponse() {
        when(userOrderRepository.findAllByUserIdOrderByOrderedAtDesc(any(), any(Pageable.class)))
                .thenReturn(List.of());
        when(callSpec.content()).thenReturn("not json at all");

        assertThatThrownBy(() -> recommendationService.recommend(1L))
                .isInstanceOf(RecommendationGenerationException.class);
    }

    private UserOrder buildOrder(String productName) {
        UserOrder order = new UserOrder();
        order.setEventId(UUID.randomUUID());
        order.setUserId(1L);
        order.setTotal(new BigDecimal("49.99"));
        order.setOrderedAt(Instant.now());

        UserOrderItem item = new UserOrderItem();
        item.setProductId(UUID.randomUUID());
        item.setProductName(productName);
        item.setUnitPrice(new BigDecimal("49.99"));
        item.setQuantity(1);
        order.addItem(item);

        return order;
    }
}
