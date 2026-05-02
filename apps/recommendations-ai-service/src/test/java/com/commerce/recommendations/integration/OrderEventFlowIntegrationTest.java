package com.commerce.recommendations.integration;

import com.commerce.recommendations.dto.RecommendationResponse;
import com.commerce.recommendations.repository.UserOrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.apache.kafka.clients.producer.ProducerConfig.*;
import static org.assertj.core.api.Assertions.assertThat;
import org.springframework.ai.chat.prompt.Prompt;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderEventFlowIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));

    @Container
    static final KafkaContainer kafka =
            new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private UserOrderRepository userOrderRepository;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void orderEvent_persistedAndRecommendationsReturned() throws Exception {
        long userId = 42L;
        String eventJson = buildEventJson(userId);

        publishToKafka(eventJson);
        waitForConsumption(userId);

        ResponseEntity<RecommendationResponse> response = restTemplate.getForEntity(
                "/api/ai/recommendations/" + userId,
                RecommendationResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().historyOrdersUsed()).isEqualTo(1);
        assertThat(response.getBody().recommendations()).isNotEmpty();
    }

    private void publishToKafka(String eventJson) {
        Map<String, Object> producerProps = new HashMap<>();
        producerProps.put(BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        producerProps.put(KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");

        KafkaTemplate<String, String> producer =
                new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(producerProps));
        producer.send("order.created", eventJson);
    }

    private void waitForConsumption(long userId) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 15_000;
        while (System.currentTimeMillis() < deadline) {
            if (userOrderRepository.countByUserId(userId) > 0) return;
            Thread.sleep(500);
        }
        throw new AssertionError("Kafka event was not consumed within 15 seconds");
    }

    private String buildEventJson(long userId) throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "orderId", UUID.randomUUID().toString(),
                "userId", userId,
                "total", "49.99",
                "items", List.of(Map.of(
                        "productId", UUID.randomUUID().toString(),
                        "productName", "Integration Widget",
                        "unitPrice", "49.99",
                        "quantity", 1
                )),
                "createdAt", Instant.now().toString()
        );
        return mapper.writeValueAsString(event);
    }

    @TestConfiguration
    static class ChatClientStub {

        @Bean
        @Primary
        public ChatClient.Builder chatClientBuilder() {
            ChatClient.Builder builder = mock(ChatClient.Builder.class);
            ChatClient client = mock(ChatClient.class);
            ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
            ChatClient.CallResponseSpec callSpec = mock(ChatClient.CallResponseSpec.class);

            when(builder.build()).thenReturn(client);
            when(client.prompt(any(Prompt.class))).thenReturn(requestSpec);
            when(requestSpec.call()).thenReturn(callSpec);
            when(callSpec.content()).thenReturn("""
                    {
                      "userId": 42,
                      "historyOrdersUsed": 1,
                      "insights": "The user bought widgets.",
                      "recommendations": [
                        {"productName": "Gadget A", "category": "Electronics", "reason": "Related to widget"},
                        {"productName": "Gadget B", "category": "Electronics", "reason": "Popular pairing"},
                        {"productName": "Gadget C", "category": "Electronics", "reason": "Frequently bought together"}
                      ]
                    }
                    """);

            return builder;
        }
    }
}
